require("dotenv").config()
const { createLogger, format, transports } = require("winston")

const level = process.env.LOG_LEVEL || "info"
const useColor = !process.env.NO_COLOR

const consoleFormat = format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    ...(useColor ? [format.colorize()] : []),
    format.printf(({ timestamp, level, message, module, stack, service, ...meta }) => {
        const time = timestamp.split("T")[1].split(".")[0]
        const tag = module ? `[${module}]` : ""
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
        return `[${time} ${level}]${tag}: ${stack || message}${extra}`
    })
);

const logger = createLogger({
    level,
    defaultMeta: { service: "ramavisa" },
    transports: [new transports.Console({ format: consoleFormat })],
    exceptionHandlers: [new transports.Console({ format: consoleFormat })],
    rejectionHandlers: [new transports.Console({ format: consoleFormat })],
});

module.exports = logger;