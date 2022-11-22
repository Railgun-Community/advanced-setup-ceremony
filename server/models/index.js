const path = require('path')
const { Sequelize, Op } = require('sequelize')
const { BusyError, CompleteError } = require('../helper')

const env = process.env.NODE_ENV || 'development'
const config = require(path.join(__dirname, '/../dbConfig.js'))[env]
const db = {}
const { sha256 } = require('../helper')

/** @type {Sequelize.Sequelize} */
let sequelize

const { log } = console

if (env === 'development') {
  sequelize = new Sequelize(config)
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config)
}

db.Circuit = require('./circuit')(sequelize)
db.Contributor = require('./contributor')(sequelize)
db.Contribution = require('./contribution')(sequelize)

db.Contributor.hasMany(db.Contribution)
db.Contribution.belongsTo(db.Contributor)
db.Contribution.belongsTo(db.Circuit)

db.Circuit.hasMany(db.Contribution)

// limits Contributions to most recent verified
db.Circuit.addScope('lastContribution', {
  include: { model: db.Contribution.scope('latest') }
})

// contributors with verified contributions
db.Contributor.addScope('participating', {
  attributes: {
    exclude: ['sessionID', 'company', 'token']
  },
  include: { model: db.Contribution.scope('verified') }
})

db.activeContribution = async function(ContributorId) {
  const activeContribution = await db.Contribution.findOne({
    where: { ContributorId, verifiedAt: null },
    include: [db.Circuit]
  })
  return activeContribution
}

/**
 * @returns {db.Contribution|undefined}
 */
const nextContribution = async function(contributor) {
  // if contributor has unverified contribution, return it
  const activeContribution = await db.activeContribution(contributor.id)
  if (activeContribution) {
    log('returning unverified contribution')
    return activeContribution
  }
  // don't include active contributions or those already completed by contributor
  const completedCircuits = await db.Contribution.findAll({
    where: { ContributorId: contributor.id, verifiedAt: null },
    attributes: ['CircuitId']
  })
  const CIRCUITS_COUNT = Number(process.env.CIRCUITS_COUNT)

  const remainingCircuits = CIRCUITS_COUNT - completedCircuits.length

  if (remainingCircuits <= 0) {
    throw new CompleteError()
  }

  const invalidCircuits = await db.Contribution.contributorInvalidCircuits(contributor.id)

  const nextCircuit = await db.Circuit.findOne({
    where: { id: { [Op.notIn]: [...invalidCircuits] } }
  })
  // if no circuit was found, the contributor has contributed to all
  if (!nextCircuit) {
    throw new BusyError('All remaining Circuits are locked')
  }

  const lastRound = await db.Contribution.lastRound(nextCircuit.id)
  const nextContribution = await db.Contribution.create({
    ContributorId: contributor.id,
    CircuitId: nextCircuit.id,
    round: lastRound + 1
  })
  log('nextContribution', nextContribution.dataValues)
  return nextContribution
}
db.nextContribution = nextContribution

db.ensureTranscriptHash = async function(contributor) {
  if (contributor.attestation) {
    return contributor.attestation
  }
  const transcript = await db.contributorTranscript(contributor.id)
  const transcriptHash = sha256(JSON.stringify(transcript))
  contributor.attestation = transcriptHash
  await contributor.save()
  return transcriptHash
}

db.contributorTranscript = async function(id) {
  const contributions = await db.Contribution.findAll({
    where: { ContributorId: id },
    include: [db.Circuit],
    order: [['CircuitId', 'ASC']]
  })
  const result = {}
  contributions.forEach((contribution) => {
    const circuitName = contribution.Circuit.name
    result[circuitName] = {
      name: contribution.name,
      hash: contribution.hash
    }
  })
  return result
}

db.sequelize = sequelize
db.Sequelize = Sequelize
module.exports = db
