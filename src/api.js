const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const Raven = require('raven')
const compression = require('compression')
const expressMongoDb = require('express-mongo-db')
const application_server = require('./application-registry')

// Logging
const morgan = require('morgan')
const path = require('path')
const accessLogStream = fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), {flags: 'a'})

const API_VERSIONS = ['v3', 'v4', 'v5', 'v6', 'v7']

if (process.env.NODE_ENV === 'production') {
    Raven.config('https://ed8917e61540404da408a2a9efba0002:d99248fd72c140398999c7302e1da94b@sentry.io/138843', {
        release: process.env.SOURCE_VERSION || 'DEV'
    }).install()
}

// Create application
const app = express()

// Configure middleware
if (process.env.NODE_ENV === 'production') {
    app.use(Raven.requestHandler())
}


app.use(cors({
    exposedHeaders: ['Content-Length']
}))
app.use(compression())
app.use(morgan('combined', {stream: accessLogStream}))

app.use(expressMongoDb(process.env.MONGODB_URI))

app.use(
    bodyParser.json({
        limit: '500mb'
    })
)

// Ping route
app.get('/', (req, res) => {
    res.send({
        DOUMA_API: process.env.SOURCE_VERSION || 'DEV',
        route: 'root'
    })
})

// Add version-specific routes
API_VERSIONS.map(v => {
    const version_routes = require(`./${v}/index`)
    return version_routes(app, v)
})

// CORS config
// TODO: @refac Do we need this as well as the `cors` package?
app.options('/*', function (req, res) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Content-Length, X-Requested-With'
    )
    res.send(200)
})
// TODO: @refac Might be able to replace above with this:
// app.options('*', cors())

if (process.env.NODE_ENV === 'production') {
    app.use(Raven.errorHandler())
}

application_server.attach_waterline_to_express(app);

module.exports = {
    app
}
