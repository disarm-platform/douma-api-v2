const ObjectID = require('mongodb').ObjectID
const {can} = require('../../lib/helpers/can')
const {permissions} = require('../../lib/permissions')
const {isSuperset} = require('../../lib/helpers/array_utils')
/**
 * @api {post} /permission Create permission for user
 * @apiName Create permission for user
 * @apiGroup Permission
 *
 * @query{instance_id} the id of the instance whose permissions are being updated
 *
 * @apiParam {string} user_id The id of the user
 * @apiParamExample {json} Request-Example:
 *
 *     [{
 *      user_id:"<mongo_id>"
 *      instance_id: "<mongo_id>"",
 *      value : "read:irs_monitor"
 *     },...]
 */

module.exports = async function create(req, res) {
    const permissions = req.body
        .map(p => ({
            value: p.value,
            user_id: ObjectID(p.user_id),
            instance_id: ObjectID(p.instance_id)
        })) // Converting ids to mongodb objectid types

    const instance_id  = ObjectID(req.query.instance_id)

    const instance = await req.db.collection('instances').findOne({_id:instance_id})

    if(!instance){
        return res.status(400).send('No existing instance');
    }

    const incoming_user_ids = [...new Set(permissions.map(p => p.user_id))]

    const users_from_database = (await req.db.collection('users')
        .find({}, {_id: 1}).toArray())
        .map(u => u._id)

    console.log(users_from_database,incoming_user_ids)

    const valid_users_in_permissions = isSuperset(users_from_database, incoming_user_ids) //Incoming users should exist in database

    if (!valid_users_in_permissions) {
        return res.status(400).send('Some users dont exist');
    }
    try {
        await req.db.collection('permissions').removeMany({instance_id})
        const result = await req.db.collection('permissions').insertMany(permissions);
        res.status(201).send(result)

    }catch (e) {
        res.status(500).send(e.message)
    }
}

