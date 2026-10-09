const { randomUUID } = require("node:crypto");
const { valkey } = require("./valkey");
const { prisma } = require("./database");
const logger = require("./logger").child({ module: "quizEngine" });

const ACTIVE = "quiz:active";
const timers = new Map();
const finishing = new Set();
// roundId -> { startedAt, deadline, scoring, answers: Map(answerId -> correct) }
// Round data never changes after start(), so button clicks can skip reading it from Valkey.
const rounds = new Map();
const loading = new Map(); // roundId -> in-flight loadRound promise, shared by concurrent clicks
// TODO: move to config. Each round snapshots these at start(), so changes only affect new rounds.
const settings = {
    durationMs: 60_000,
    // First tier whose withinMs is greater than the elapsed time wins; otherwise latePoints.
    tiers: [
        { withinMs: 10_000, points: 10 },
        { withinMs: 20_000, points: 5 },
    ],
    latePoints: 2,
};

// Sent once, then run via EVALSHA.
valkey.defineCommand("quizRecordAnswer", {
    numberOfKeys: 2,
    lua: `
local status = redis.call("HGET", KEYS[1], "status")
if not status then return "missing" end
if status ~= "active" then return "closed" end
if tonumber(ARGV[1]) > tonumber(redis.call("HGET", KEYS[1], "deadline")) then return "expired" end
if redis.call("HSETNX", KEYS[2], ARGV[2], ARGV[3]) == 0 then return "duplicate" end
redis.call("EXPIRE", KEYS[2], 86400)
return "accepted"
`,
});

async function start(questionId) {
    const question = await prisma.question.findUnique({ where: { id: String(questionId) } });
    if (!question) throw new Error(`Question not found: ${questionId}`);
    if (!Array.isArray(question.answers) || question.answers.length === 0) {
        throw new Error(`Question ${questionId} has no answers`);
    }

    const roundId = randomUUID();
    const startedAt = Date.now();
    const deadline = startedAt + settings.durationMs;
    const scoring = { tiers: settings.tiers, latePoints: settings.latePoints };
    const roundKey = key(roundId);

    await valkey.multi()
        .hset(roundKey,
            "quizId", question.quizId,
            "questionId", question.id,
            "startedAt", String(startedAt),
            "deadline", String(deadline),
            "status", "active",
            "scoring", JSON.stringify(scoring),
            "question", JSON.stringify(question))
        .expire(roundKey, settings.durationMs / 1000 + 3600) // safety net if the round never finishes
        .sadd(ACTIVE, roundId)
        .exec();

    rounds.set(roundId, toRound(startedAt, deadline, scoring, question));
    scheduleFinish(roundId, deadline);
    return {
        roundId,
        question: {
            id: question.id,
            quizId: question.quizId,
            question: question.question,
            img: question.img,
        },
        buttons: question.answers.map(answer => ({
            answerId: String(answer.id),
            text: answer.text,
            customId: `quiz:${roundId}:${encodeURIComponent(String(answer.id))}`,
        })),
    };
}

async function answer(customId, userId) {
    if (!userId) return { status: "invalid" };
    const match = /^quiz:([0-9a-f-]+):(.+)$/i.exec(customId || "");
    if (!match) return { status: "invalid" };
    const roundId = match[1];

    let answerId;
    try { answerId = decodeURIComponent(match[2]); }
    catch { return { status: "invalid" }; }

    const round = rounds.get(roundId) || await loadRound(roundId);
    if (!round) return { status: "missing" };

    const now = Date.now();
    if (now > round.deadline) return { status: "expired" };
    const correct = round.answers.get(answerId);
    if (correct === undefined) return { status: "invalid" };

    const points = correct ? score(round.scoring, now - round.startedAt) : 0;
    // Status and deadline are re-checked atomically in Lua; this is the only round trip on a click.
    const status = await valkey.quizRecordAnswer(
        key(roundId), answersKey(roundId),
        now, String(userId), JSON.stringify({ answerId, points }),
    );
    if (status === "missing" || status === "closed") rounds.delete(roundId);
    return { status, ...(status === "accepted" ? { points } : {}) };
}

async function finish(roundId, force = false) {
    if (finishing.has(roundId)) return;
    finishing.add(roundId);
    try {
        const roundKey = key(roundId);
        const [status, deadline] = await valkey.hmget(roundKey, "status", "deadline");
        if (!status || status === "completed") {
            forget(roundId);
            return;
        }
        if (!force && Date.now() < Number(deadline)) {
            scheduleFinish(roundId, Number(deadline));
            return;
        }

        // Close the round before reading results so late answers are rejected.
        const [, [, answers]] = await valkey.multi()
            .hset(roundKey, "status", "flushing")
            .hgetall(answersKey(roundId))
            .exec();
        const data = Object.entries(answers).map(([userId, raw]) => ({
            quizId: roundId,
            userId,
            points: JSON.parse(raw).points,
        }));

        // One Postgres batch. Duplicate rows are harmless if a restart retries.
        // quizId holds the roundId so rows stay unique under the (quizId, userId) PK;
        // the real quizId would make skipDuplicates drop answers to later questions.
        if (data.length) await prisma.results.createMany({ data, skipDuplicates: true });

        await valkey.multi()
            .hset(roundKey, "status", "completed")
            .srem(ACTIVE, roundId)
            .expire(roundKey, 86_400)
            .expire(answersKey(roundId), 86_400)
            .exec();
        forget(roundId);
    } finally {
        finishing.delete(roundId);
    }
}

async function recover() {
    for (const roundId of await valkey.smembers(ACTIVE)) {
        const [status, deadline] = await valkey.hmget(key(roundId), "status", "deadline");
        if (!status || status === "completed") {
            await valkey.srem(ACTIVE, roundId);
        } else if (status === "flushing" || Date.now() >= Number(deadline)) {
            try {
                await finish(roundId, true);
            } catch (error) {
                logger.error(`Could not flush quiz round ${roundId}: ${error.stack || error}`);
                scheduleFinish(roundId, Date.now() + 5_000);
            }
        } else {
            scheduleFinish(roundId, Number(deadline));
        }
    }
}

// Cache miss: round started before a restart or in another process.
// Concurrent clicks share one Valkey read instead of each fetching the question.
function loadRound(roundId) {
    if (!loading.has(roundId)) {
        loading.set(roundId, fetchRound(roundId).finally(() => loading.delete(roundId)));
    }
    return loading.get(roundId);
}

async function fetchRound(roundId) {
    const [startedAt, deadline, scoring, question] =
        await valkey.hmget(key(roundId), "startedAt", "deadline", "scoring", "question");
    if (!question) return null;
    const round = toRound(Number(startedAt), Number(deadline), JSON.parse(scoring), JSON.parse(question));
    rounds.set(roundId, round);
    return round;
}

function toRound(startedAt, deadline, scoring, question) {
    return {
        startedAt,
        deadline,
        scoring,
        answers: new Map(question.answers.map(answer => [String(answer.id), Boolean(answer.correct)])),
    };
}

function score(scoring, elapsedMs) {
    const tier = scoring.tiers.find(tier => elapsedMs < tier.withinMs);
    return tier ? tier.points : scoring.latePoints;
}

function scheduleFinish(roundId, deadline) {
    clearTimer(roundId);
    const timer = setTimeout(() => {
        finish(roundId).catch(error => {
            logger.error(`Could not flush quiz round ${roundId}: ${error.stack || error}`);
            scheduleFinish(roundId, Date.now() + 5_000);
        });
    }, Math.max(0, deadline - Date.now()));
    timer.unref?.();
    timers.set(roundId, timer);
}

function clearTimer(roundId) {
    clearTimeout(timers.get(roundId));
    timers.delete(roundId);
}

function forget(roundId) {
    clearTimer(roundId);
    rounds.delete(roundId);
}

function key(roundId) { return `quiz:round:${roundId}`; }
function answersKey(roundId) { return `quiz:answers:${roundId}`; }

module.exports = { start, answer, finish, recover };
