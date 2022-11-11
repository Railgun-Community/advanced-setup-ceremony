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

async function main() {
  await updateAttestations()
  log('done')
}
main()
