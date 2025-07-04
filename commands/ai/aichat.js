const { SlashCommandBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const Guild = require('../../models/guildModel');

async function createCategory(guild, categoryName) {
    try {
        console.info('Creating category with name:', categoryName);

        const newlyCreatedCategory = await guild.channels.create({
            name: categoryName,
            type: 4,
        });

        return newlyCreatedCategory;
    } catch (error) {
        console.error(error);
        throw new Error('Unable to create category.');
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aichat-p')
        .setDescription('Create or close a private AI channel for chatting.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a private AI channel for chatting.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close your private AI channel.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel),
    async execute(interaction) {
        if (!interaction.guild) {
            interaction.reply({ content: 'You can only run this command inside a server.', ephemeral: true });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'create') {
                const guildModel = await Guild.findOne({
                    key: interaction.guild.id,
                });
                const staffRoles = guildModel?.settings?.ticketStaffRoles || [];
                const categoryName = 'AI User Chats';

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
                    permissionOverwrites: roleOverwrites,
                });

                guildModel.settings.aiUserChannel.push(channel.id);
                await guildModel.save();
                const aiEmbed = new EmbedBuilder()
                    .setTitle('Welcome to your private AI Chat!')
                    .setDescription(`This channel is now your **private AI assistant**, powered by the **LLaMA 3: 8B** language model.\n\nYou can ask questions, brainstorm ideas, or get help — just like talking to a smart assistant.`)
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
                            content: 'You do not have a channel to close.', ephemeral: true });
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
            interaction.reply({
                content: 'Error handling the command. Please try again.',
                ephemeral: true,
            });
        }
    },
};