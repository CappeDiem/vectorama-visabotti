const { EmbedBuilder } = require('discord.js')
const { PermissionFlagsBits } = require('discord.js')
const {getResultAll} = require('../utils/database')

module.exports = {
    name: 'leaderboard',
    description: 'Hae top 15 leaderboardi',
    limited: false,
    default_member_permissions: PermissionFlagsBits.ManageMessages,
    async execute(interaction, args, bot) {
        let logger = bot.logger
        let results = await getResultAll()
        logger.info("Results amount: "  + parsedResults.size)
        logger.debug("Results: " + parsedResults)

        let description = []
        if (results.length < 1) {
            const boardEmbed = new EmbedBuilder()
                .setTitle(`Top 15 Leaderboard (0)`)
                .setColor(0xD94D15)
                .setDescription("No Answers found")
            await interaction.reply({ embeds: [boardEmbed] })
            return
        }

        // Parsing results to merge rows with user id's and counting total points
        let parsedResults = new Map()
        results.forEach(result => {
            if(parsedResults.get(result.userId) === undefined) parsedResults.set(result.userId, 0)
            finalPoints = parseInt(parsedResults.get(result.userId)) + parseInt(result.points)
            parsedResults.set(result.userId, finalPoints)
        })

        // Sort and trim results to show top 15 leaderboard
        const sortedResults = new Map([...parsedResults.entries()].sort((a, b) => b[1] - a[1]))
        trimMapToFirst15(sortedResults)
        
        // Assemble description for embed
        let count = 1
        for (let [key, value] of sortedResults) {
            const user = await bot.users.fetch(key)
	        description.push(`${count}. ${user.globalName} (<@${key}>): ${value} points`)
            count++
        }
        logger.info("Results amount: "  + parsedResults.size)
        logger.debug("Results: " + parsedResults)

        // Assemble embed and reply it to the command
        const boardEmbed = new EmbedBuilder()
            .setTitle(`Top 15 Leaderboard (${parsedResults.size})`)
            .setColor(0xD94D15)
            .setDescription(description.join("\n"))
        await interaction.reply({ embeds: [boardEmbed] })

    }
}

// function to trim the map
function trimMapToFirst15(map, n = 15) {
  let count = 0
  for (const key of map.keys()) {
    if (count >= n) {
      map.delete(key)
    }
    count++
  }
}