'use strict'
const fs = require('fs')
const path = require('path')
const { DataTypes, Model } = require('sequelize')

/**
 *
 * @param {sequelize.Sequelize} sequelize
 * @returns {sequelize.Model}
 */
module.exports = (sequelize) => {
  class Circuit extends Model {
    // initialize circuits data if empty
    static initialize() {
      Circuit.findAll().then((values) => {
        if (values.length === 0) {
          const filenames = fs.readdirSync(path.join(__dirname, '../artifacts/r1cs'))
          let circuits = filenames.map((filename) => ({ name: filename.split('.')[0] }))
          if (process.env.CIRCUITS_COUNT) {
            circuits = circuits.slice(0, process.env.CIRCUITS_COUNT)
          }
          Circuit.bulkCreate(circuits, { fields: ['name'] })
        }
      })
    }
  }

  Circuit.init(
    {
      name: DataTypes.STRING
    },
    {
      sequelize,
      hooks: {},
      timestamps: false
    }
  )

  return Circuit
}
