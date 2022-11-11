const { Op, DataTypes } = require('sequelize')
const { Contributor, Contribution, Circuit, sequelize } = require('../../models')
const { verifyResponse, circuitZKeyPath, sha256 } = require('../../helper')
const db = require('../../models')

const { log } = console

async function updateAttestations() {
  const contributors = await Contributor.findAll({
    include: [Contribution]
  })
  contributors.forEach(async (c) => {
    if (c.Contributions.length === 54) {
      const transcript = await db.contributorTranscript(c.id)
      const transcriptHash = sha256(JSON.stringify(transcript))
      c.attestation = transcriptHash
      await c.save()
    }
  })
}

async function updateContribution(contribution) {
  const filename = circuitZKeyPath(contribution.Circuit.name, contribution.round)
  const circuit = contribution.Circuit
  const { hash, name } = await verifyResponse({ filename, circuit })
  contribution.hash = hash
  contribution.name = name
  const result = await contribution.save()
  log(result)
  return result
}

async function updateTable() {
  const { queryInterface } = sequelize
  try {
    await queryInterface.addColumn('Contributors', 'url', DataTypes.STRING).catch()
    await queryInterface.addColumn('Contributions', 'hash', DataTypes.STRING).catch()
    await queryInterface.addColumn('Contributions', 'name', DataTypes.STRING).catch()
  } catch (e) {
    if (e.message.includes('duplicate')) {
      log('table already migrated')
      return
    }
    throw e
  }
}

async function updateContributions() {
  const contributions = await Contribution.findAll({
    where: {
      verifiedAt: {
        [Op.ne]: null
      },
      hash: null
    },
    include: [Circuit]
  })
  log(`saving hash for ${contributions.length} contributions`)

  // eslint-disable-next-line no-return-await
  return await Promise.all(
    // eslint-disable-next-line require-await
    contributions.map(async (contribution) => {
      return updateContribution(contribution)
    })
  )
}

async function main() {
  // await updateTable()
  // await updateContributions()
  await updateAttestations()
  log('done')
}
main()
