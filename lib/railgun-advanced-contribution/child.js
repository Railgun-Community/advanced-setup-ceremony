const { zKey } = require("snarkjs")

process.on('message', async function(message) {
  const { data, id } = message
  const { r1csPath, ptauPath, contribution, logger } = data
  console.log('child starting', data)
  const mpcParams = await zKey.verifyFromR1cs(r1csPath, ptauPath, contribution, logger)
  console.log('child done')
  return { id, data: mpcParams }
})