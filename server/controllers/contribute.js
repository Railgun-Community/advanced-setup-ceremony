/* eslint-disable no-console */
const fs = require('fs').promises
const { existsSync } = require('node:fs')
const path = require('path')
const express = require('express')
const multer = require('multer')

const { Contribution, Contributor, nextContribution, Circuit } = require('../models')
const router = express.Router()
const { circuitZKeyPath, tmpFile, verifyResponse, sha256 } = require('../helper')
const db = require('../models')
const upload = multer({ dest: '/tmp/railgun' })

const { log } = console

function getUserId(req) {
  if (!req) throw new Error('missing req parameter')
  return req.session?.user?.id
}

function isAuthenticated(req, res, next) {
  if (!getUserId(req)) {
    return res.status(401).send('not authenticated')
  }
  next()
}

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
  if (!contributor) {
    res.status(401).send('not authenticated')
  } else {
    let contribution
    try {
      contribution = await nextContribution(contributor)
    } catch (e) {
      if (e.cause === 'busy') {
        log(e.message)
        return res.status(423).send(e.message)
      } else if (e.cause === 'done') {
        return res.status(204).send('done')
      } else {
        log('error getting next contribution', e.toString())
        return res.status(400).send(e.toString())
      }
    }
    const circuit = await contribution.getCircuit()
    log('challenge', circuit.dataValues)

    const challengeZKey = circuitZKeyPath(circuit.name, contribution.round - 1)
    res.sendFile(challengeZKey)
  }
})

router.get('/contributors/:id', async (req, res) => {
  const { id } = req.params
  const contributor = await Contributor.findOne({
    where: { id },
    include: { all: true, nested: true }
  })
  return res.json(contributor)
})

router.get('/contributors', async (req, res) => {
  const contributors = await Contributor.findAll({
    include: [Contribution]
  })
  res.json(contributors)
})

router.get('/download/contributors/:id.json', async (req, res) => {
  const id = req.params.id
  const transcript = await db.contributorTranscript(id)
  res.json(transcript)
})

router.get('/download/circuits/:name.json', async (req, res) => {
  const name = req.params.name
  const circuit = await Circuit.findOne({
    where: { name },
    include: [Contribution]
  })
  res.json(
    circuit.Contributions.map(({ name, hash }) => {
      return { name, hash }
    })
  )
})

router.get('/circuits/:name', async (req, res) => {
  const name = req.params.name
  const circuit = await Circuit.findOne({
    where: { name },
    include: [Contribution]
  })
  return res.json(circuit)
})
router.get('/circuits', async (req, res) => {
  const circuits = await Circuit.findAll({ include: [Contribution] })
  return res.json(circuits)
})

router.get('/contributions/unverified', async (req, res) => {
  const contributions = await Contribution.findAll({
    where: { verifiedAt: null },
    attributes: ['id', 'CircuitId', 'round', 'createdAt']
  })
  return res.json(contributions)
})

router.get('/contributions/me', isAuthenticated, async (req, res) => {
  const contributions = await Contribution.findAll({
    where: { ContributorId: req.session.user.id },
    include: ['Circuit']
  })
  return res.json(contributions)
})

router.get('/contributions/:id/download', async (req, res) => {
  const contribution = await Contribution.findOne({
    where: { id: req.params.id },
    include: [Circuit]
  })
  if (!contribution) {
    return res.status(404).send()
  }
  const filename = circuitZKeyPath(contribution.Circuit.name, contribution.round - 1)
  res.sendFile(filename)
})

router.get('/contributions/:id', async (req, res) => {
  const contribution = await Contribution.findOne({
    where: { id: req.params.id },
    include: [Circuit]
  })
  return res.json(contribution)
})

router.get('/contributions', async (req, res) => {
  const contributions = await Contribution.findAll({ include: ['Contributor'] })
  res.json(contributions)
})

/**
 * be paranoid about attempting to overwrite existing contribution
 * delete the contribution trying to overwrite and indicate Unprocessable
 */
async function onExistingZKey(res, contribution) {
  const { CircuitId, ContributorId, round } = contribution
  const pending = { CircuitId, ContributorId, round }
  console.error('Existing ZKey conflict, removing pending contribution', pending)
  await contribution.destroy()
  return res.status(422).send('Contribution already uploaded')
}

router.post('/response', isAuthenticated, upload.single('response'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Missing response file')
  }

  const contributor = await currentContributor(req.session.user.id)
  const contribution = await db.activeContribution(contributor.id)
  if (!contribution) {
    return res.status(400).send('Invalid contribution')
  }
  const circuit = contribution.Circuit
  if (!circuit) {
    return res.status(400).send('Invalid circuit')
  }

  const zkeypath = circuitZKeyPath(circuit.name, contribution.round)
  if (existsSync(zkeypath)) {
    return onExistingZKey(res, contribution)
  }

  const contributionIndex = contributor.Contributions.length

  /** @type {VerificationResult} */
  let verificationResult
  try {
    console.log(`Started processing contribution ${contributionIndex}`)
    const filename = tmpFile(req.file.filename)
    verificationResult = await verifyResponse({ filename, circuit })
  } catch (e) {
    console.error('Got error verifying', e)
    await fs.unlink(tmpFile(req.file.filename))
    return res.status(422).send(e.toString())
  }

  try {
    if (existsSync(zkeypath)) {
      return onExistingZKey(res, contribution)
    }
    log(
      `Contribution ${contributionIndex} for ${contributor.handle} is correct, uploading to storage`
    )
    // ensure round subdirectory exists
    await fs.mkdir(path.dirname(zkeypath), { recursive: true })
    // copy uploaded contribution response to round subdirectory
    await fs.copyFile(tmpFile(req.file.filename), zkeypath)

    // update contribution with hash, name and indicate completion by setting verifiedAt
    contribution.verifiedAt = new Date()
    contribution.hash = verificationResult.hash
    contribution.name = verificationResult.name

    // prepare transcript of all of the user's contributions and save sha256 hash for attestation
    if (contributionIndex === Number(process.env.CIRCUITS_COUNT)) {
      const transcript = await db.contributorTranscript(contributor.id)
      const transcriptHash = sha256(JSON.stringify(transcript))
      contributor.attestation = transcriptHash
      await contributor.save()
    }

    await contribution.save()

    log('Contribution finished.')
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
    await fs.unlink(tmpFile(req.file.filename))
  }
})

router.post('/authorize_contribution', async (req, res) => {
  if (!req.body || !req.body.name || !req.body.token) {
    res.status(404).send('Invalid request params')
  }

  const contribution = await Contribution.findOne({ where: { token: req.body.token } })
  if (!contribution) {
    res.status(404).send('There is no such contribution')
    return
  }

  if (contribution.dataValues.socialType !== 'anonymous') {
    res.status(404).send('Your contribution is already identified.')
    return
  }

  if (!req.session.socialType || req.session.socialType === 'anonymous') {
    res.status(403).send('Access forbidden')
    return
  }

  try {
    await Contribution.update(
      {
        name: req.body.name,
        company: req.body.company,
        handle: req.session.user.handle,
        socialType: req.session.user.socialType
      },
      { where: { id: contribution.dataValues.id }, individualHooks: true }
    )
    res.send('OK')
  } catch (e) {
    console.error('updateError', e)
    res.status(404).send('Update error')
  }
})

router.post('/get_contribution_index', async (req, res) => {
  if (!req.body || !req.body.token) {
    res.status(404).send('Wrong request params')
  }

  const contribution = await Contribution.findOne({
    where: { token: req.body.token }
  })
  if (!contribution) {
    res.status(404).send('There is no such contribution')
    return
  }

  if (contribution.dataValues.socialType !== 'anonymous') {
    res.status(404).send('The contribution is already authorized')
    return
  }

  return res.json({ id: contribution.dataValues.id }).send()
})

module.exports = router
