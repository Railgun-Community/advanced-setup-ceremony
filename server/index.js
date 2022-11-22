require('../lib/globalShim.js')
const path = require('path')
const { NODE_ENV } = process.env
require('dotenv').config({ path: path.join(__dirname, `../.env.${NODE_ENV}`) })
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const morgan = require('morgan')
const { loadNuxt, build } = require('nuxt')
const sessionsController = require('./controllers/authorize')
const contributionController = require('./controllers/contribute')
const dataController = require('./controllers/data')
const models = require('./models')
// const attestationWatcher = require('./attestationWatcher')
const { log } = console

const isDev = process.env.NODE_ENV !== 'production'
const PORT = process.env.PORT || 3000

const circuitsCount = Number(process.env.CIRCUITS_COUNT)
if (!circuitsCount) {
  throw new Error('Please set env.CIRCUITS_COUNT')
}

const app = express()
app.use(
  morgan('dev', {
    skip: (req, res) => {
      return !req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/api/stats')
    }
  })
)

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(
  '/api', // only use session on api routes
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: new SequelizeStore({ db: models.sequelize })
  })
)
app.use('/api', sessionsController)
app.use('/api', contributionController)
app.use('/api', dataController)

async function start() {
  await models.sequelize.sync()
  await models.Circuit.initialize()

  const nuxt = await loadNuxt(isDev ? 'dev' : 'start')
  // Give nuxt middleware to express
  app.use(nuxt.render)

  if (isDev) {
    build(nuxt)
  }

  app.listen(PORT, '0.0.0.0', () => {
    log(`Server is running on port ${PORT}.`)
  })

  // attestationWatcher()
  // console.log('attestationWatcher started')
}
start()
