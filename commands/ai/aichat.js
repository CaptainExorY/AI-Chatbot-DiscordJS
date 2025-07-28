const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a private AI channel for chatting.')
                .addStringOption(option =>
                    option
                        .setName('model')
                        .setDescription('Wähle ein AI-Modell (optional)')
                        .setRequired(false)
                        .addChoices(
                            ['llama3:8b', 'llama3:latest', 'llama3.1:8b', 'llama-guard3:1b', 'llama-guard3:latest', 'deepseek-r1-abliterated:14b', 'mistral:7b', 'vicuna:13b']
                                .map(model => ({ name: model, value: model }))
                        )
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close your private AI channel.')
        )
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
            } else if (subcommand === 'create') {
                const guildModel = await Guild.findOne({
                    key: interaction.guild.id,
                });
                const staffRoles = guildModel?.settings?.ticketStaffRoles || [];
                const categoryName = 'AI User Chats';
                const selectedModel = interaction.options.getString('model') || 'llama3:8b';

                const aiUserChannels = guildModel?.settings?.aiUserChannel || [];
                const existingChannelId = aiUserChannels.find(channelId => {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    return channel && channel.type === 'GUILD_TEXT' && channel.name === `${interaction.user.username}-ai`;
                });

                if (existingChannelId) {
                    const existingChannel = interaction.guild.channels.cache.get(existingChannelId);
                    interaction.reply({
                        content: `You already have a channel: <#${existingChannel.id}>`,
                        ephemeral: true,
                    });
                    return;
                }

                const requiredRole = guildModel?.settings?.aiRoles || [];
                const member = interaction.guild.members.cache.get(interaction.user.id);
                const hasRequiredRole = requiredRole.length === 0 || member.roles.cache.some((role) => requiredRole.includes(role.id));

                if (!hasRequiredRole || requiredRole.length === 0) {
                    interaction.reply({ content: 'You do not have the required role to create an AI channel.', ephemeral: true });
                    return;
                }

                const category = interaction.guild.channels.cache.find(
                    (c) => c.type === 4 && c.name === categoryName
                ) || (await createCategory(interaction.guild, categoryName));

                const roleOverwrites = [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel'],
                    },
                    ...staffRoles.map(roleId => ({
                        id: roleId,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    })),
                ];

                const channel = await interaction.guild.channels.create({
                    name: `${interaction.user.username}-ai`,
                    type: 0,
                    parent: category.id,
                    topic: `model=${selectedModel}`,
                    permissionOverwrites: roleOverwrites,
                });

                guildModel.settings.aiUserChannel.push(channel.id);
                await guildModel.save();
                const aiEmbed = new EmbedBuilder()
                    .setTitle('Welcome to your private AI Chat!')
                    .setDescription(`This channel is now your **private AI assistant**, powered by the **${selectedModel}** model.\n\nYou can ask questions, brainstorm ideas, or get help — just like talking to a smart assistant.`)
                    .setColor(0x5865F2)
                    .setTimestamp()
                    .setFooter({ text: 'Powered by GuardianV AI' });

                const closeAiBtn = new ButtonBuilder()
                    .setCustomId('closeAiChat')
                    .setLabel('Close Chat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const aiActionRow = new ActionRowBuilder().addComponents(closeAiBtn);


                interaction.reply({ content: `Private AI channel created! Click here: <#${channel.id}>`, ephemeral: true });
                await channel.send({
                    content: `<@${interaction.user.id}>`,
                    embeds: [aiEmbed],
                    components: [aiActionRow]
                });
            } else if (subcommand === 'close') {
                try {
                    const guildModel = await Guild.findOne({
                        key: interaction.guild.id,
                    });

                    const userChannelId = guildModel?.settings?.aiUserChannel.find(
                        (channelId) => interaction.guild.channels.cache.has(channelId) && interaction.guild.members.cache.get(interaction.user.id).permissionsIn(channelId).has('ViewChannel')
                    );

                    if (!userChannelId) {
                        interaction.reply({
                            content: 'You do not have a channel to close.', ephemeral: true
                        });
                        return;
                    }

                    const userChannel = interaction.guild.channels.cache.get(userChannelId);
                    await userChannel.delete();

                    guildModel.settings.aiUserChannel = guildModel.settings.aiUserChannel.filter(id => id !== userChannelId);
                    await guildModel.save();

                    interaction.reply({ content: 'Your private AI channel has been closed.', ephemeral: true });
                } catch (error) {
                    console.error(error);
                    interaction.reply({
                        content: 'Error handling the command. Please try again.',
                        ephemeral: true,
                    });
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