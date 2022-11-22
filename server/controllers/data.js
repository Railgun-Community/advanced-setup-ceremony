const router = require('express').Router()
const db = require('../models')
const { isAuthenticated, circuitZKeyPath } = require('../helper')

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
  res.json(contributors)
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

module.exports = router
