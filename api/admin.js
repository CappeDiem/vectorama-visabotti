const express = require('express');


module.exports = function (client) {
    const router = express.Router()

    router.get('/', async (req, res) => {
        return res.status(200).send({user: client.user})
    })

    return router
}
