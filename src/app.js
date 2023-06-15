const express = require('express')
const helmet = require('helmet')
const http = require('http')
const { databaseConnection } = require('./database')
const server = require('./server')
const { logs } = require('../logger')
const { PORT, APP_NAME, NEW_RELIC_REQUIRED } = require('./config')
require('./common/models')
// Load newRelic in app if enabled
NEW_RELIC_REQUIRED && require('newrelic')
const app = express()

app.set('port', PORT)
app.set('trust proxy', true)
app.disable('etag').disable('x-powered-by')
app.use(helmet())
app.use(express.urlencoded({ extended: false }))
app.use((_, res, next) => {
  res.header('X-XSS-Protection', '1; mode=block')
  res.header('Cache-Control', 'no-store')
  res.header('Pragma', 'no-cache')
  next()
})

app.use(express.json())
app.use(require('express-status-monitor')())
const httpserver = http.createServer(app)
const methodName = '[main]'

databaseConnection().then(() => {
  logs('info', methodName, `Spinning up the ${APP_NAME} app on PORT: ${PORT}`)
  server(app)

  httpserver
    .listen(PORT, () => {
      logs('info', methodName, `${APP_NAME} app is listening to port ${PORT}`)
      console.log(`${APP_NAME} app is listening to port ${PORT}`)
    })
    .on('error', (err) => {
      logs('error', methodName, `Error: ${err.stack || err}`)
      process.exit(1)
    })
})
process.on('uncaughtException', async (err) => {
  logs('error', methodName, `There was an uncaught error: => ${err.message}`)
  process.exit(1)
})

process.on('unhandledRejection', async (reason, p) => {
  logs(
    'error',
    methodName,
    `Unhandled Rejection at: ${JSON.stringify(p)}, reason:, ${
      reason.stack || reason
    }`
  )
  process.exit(1)
})

process.on('SIGINT', () => {
  logs('info', methodName, 'clean up done')
  process.exit(0)
})

process.on('SIGTERM', () => {
  process.exit(0)
})

module.exports = app
