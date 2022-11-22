const path = require('path')
const serverRootPath = path.join(__dirname, './')
const { createHash } = require('crypto')
const blake2 = require('blake2')
const { zKey } = require('snarkjs')
const { verify } = require('../lib/railgun-advanced-contribution/contribute')

const { log } = console

const ptauPath = path.join(serverRootPath, './artifacts/pot20.ptau')

const tmpFile = (filename) => `/tmp/railgun/${filename}`

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

function circuitR1csPath(circuitName) {
  return path.join(serverRootPath, `./artifacts/r1cs/${circuitName}.r1cs`)
}

function circuitZKeyPath(circuitName, roundNumber) {
  const round = roundNumber.toString().padStart(2, '0')
  const zkey = `./artifacts/contribution/${round}/${circuitName}.${round}.zkey`
  // return zkey path
  return path.join(serverRootPath, zkey)
}

/**
 * @typedef {import('../../lib/railgun-advanced-contribution/contribute').VerificationResult} VerificationResult
 */

/**
 * @typedef {object} VerifyResponse
 * @property {string} filename
 * @property {Circuit} circuit
 *
 * @param {VerifyResponse} response
 * @returns {VerificationResult}
 */
async function verifyResponse(response) {
  const { filename, circuit } = response
  log('Running verifier')
  const r1csPath = circuitR1csPath(circuit.name)
  const result = await verify(zKey, r1csPath, ptauPath, filename)
  if (!result) {
    throw new Error('Unverified response')
  }
  return result
}

/**
 * @param {string} message
 * @returns {string} blake2 hash
 */
function blake2Hash(message) {
  const h = blake2.createHash('blake2b')
  h.update(Buffer.from(message))
  const hash = h.digest('hex')
  return hash
}

/**
 * @param {string} message
 * @returns {string} sha256 hash
 */
function sha256(message) {
  return createHash('sha256')
    .update(message)
    .digest('hex')
}

class BusyError extends Error {}
class CompleteError extends Error {}

module.exports = {
  serverRootPath,
  getUserId,
  isAuthenticated,
  circuitR1csPath,
  circuitZKeyPath,
  verifyResponse,
  tmpFile,
  sha256,
  blake2Hash,
  BusyError,
  CompleteError
}
