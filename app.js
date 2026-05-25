require('dotenv').config()
const fs = require("fs")
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js')
const winston = require('winston')
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.User
    ]
})

bot.logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(log => `[${log.timestamp.split('T')[1].split('.')[0]} ${log.level}]: ${log.message}`),
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.Console({level: 'info'}),
    ],
});

let logger = bot.logger

// Create a collection to store commands inside the bot object
bot.commands = new Collection()

// Load Command files from commands folder
const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    logger.info(`${file} loaded`)
    bot.commands.set(props.name, props)
}

// Get folders inside commands folder
const commandSubFolders = fs.readdirSync('./commands/').filter(f => !f.endsWith('.js'))

// Load Command files from subfolders inside commands folder
commandSubFolders.forEach(folder => {
    const commandFiles = fs.readdirSync(`./commands/${folder}/`).filter(f => f.endsWith('.js'))
    for (const file of commandFiles) {
        const props = require(`./commands/${folder}/${file}`)
        logger.info(`${file} loaded from ${folder}`)
        bot.commands.set(props.name, props)
    }
})

// Load Event files from events folder
const eventFiles = fs.readdirSync('./events/').filter(f => f.endsWith('.js'))
for (const file of eventFiles) {
    const event = require(`./events/${file}`)
    if(event.once) {
        bot.once(event.name, (...args) => event.execute(...args, bot))
    } else {
        bot.on(event.name, (...args) => event.execute(...args, bot))
    }
}

// Token needed in config.json
bot.login(process.env.DISCORD_TOKEN)