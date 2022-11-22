'use strict'

const { DataTypes, Model, Op } = require('sequelize')
const { log } = console

function isValidName(value, minLength = 4) {
  // const regExpression = new RegExp(`^[0-9a-zA-Z\-\\x20/:.]{${minLength},35}$`)
  // return regExpression.test(value)
  // should be safe because data coming directly from twitter/github
  return true
}

const validate = (contribution, options) => {
  const { name, company, socialType } = contribution.dataValues
  if (socialType !== 'anonymous' && !isValidName(name)) {
    throw new Error('Invalid user name')
  }
  if (company && !isValidName(company, 0)) {
    throw new Error('Invalid company name')
  }
}

const STALE = 90
/**
 * @param {sequelize.Sequelize} sequelize
 * @returns {sequelize.Model}
 */
module.exports = (sequelize) => {
  class Contribution extends Model {
    /**
     * delete contributions that haven't been finalized for STALE seconds
     */
    static async purgeStaleContributions() {
      const bestBefore = new Date(new Date().getTime() - STALE * 1000)
      const destroyed = await Contribution.destroy({
        where: {
          verifiedAt: null,
          createdAt: { [Op.lte]: bestBefore }
        }
      })
      log(`purged ${destroyed} stale contributions`)
    }

    static async contributorInvalidCircuits(ContributorId) {
      const invalidCircuits = await Contribution.findAll({
        where: {
          [Op.or]: [{ verifiedAt: null }, { ContributorId }]
        },
        attributes: ['CircuitId'],
        group: ['CircuitId']
      })
      return invalidCircuits.map((c) => c.CircuitId)
    }

    static async nextContributionIndex() {
      const rowsCount = await Contribution.count()
      return rowsCount + 1
    }
    static async lastRound(CircuitId) {
      const lastRound = await Contribution.max('round', { where: { CircuitId } })
      return lastRound ?? 0
    }
  }

  const exclude = ['token', 'attestation', 'createdAt', 'updatedAt']

  Contribution.init(
    {
      // CircuitId
      // ContributorId
      round: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      hash: DataTypes.STRING,
      name: DataTypes.STRING,
      token: DataTypes.STRING, // unused
      attestation: DataTypes.STRING, // unused
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      scopes: {
        latest: {
          where: { verifiedAt: { [Op.ne]: null } },
          attributes: { exclude },
          order: [['round', 'DESC']],
          limit: 1
        },
        verified: { where: { verifiedAt: { [Op.ne]: null } }, attributes: { exclude } },
        unverified: { where: { verifiedAt: null }, attributes: { exclude } }
      },
      sequelize,
      hooks: {
        beforeCreate: validate,
        beforeUpdate: validate
      }
    }
  )
  return Contribution
}
