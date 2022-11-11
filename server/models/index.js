// const fs = require('fs')
const path = require('path')
const { Sequelize, Op } = require('sequelize')
// const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'development'
const config = require(path.join(__dirname, '/../dbConfig.js'))[env]
const db = {}

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

db.activeContribution = async function(ContributorId) {
  const activeContribution = await db.Contribution.findOne({
    where: { ContributorId, verifiedAt: null }
  })
  return activeContribution
}

/**
 * @returns {db.Contribution|undefined}
 */
db.nextContribution = async function(contributor) {
  // if contributor has unverified contribution, return it
  const activeContribution = await db.activeContribution(contributor.id)
  if (activeContribution) {
    log('returning unverified contribution')
    return activeContribution
  }
  // don't include active contributions or those already completed by contributor
  const invalidCircuits = await db.Contribution.contributorInvalidCircuits(contributor.id)

  const nextCircuit = await db.Circuit.findOne({
    where: { id: { [Op.notIn]: [...invalidCircuits] } }
  })
  // if no circuit was found, the contributor has contributed to all
  if (!nextCircuit) {
    return undefined
  }

  // const lastRound = (await db.Contribution.max('round', { where: { CircuitId: nextCircuit.id } })) ?? 0
  const lastRound = await db.Contribution.lastRound(nextCircuit.id)
  const nextContribution = await db.Contribution.create({
    ContributorId: contributor.id,
    CircuitId: nextCircuit.id,
    round: lastRound + 1
  })
  log('nextContribution', nextContribution.dataValues)
  return nextContribution
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
