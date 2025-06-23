const { EmbedBuilder, MessageFlags, ButtonBuilder, ActionRowBuilder } = require('discord.js')
const { getRunning, addResult, getResultAll, removeRunning } = require('../utils/sqlite')
const quizzes = require('../quiz.json')
module.exports = {
  name: 'interactionCreate',
  async execute(interaction, bot) {
    // Handle Button Presses for the quiz
    if (interaction.type === 3) {
        // get the quiz id and find quiz from file
        const ids = interaction.customId.split("_")
        const quizId = ids[0] + "_" + ids[1]
        const quiz = quizzes.questions.find(question => question.id === ids[0])

        // The answer user clicked
        const answerId = ids[2]

        // get things from database
        let running = await getRunning()
        let results = await getResultAll()

        results = results.filter(result => result.quizId === quizId)

        // Check if quiz question has expired timeout in this 1 min
        if(Date.now() > parseInt(ids[1]) + 1*60000) {
            const disabledButtons = interaction.message.components[0].components.map((button) => ButtonBuilder.from(button).setDisabled(true))
            const actionRow = new ActionRowBuilder().setComponents(disabledButtons)
            await interaction.reply({ content: "Kysymyksen vastaus aika on loppunut", flags: MessageFlags.Ephemeral })
            await interaction.message.edit({
                components: [actionRow]
            }).catch(console.error)
            await removeRunning(quizId)
            return
        }

        // check if it is in running db if not handle as expired
        if(!running.find(quiz => quiz.quizId === quizId))  {
            const disabledButtons = interaction.message.components[0].components.map((button) => ButtonBuilder.from(button).setDisabled(true))
            const actionRow = new ActionRowBuilder().setComponents(disabledButtons)
            await interaction.reply({ content: "Kysymyksen vastaus aika on loppunut", flags: MessageFlags.Ephemeral })
            await interaction.message.edit({
                components: [actionRow]
            }).catch(console.error)
            return
        }
        
        // Check if user has already answered
        if(results.find(result => result.userId === interaction.member.user.id)) return await interaction.reply({ content: "Olet jo vastannut kysymykseen", flags: MessageFlags.Ephemeral })

        // If user has not already answered handle point calculations and give response
        if(quiz.answers.find(answer => answer.id === answerId) && quiz.answers.find(answer => answer.id === answerId).correct) {
            let points = 2
            if (Date.now() < parseInt(ids[1]) + 30000 ) points = 2
            if (Date.now() < parseInt(ids[1]) + 20000 ) points = 5
            if (Date.now() < parseInt(ids[1]) + 10000 ) points = 10

            addResult(quizId, interaction.member.user.id, points)
            
            return await interaction.reply({ content: `Vastasit oikein sait ${points} pistettä`, flags: MessageFlags.Ephemeral })
        } else {
            addResult(quizId, interaction.member.user.id, 0)
            return await interaction.reply({ content: "Vastasit väärin sait 0 pistettä", flags: MessageFlags.Ephemeral })
        }
    }

    // Command Handler from my discord.js template

    if (!interaction.isChatInputCommand()) return
    
    // Get the command from the available cmds in the bot, if there isn't one, just return because discord will throw an error itself
    const command = bot.commands.get(interaction.commandName)
    if (!command) return

    // Make args variable from interaction options for compatibility with message command code
    const args = interaction.options._hoistedOptions

    // Set args to value of options
    args.forEach(arg => args[args.indexOf(arg)] = arg.value)

    try {
      await interaction.deferReply({ ephemeral: command.ephemeral })
      interaction.reply = interaction.editReply
      command.execute(interaction, args, bot)
    }
    catch (err) {
      const interactionFailed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('INTERACTION FAILED')
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
        .addFields([
          { name: '**Type:**', value: 'Slash' }, { name: '**Interaction:**', value: command.name },
        ])
      if (interaction.guild) {
        interactionFailed.addFields([
          { name: '**Guild:**', value: interaction.guild.name },
          { name: '**Channel:**', value: interaction.channel.name },
          { name: '**Error:**', value: `\`\`\`\n${err}\n\`\`\`` },
        ])
      }
      interaction.user.send({ embeds: [interactionFailed] }).catch(err => console.log(err))
      console.log(err.stack)
    }
  },
}