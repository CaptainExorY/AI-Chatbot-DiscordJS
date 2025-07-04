const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/guildModel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aichat')
        .setDescription('Set the AI channel and roles.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set the AI channel and roles.')
                .addChannelOption(option =>
                    option.setName('aichannel')
                        .setDescription('Select the AI channel.')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('airoles')
                        .setDescription('Select the AI roles.')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        if (!interaction.guild) {
            interaction.reply({ content: 'You can only run this command inside a server.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'setup') {
                const aiChannel = interaction.options.getChannel('aichannel');
                const aiRoles = interaction.options.getRole('airoles');

                if (aiChannel && aiRoles) {
                    const guildModel = await Guild.findOne({
                        key: interaction.guild.id
                    });

                    if (guildModel) {
                        guildModel.settings.aiChannel = aiChannel.id;
                        guildModel.settings.aiRoles = [aiRoles.id];
                        await guildModel.save();

                        interaction.reply({ content: 'AI channel and roles set successfully!', ephemeral: true });
                    } else {
                        const newGuild = new Guild({ key: interaction.guild.id });
                        await newGuild.save();
                        interaction.reply({ content: 'The DB Entry has been made, please run the Command again!', ephemeral: true });
                    }
                } else {
                    interaction.reply({ content: 'Please provide both AI channel and roles.', ephemeral: true });
                }
            } else {
                interaction.reply({ content: 'Invalid subcommand.', ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            interaction.reply({ content: 'Error handling the command. Please try again.', ephemeral: true });
        }
    },
};