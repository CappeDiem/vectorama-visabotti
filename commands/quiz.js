const { ActionRowBuilder, EmbedBuilder } = require('discord.js')
const { ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js')
const { ApplicationCommandOptionType } = require('discord.js')
const quizzes = require('../quiz.json')
const { addRunning, removeRunning } = require('../utils/sqlite')

module.exports = {
    name: 'quiz',
    description: 'Aloita kysymys ID:n pohjalta',
    limited: false,
    args: true,
    options: [{
        'type': ApplicationCommandOptionType.String,
        'name': 'id',
        'description': 'Kysymyksen ID',
        'required': true,
    }],
    default_member_permissions: PermissionFlagsBits.ManageMessages,
    async execute(interaction, args, bot) {

        if(!quizzes.questions.find(question => question.id === args[0])) return interaction.reply({ content: "Kysymystä ei löytynyt", flags: MessageFlags.Ephemeral })
    
        const quiz = quizzes.questions.find(question => question.id === args[0])
        let quizId = quiz.id + "_" + Date.now()

        let buttons = []
        quiz.answers.forEach(answer => {
            const button = new ButtonBuilder()
                .setCustomId(quizId + "_" + answer.id)
                .setLabel(answer.text)
                .setStyle(ButtonStyle.Secondary)
            buttons.push(button)
        })
        
        const row = new ActionRowBuilder()
        .addComponents(buttons)

        const quizEmbed = new EmbedBuilder()
            .setTitle("Ramavisa")
            .setDescription(`${quiz.question}`)
            .setColor(0x00ABE7)
            .setTimestamp()

        if(quiz.img !== "") {
            quizEmbed.setImage(quiz.img)
        }

        await interaction.reply({
            embeds: [quizEmbed],
            components: [row],
            withResponse: true
        })

        await addRunning(quizId)

        setTimeout(async () => {
            await removeRunning(quizId)
        }, 10000)
    }
  }
