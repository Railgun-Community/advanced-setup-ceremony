const { Contributor } = require('../../models')

const { log } = console

const urls = {
  twitter: 'https://twitter.com/',
  github: 'https://github.com/'
}

async function updateFields() {
  const contributors = await Contributor.findAll({})
  contributors.forEach(async (c) => {
    const { handle } = c
    if (!c.name) {
      c.name = handle
    }
    if (!c.url) {
      c.url = urls[c.socialType] + handle
    }
    await c.save()
  })
}

async function main() {
  await updateFields()
  log('done')
}
main()
