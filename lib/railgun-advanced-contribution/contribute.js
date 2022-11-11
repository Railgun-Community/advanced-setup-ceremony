
/**
 * @typedef {import('snarkjs').MPCParams} MPCParams
 */

/**
 * This function is called on the front-end side for each circuit contribution
 * @param {object} zKey
 * @param {Buffer} prevContribution previous contribution
 * @param {string} contributorName
 * @param {string} entropy
 * @returns {uint8array, buffer}
 */
async function contribute(zKey, prevContribution, contributorName, entropy) {
  const nextContribution = {type: "mem"};
  const contributionHash = await zKey.contribute(prevContribution,
    nextContribution, contributorName, entropy);
  return {contribution: nextContribution.data, hash: contributionHash}
}

const formatHash = (hash) => {
  const hex = Buffer.from(hash).toString('hex').padStart(128, 0)
  return `0x${hex}`
}

/**
 * @typedef {object} VerificationResult
 * @property {string} name
 * @property {string} hash
 */

/**
 * @param {MPCParams} mpcParams
 * @returns {VerificationResult}
 */
function getLastContribution(mpcParams) {
  const { contributions } = mpcParams
  if (!Array.isArray(contributions)) {
    throw new Error("Expected contributions to be an array. Verify that snarkjs was patched.")
  }
  const lastContribution = contributions[contributions.length - 1]

  return {
    name: lastContribution.name,
    hash: formatHash(lastContribution.contributionHash)
  }
}

/**
 *
 * @param {string} r1csPath path of the circuit's r1cs file
 * @param {string} ptauPath path of powers of tau file
 * @param {string | Buffer} contribution
 * @param {object} logger
 * @returns {VerificationResult}
 */
async function verify(zKey, r1csPath,  ptauPath, contribution, logger) {
  const mpcParams = await zKey.verifyFromR1cs(r1csPath, ptauPath, contribution, logger);
  return getLastContribution(mpcParams)
}

module.exports = {
  contribute,
  verify,
  getLastContribution,
  formatHash
};
