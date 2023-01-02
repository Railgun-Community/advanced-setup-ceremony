const fs = require('fs')
const process = require('process')
const path = require('path')
const router = require('express').Router()
const archiver = require('archiver')
const db = require('../models')
const { isAuthenticated, circuitZKeyPath } = require('../helper')

const { log } = console

router.get('/download/circuits/final.zip', async (req, res) => {
  const archivePath = path.join(process.cwd(), '/final.zip')

  if (!fs.existsSync(archivePath)) {
    const output = await archiveArtifacts(archivePath)
    output.on('close', function() {
      res.download(archivePath)
    })
  } else {
    res.download(archivePath)
  }
})

router.get('/stats', async (req, res) => {
  const contributors = await db.Contributor.scope('participating').findAll()
  const circuits = await db.Circuit.count()
  const contributions = await db.Contribution.scope('verified').count()
  const active = await db.Contribution.scope('unverified').count()
  const stats = { contributors: contributors.length, circuits, contributions, active }
  return res.json(stats)
})

router.get('/contributors/:id', async (req, res) => {
  const { id } = req.params
  const contributor = await db.Contributor.findOne({
    where: { id },
    include: { all: true, nested: true }
  })
  return res.json(contributor)
})

router.get('/contributors', async (req, res) => {
  const contributors = await db.Contributor.scope('participating').findAll()
  res.json(contributors.map((c) => c.dataValues))
})

router.get('/download/contributors.zip', async (req, res) => {
  const contributorsPath = path.join(process.cwd(), 'contributors')
  log(contributorsPath)
  if (!fs.existsSync(contributorsPath)) {
    fs.mkdirSync(contributorsPath)
    const contributors = await db.Contributor.scope('participating').findAll()
    for (const c of contributors) {
      const filename = path.join(contributorsPath, `${c.id}-${c.name}.json`)
      const transcript = await db.contributorTranscript(c.id)
      fs.writeFileSync(filename, JSON.stringify(transcript))
    }
  }
  const output = await archiveContributors(contributorsPath)
  output.on('close', () => {
    res.download(contributorsPath + '.zip')
  })
})

router.get('/download/contributors/:id.json', async (req, res) => {
  const id = req.params.id
  const transcript = await db.contributorTranscript(id)
  res.json(transcript)
})

router.get('/download/circuits/:name.json', async (req, res) => {
  const name = req.params.name
  const circuit = await db.Circuit.findOne({
    where: { name },
    include: [db.Contribution]
  })
  res.json(
    circuit.Contributions.map(({ name, hash }) => {
      return { name, hash }
    })
  )
})

router.get('/circuits/:name', async (req, res) => {
  const name = req.params.name
  const circuit = await db.Circuit.findOne({
    where: { name },
    include: [db.Contribution]
  })
  return res.json(circuit)
})

router.get('/circuits', async (req, res) => {
  const circuits = await db.Circuit.scope('lastContribution').findAll()
  return res.json(circuits)
})

router.get('/contributions/me', isAuthenticated, async (req, res) => {
  const contributions = await db.Contribution.findAll({
    where: { ContributorId: req.session.user.id },
    include: ['Circuit']
  })
  return res.json(contributions)
})

router.get('/contributions/:id/download', async (req, res) => {
  const contribution = await db.Contribution.findOne({
    where: { id: req.params.id },
    include: [db.Circuit]
  })
  if (!contribution) {
    return res.status(404).send()
  }
  const filename = circuitZKeyPath(contribution.Circuit.name, contribution.round - 1)
  res.sendFile(filename)
})

router.get('/contributions/:id', async (req, res) => {
  const contribution = await db.Contribution.findOne({
    where: { id: req.params.id },
    include: [db.Circuit]
  })
  return res.json(contribution)
})

router.get('/contributions', async (req, res) => {
  const contributions = await db.Contribution.scope('verified').findAll()
  res.json(contributions)
})

async function archiveContributors(archivePath) {
  const output = fs.createWriteStream(archivePath + '.zip')
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.directory(archivePath, 'contributors')
  archive.pipe(output)
  await archive.finalize()
  return output
}

async function archiveArtifacts(archivePath) {
  const circuits = await db.Circuit.scope('lastContribution').findAll()
  const output = fs.createWriteStream(archivePath)
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.append(null, { name: 'zkeys/' })
  for (const c of circuits) {
    archive.file(circuitZKeyPath(c.name, c.Contributions[0].round), {
      name: `zkeys/${c.name}.zkey`
    })
  }
  archive.pipe(output)
  await archive.finalize()
  return output
}

module.exports = router
