const { PrismaClient } = require('../generated/prisma'); // Points to your folder
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Get running quizzes
 */
async function getRunning() {
    // Prisma returns an array automatically, no need for new Promise wrappers
    return prisma.running.findMany();
}

/**
 * Mark a quiz running
 */
async function addRunning(quizId) {
    return prisma.running.upsert({
        where: { quizId: quizId.toString() },
        update: { starttime: new Date() },
        create: { quizId: quizId.toString() }
    });
}

/**
 * Remove quiz from running
 */
async function removeRunning(quizId) {
    return prisma.running.deleteMany({
        where: { quizId: quizId.toString() }
    });
}

/**
 * Add Result for quiz from user
 */
async function addResult(quizId, userId, points) {
    return prisma.results.create({
        data: {
            quizId: quizId.toString(),
            userId: userId.toString(),
            points: points
        }
    });
}

/**
 * Get All results
 */
async function getResultAll() {
    return prisma.results.findMany();
}

module.exports = {
    info: { name: "prisma-postgres" },
    // init is handled by Prisma Migrations now, but we keep the export for compatibility
    init: () => console.log("Prisma initialized"),
    getRunning,
    addRunning,
    removeRunning,
    addResult,
    getResultAll,
    prisma // Exporting raw prisma instance just in case
};