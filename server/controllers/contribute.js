/* eslint-disable no-console */
const fs = require('fs').promises
const { existsSync } = require('node:fs')
const path = require('path')
const express = require('express')
const multer = require('multer')
const router = express.Router()

const {
  Contribution,
  Contributor,
  nextContribution,
  activeContribution,
  ensureTranscriptHash
} = require('../models')
const {
  circuitZKeyPath,
  tmpFile,
  verifyResponse,
  isAuthenticated,
  BusyError,
  CompleteError
} = require('../helper')
const upload = multer({ dest: '/tmp/railgun' })
const CIRCUITS_COUNT = Number(process.env.CIRCUITS_COUNT)
const { log } = console

async function currentContributor(id) {
  const contributor = await Contributor.findOne({
    where: { id },
    include: [Contribution]
  })
  return contributor
}

router.get('/challenge', isAuthenticated, async (req, res) => {
  // clear contributions that were started but not finished
  await Contribution.purgeStaleContributions()

  const contributor = await currentContributor(req.session.user.id)
  try {
    const contribution = await nextContribution(contributor)
    const circuit = await contribution.getCircuit()
    log('challenge', circuit.dataValues)

    const challengeZKey = circuitZKeyPath(circuit.name, contribution.round - 1)
    res.sendFile(challengeZKey)
  } catch (e) {
    console.warn('Error getting nextContribution:', e)
    if (e instanceof BusyError) {
      log(e.message)
      return res.status(423).send('busy')
    } else if (e instanceof CompleteError) {
      const transcriptHash = await ensureTranscriptHash(contributor)
      console.log(`Ceremony completed by ${contributor.url}: ${transcriptHash}`)
      return res.status(204).json({
        transcriptHash
      })
    } else {
      log('error getting next contribution', e.toString())
      return res.status(400).send(e.toString())
    }
  }
})

/**
 * be paranoid about attempting to overwrite existing contribution
 * delete the contribution trying to overwrite and indicate Unprocessable
 */
function onExistingZKey(res, contribution) {
  const filename = circuitZKeyPath(contribution.Circuit.name, contribution.round)
  console.error(`zkey already exists: ${filename}`, contribution.toJSON())
  return res.status(422).send('Contribution already uploaded')
}

router.post('/response', isAuthenticated, upload.single('response'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Missing response file')
  }
  const filename = tmpFile(req.file.filename)

  const contributor = await currentContributor(req.session.user.id)
  const completed = contributor.Contributions.filter((c) => c.hash)
  const contributionIndex = completed.length + 1

  if (contributor.attestation) {
    return res.status(204).json({
      transcriptHash: contributor.attestation
    })
  }
  const contribution = await activeContribution(contributor.id)
  if (!contribution || contribution.hash) {
    return res.status(400).send('Invalid contribution')
  }
  const circuit = contribution.Circuit

  const zkeypath = circuitZKeyPath(circuit.name, contribution.round)
  // if zkey aalready exists for this round, the last contribution was not recorded in the db
  // as we will not overwrite, return early and report the error
  if (existsSync(zkeypath)) {
    return onExistingZKey(res, contribution)
  }

  // touch updatedAt to prevent deletion of contribution while it's being verified
  // stale contribution locks are checked and purged in `challenge`
  try {
    contribution.changed('updatedAt', true)
    await contribution.update({
      updatedAt: new Date()
    })
  } catch (e) {
    console.error('Error updating contribution lock pre-verification')
    await fs.unlink(filename)
    return res.status(400)
  }

  /** @type {VerificationResult} */
  let verificationResult
  try {
    console.log(`Started processing contribution ${contributionIndex}`, contribution.toJSON())
    verificationResult = await verifyResponse({ filename, circuit })
  } catch (e) {
    console.error('Got error verifying', e)
    await fs.unlink(filename)
    return res.status(422).send(e.toString())
  }

  try {
    if (existsSync(zkeypath)) {
      console.warn(`verified, but zkey exists for ${circuit.name}.${contribution.round}`)
      return onExistingZKey(res, contribution)
    }
    log(
      `Contribution ${contributionIndex} for ${contributor.handle} is correct, uploading to storage`
    )
    // ensure round subdirectory exists
    await fs.mkdir(path.dirname(zkeypath), { recursive: true })
    // copy uploaded contribution response to round subdirectory
    await fs.copyFile(filename, zkeypath)

    // update contribution with hash, name and indicate completion by setting verifiedAt
    await contribution.update({
      verifiedAt: new Date(),
      hash: verificationResult.hash,
      name: verificationResult.name
    })
    log(`Contribution ${contribution.id} finished.`)

    // prepare transcript of all of the user's contributions and save sha256 hash for attestation
    if (contributionIndex === CIRCUITS_COUNT) {
      contributor.attestation = await ensureTranscriptHash(contributor)
      console.log(`Ceremony completed by ${contributor.url}: ${contributor.attestation}`)
    }

    res.json({
      contribution: contribution.dataValues,
      circuit: circuit.dataValues,
      contributionIndex,
      transcriptHash: contributor.attestation
    })
  } catch (e) {
    console.error('Got error during save', e)
    res.status(503).send(e.toString())
  } finally {
    await fs.unlink(filename)
  }
})

module.exports = router
