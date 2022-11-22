'use strict'
const { DataTypes, Model, Op } = require('sequelize')

function isValidName(value, minLength = 4) {
  // const regExpression = new RegExp(`^[0-9a-zA-Z\-\\x20]{${minLength},35}$`)
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

/**
 *
 * @param {sequelize.Sequelize} sequelize
 * @returns {sequelize.Model}
 */
module.exports = (sequelize) => {
  class Contributor extends Model {}

  Contributor.init(
    {
      token: DataTypes.STRING,
      name: DataTypes.STRING,
      company: DataTypes.STRING,
      url: DataTypes.STRING,
      handle: DataTypes.STRING,
      socialType: DataTypes.STRING,
      attestation: DataTypes.STRING,
      sessionID: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      sequelize,
      defaultScope: {
        attributes: {
          exclude: ['sessionID', 'company', 'token']
        },
        order: [['id', 'DESC']]
      },
      scopes: {
        withSessionID: {
          attributes: {
            include: ['sessionID']
          }
        },
        completedContributions: {
          include: [{ model: 'Contributions', where: { hash: { [Op.ne]: null } } }]
        }
      },
      hooks: {
        beforeCreate: validate,
        beforeUpdate: validate
      }
    }
  )

  return Contributor
}
