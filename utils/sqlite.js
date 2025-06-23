const sqlite3 = require('sqlite3')

let db = new sqlite3.Database("database.db", sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
	if (err) { console.log(err.message) }
    console.log('verbose',"Connected to the database.")
})

function init() {
    db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS "running" ("quizId" TEXT NOT NULL, "starttime" DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY("quizId"))')
        db.run('CREATE TABLE IF NOT EXISTS "results" ("quizId" TEXT NOT NULL, "userId" VARCHAR(22) NOT NULL, "points" INT NOT NULL)')
    })
}

/**
 * get running quizzes
 *  * @param {string} quizId - quiz id
 */
async function getRunning(quizId) {
    return new Promise( (resolve, reject) => {
        db.all("SELECT * FROM running", (err, rows) => {
            if (err) { console.log(err.message) }
            if (rows) {
                resolve(rows)
            } else {
                reject(null)
            }
        })
    })
}

/**
 * mark a quiz running
 * @param {string} quizId - quiz id to mark running
 */
async function addRunning(quizId) {
    return new Promise( (resolve, reject) => {
        db.all("insert into running(quizId) values (?)", [quizId.toString()], (err) => {
            if (err) { console.log(err.message) }
        })
    })
}

/**
 * Remove quiz from running
 * @param {number} quizId - quizId
 */
async function removeRunning(quizId) {
    return new Promise( (resolve, reject) => {
        db.all("DELETE FROM running WHERE quizId = ?", [quizId.toString()], (err) => {
            if (err) { console.log(err.message) }
        })
    })
}

/**
 * add Result for quiz from user
 * @param {string} quizId - quiz id
 * @param {number} userId - The discord id of the user
 * @param {number} points - Point amount to award to user
 */
async function addResult(quizId, userId, points) {
    return new Promise( (resolve, reject) => {
        db.all("insert into results(quizId, userId, points) values (?, ?, ?)", [quizId.toString(), userId.toString(), points], (err) => {
            if (err) { console.log(err.message) }
        })
    })
}

/**
 * Get All results
 */
async function getResultAll(quizId, userId, points) {
    return new Promise( (resolve, reject) => {
        db.all("SELECT * FROM results", (err, rows) => {
            if (err) { console.log(err.message) }
            if (rows) {
                resolve(rows)
            } else {
                reject(null)
            }
        })
    })
}

module.exports = {
    info: {
        name:"sqlite",
    },
    init,
    getRunning,
    addRunning,
    removeRunning,
    addResult,
    getResultAll
}