const MongoClient = require('mongodb').MongoClient
const bcrypt = require('bcryptjs')

// Need a SECRET for a bit of extra safety
if (!process.env.SECRET) {
    console.log(
        '\nERROR: Missing `SECRET`.\nNeed to set SECRET as an environment variable.\nSomething like `set -x SECRET "mysecret"`\n'
    )
    process.exit()
}

// Need a DB or no point trying to boot the app
if (!process.env.MONGODB_URI) {
    console.log(
        '\nERROR: Missing `MONGODB_URI`.\nNeed to set MONGODB_URI as an environment variable.\nSomething like `set -x MONGODB_URI "mongodb://douma-api:[secret]@mongodb.disarm.io/irs_record"`\n'
    )
    process.exit()
}

// Need at least one source of users CSV
if (!process.env.SHEETS_URL && !process.env.SHEETS_PATH) {
    console.log(
        '\nERROR: Missing `SHEETS_URL (or SHEETS_PATH)`.\nNeed to set SHEETS_URL as an environment variable.\nSomething like `set -x SHEETS_URL "https://docs.google.com/spreadsheets/d/...."`\n'
    )
    process.exit()
}

MongoClient.connect(process.env.MONGODB_URI)
    .then(async db => {
        try {
            await db.collection('records').ensureIndex({ 'id': 1 }, { unique: true, background: true })
            console.log(`[DOUMA API] Connected to MongoDB on ${process.env.MONGODB_URI}`)
        } catch (error) {
            console.log('[DOUMA API] MongoDB failed in ensureIndex', e)
        }

        //Initialize depwloyment user
        if (process.env.DEPLOYMENT_USER && process.env.DEPLOYMENT_PASSWORD) {
            let user = await db.collection('users').findOne({});
            if (!user) {
                const encrypted_password = await bcrypt.hash(process.env.DEPLOYMENT_PASSWORD, 10)
                let deployment_user = await db.collection('users').insertOne({
                    username: process.env.DEPLOYMENT_USER,
                    name: 'Admin',
                    encrypted_password,
                    deployment_admin: true
                })
            }
        }

        try {
            launch()
        } catch (e) {
            console.log('[DOUMA API] Failure to launch');
            throw e
        }
    })


function launch() {
    const api = require('./api').api

    const port = process.env.PORT || 3000

    api.listen(port, () => {
        console.log('[DOUMA API] Listening on port ' + port)
    })
}