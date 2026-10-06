const express = require("express")
const cors = require("cors")
const app = express()

app.use(express.json())
const adminRouter = require("./admin")
const quizRouter = require("./quiz")


function startApi(client ) {
    app.use('/admin', adminRouter(client))
    app.use('/quiz', quizRouter(client))
    app.listen(process.env.PORT, process.env.IP, () => {
        console.log(`api listening on ${process.env.IP}:${process.env.PORT}!`)
    })
}
module.exports = startApi