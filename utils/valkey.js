const Valkey = require("iovalkey");
const logger = require("./logger").child({ module: "valkey" });

const CONNECT_TIMEOUT_MS = 5000;  // initial startup connection
const COMMAND_TIMEOUT_MS = 1500;  // keep well under Discord's 3s interaction window

const url = process.env.VALKEY_URL;
if (!url) {
    // Without this, the client silently falls back to localhost:6379
    throw new Error("VALKEY_URL is not set");
}

const valkey = new Valkey(url, {
    lazyConnect: true,               // connection starts only in connectValkey()
    connectTimeout: CONNECT_TIMEOUT_MS,
    commandTimeout: COMMAND_TIMEOUT_MS,
    enableOfflineQueue: false,       // fail fast instead of queueing while disconnected
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000), // retry forever, max 2s apart
});

valkey.on("ready", () => logger.info("Connected and ready"));
valkey.on("reconnecting", (ms) => logger.warn(`Reconnecting in ${ms}ms`));
valkey.on("close", () => logger.warn("Connection closed"));
valkey.on("end", () => logger.warn("Connection ended"));
valkey.on("error", (err) => logger.error(`Error: ${err.message}`));

async function connectValkey() {
    // connect() can retry indefinitely, so bound the startup wait
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`Valkey did not connect within ${CONNECT_TIMEOUT_MS}ms`)),
            CONNECT_TIMEOUT_MS + 1000
        );
    });

    try {
        await Promise.race([valkey.connect(), timeout]);
        await valkey.ping();
    } catch (err) {
        valkey.disconnect(); // stop background retries so the process can exit
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function closeValkey() {
    try {
        await valkey.quit();   // lets pending commands finish
    } catch {
        valkey.disconnect();   // force close if the connection is already down
    }
}

module.exports = { valkey, connectValkey, closeValkey };