const express = require('express');
const {getQuizList, createQuiz, getQuiz} = require("../utils/database");


module.exports = function (client) {
    const router = express.Router()

    router.get('/', async (req, res) => {
        let quizList = await getQuizList()
        return res.status(200).send(quizList)
    })

    router.post('/', async (req, res) => {
        let quiz = {
            name: req.body.name
        }
        quiz = await createQuiz(quiz)
        return res.status(201).send(quiz)
    })
    router.get('/:id', async (req, res) => {
        let quiz = await getQuiz(req.params.id)
        return res.status(200).send(quiz)
    })


    return router
}
