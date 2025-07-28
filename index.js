#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { Client, Collection, Events, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, InteractionResponseType, MessageFlags } = require('discord.js');
const token = process.env.TOKEN;
const mongoURI = process.env.MONGO_URI;
const debug = process.env.DEBUG_MODE === 'true';
const { ActivityType } = require("discord.js");
const AiChatLog = require('./models/aiChatLog');
const {
    v4: uuidv4,
} = require('uuid');

const Guild = require('./models/guildModel');

const port = process.env.PORT || 3009;

const statusJson = require('./status.json');

function generateUUID() {
    return uuidv4();
}

let status = statusJson.map(entry => ({
    name: entry.name,
    type: ActivityType[entry.type.toUpperCase()],
    url: entry.url
}));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildModeration, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.setMaxListeners(30);
client.commands = new Collection();
const handleAIMessage = require('./handlers/aiMessageCreate');

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    minecraftServerHandler.handleServerCommand(message);
    fivemHandler.handleServerCommand(message);
});

const prefix = '!';

async function loadGuildIds() {
    try {
        const guilds = await Guild.find({}, {
            _id: 0,
            key: 1,
            'settings.greeting.message': 1
        });
        const guildData = guilds.map(guild => ({
            key: guild.key,
        }));
        return guildData || [];
    } catch (err) {
        console.error('Error fetching guild IDs from MongoDB:', err);
        throw err;
    }
}

async function connectToMongo() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        throw err;
    }
}

const aiChatCommand = require('./commands/ai/aichat');

client.commands.set(aiChatCommand.data.name, aiChatCommand);


process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);

    const message = {
        message: `Uncaught Exception: ${err.message}`,
        title: 'AIC Bot - Fehler',
    };


});

client.once('ready', async () => {
    console.log(`${client.user.tag} is Online`);

    async function fetchTotalOnlineUsers() {
        let totalOnlineUsers = 0;
        const fetchPromises = [];

        client.guilds.cache.forEach(guild => {
            fetchPromises.push(guild.members.fetch()
                .then(fetchedMembers => {
                    const onlineMembers = fetchedMembers.filter(member => ['online', 'idle', 'dnd', 'offline'].includes(member.presence?.status));
                    totalOnlineUsers += onlineMembers.size;
                })
                .catch(error => {
                    console.error(`Error fetching members for guild ${guild.name}:`, error);
                }));
        });

        await Promise.all(fetchPromises);

        return totalOnlineUsers;
    }

    setInterval(() => {
        let random = Math.floor(Math.random() * status.length);
        client.user.setActivity(status[random], { type: 3, browser: "DISCORD IOS" });
    }, 5000);

    try {
        await connectToMongo(mongoURI, {
            poolSize: 20,
        });

        const guildIds = await loadGuildIds();

    } catch (error) {
        console.error('Error during bot initialization:', error);
    }
});

const commandStats = {};
cron.schedule('*/60 * * * *', logCommandMetrics);

logCommandMetrics();

function logCommandMetrics() {
    if (Object.keys(commandStats).length > 0) {
        const summary = {};
        Object.keys(commandStats).forEach(commandName => {
            const stats = commandStats[commandName];
            if (stats.count > 0) {
                summary[commandName] = {
                    count: stats.count,
                    avgDuration: (stats.totalDuration / stats.count).toFixed(2) + ' ms'
                };

                commandStats[commandName] = { count: 0, totalDuration: 0 };
            }
        });

        if (Object.keys(summary).length > 0) {
            console.log('Command Metrics:', { summary });
        }
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand())
        return;
    const commandName = interaction.commandName;
    const command = interaction.client.commands.get(commandName);
    const startTime = Date.now();

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    if (!commandStats[commandName]) {
        commandStats[commandName] = { count: 0, totalDuration: 0 };
    }

    let subCommand = '';
    try {
        subCommand = interaction.options.getSubcommand(false);
    } catch (error) {
        subCommand = null;
    }
    const options = interaction.options.data.map(option => {
        let value;
        switch (option.type) {
            case 3: value = interaction.options.getString(option.name); break;
            case 5: value = interaction.options.getBoolean(option.name); break;
            case 6: value = interaction.options.getUser(option.name)?.username; break;
            case 7: value = interaction.options.getChannel(option.name)?.name; break;
            case 8: value = interaction.options.getRole(option.name)?.name; break;
            case 10: value = interaction.options.getNumber(option.name); break;
            case 4: value = interaction.options.getInteger(option.name); break;
            default: value = 'Unknown type';
        }
        return { name: option.name, type: option.type, value };
    });

    if (debug) {
        console.log(`Optionen: ${JSON.stringify(options)}`);
    }

    try {
        await command.execute(interaction, client);
        const duration = Date.now() - startTime;
        commandStats[commandName].count++;
        commandStats[commandName].totalDuration += duration;

        if (debug) {
            console.log("Command executed", {
                guildName: interaction.guild.name,
                guildId: interaction.guild.id,
                channelName: interaction.channel.name,
                channelId: interaction.channel.id,
                userName: interaction.user.username,
                userId: interaction.user.id,
                commandName,
                subCommand: interaction.options.getSubcommand(false),
                options,
                duration: `${duration} ms`
            });
        }

    } catch (error) {
        console.error(`Command execution error: ${error.message}`, {
            commandName: commandName,
            subCommand: subCommand,
            options: options,
            error: error.stack,
            context: {
                guild: interaction.guild.name,
                channel: interaction.channel.name,
                user: interaction.user.tag
            }
        });
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `There was an error while executing this command!`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
    } else if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
});

client.on('rateLimited', async (interaction) => {
    if (debug) {
        console.log('Rate Limited');
    }
});

client.on('rateLimit', async (interaction) => {
    if (debug) {
        console.log('Rate Limited');
    }
});

client.on('messageCreate', async (message) => {

    if (message.guild) {

        await handleAIMessage(message);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const chatId = generateUUID();

    if (interaction.customId === 'closeAiChat') {
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirmCloseAiChat')
                .setLabel('✅ Ja, schließen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancelCloseAiChat')
                .setLabel('❌ Abbrechen')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmEmbed = new EmbedBuilder()
            .setTitle('AI Chat schließen?')
            .setDescription('Möchtest du deinen privaten AI-Chat wirklich schließen?\nDer Chat wird **gelöscht** und dir wird ein Transkript per DM gesendet.')
            .setColor(0xF04747);

        await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmRow],
            flags: MessageFlags.Ephemeral
        });

        return;
    }
    if (interaction.customId === 'cancelCloseAiChat') {
        const cancelledEmbed = new EmbedBuilder()
            .setDescription('Das Schließen des AI-Chats wurde abgebrochen.')
            .setColor(0x57F287);

        await interaction.update({
            embeds: [cancelledEmbed],
            components: []
        });

        return;
    }
    if (interaction.customId === 'confirmCloseAiChat') {
        try {
            const guildModel = await Guild.findOne({ key: interaction.guild.id });

            const userChannelId = guildModel?.settings?.aiUserChannel.find(
                (channelId) =>
                    interaction.guild.channels.cache.has(channelId) &&
                    interaction.channel.id === channelId &&
                    interaction.guild.members.cache.get(interaction.user.id)
                        .permissionsIn(channelId)
                        .has(PermissionsBitField.Flags.ViewChannel)
            );

            if (!userChannelId) {
                await interaction.reply({
                    content: 'You do not have permission to close this AI channel.',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            const channel = interaction.guild.channels.cache.get(userChannelId);
            const messages = await channel.messages.fetch({ limit: 100 });
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            const log = new AiChatLog({
                guildId: interaction.guild.id,
                chatId,
                userId: interaction.user.id,
                channelId: channel.id,
                channelName: channel.name,
                messages: sortedMessages.map(msg => ({
                    authorId: msg.author.id,
                    authorName: msg.author.username,
                    content: msg.content,
                    timestamp: msg.createdAt
                }))
            });

            await log.save();

            let html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Discord Chat Transcript - ${channel.name}</title>
                <style>
                @import url('https://fonts.googleapis.com/css2?family=Whitney:wght@400;600&display=swap');
                body {
                    background-color: #36393f;
                    color: #dcddde;
                    font-family: "Whitney", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                }
                h1 {
                    color: #fff;
                    font-weight: 600;
                    margin-bottom: 20px;
                }
                .chat-message {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .avatar {
                    flex-shrink: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                }
                .message-content {
                    max-width: 90%;
                }
                .username-timestamp {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    font-size: 14px;
                }
                .username {
                    font-weight: 600;
                    color: #fff;
                }
                .timestamp {
                    color: #72767d;
                    font-size: 12px;
                }
                .message-text {
                    font-size: 16px;
                    line-height: 20px;
                    white-space: pre-wrap;
                    margin-top: 2px;
                }
                a {
                    color: #00b0f4;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                </style>
                </head>
                <body>
                <h1>Chat Transcript - #${channel.name}</h1>
                <div class="chat-container">
                `;

            for (const message of sortedMessages.values()) {
                const time = new Date(message.createdTimestamp).toLocaleString('en-US', {
                    hour12: true,
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const authorName = message.author.username;
                const authorAvatar = message.author.displayAvatarURL({ format: 'png', size: 32 });
                const content = message.content
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br>")
                    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

                html += `
                <div class="chat-message">
                    <img class="avatar" src="${authorAvatar}" alt="avatar" />
                    <div class="message-content">
                    <div class="username-timestamp">
                        <span class="username">${authorName}</span>
                        <span class="timestamp">${time}</span>
                    </div>
                    <div class="message-text">${content}</div>
                    </div>
                </div>
                `;
            }

            html += `
                </div>
                </body>
                </html>
                `;

            const buffer = Buffer.from(html, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `chat-transcript-${channel.name}.html` });

            const user = await interaction.user.createDM();
            await user.send({
                content: 'Hier ist das Transkript deines AI-Chat-Kanals.',
                files: [attachment]
            });

            await channel.delete();

            guildModel.settings.aiUserChannel = guildModel.settings.aiUserChannel.filter(id => id !== userChannelId);
            await guildModel.save();

        } catch (error) {
            console.error('Error closing AI chat:', error);
            await interaction.reply({
                content: 'Etwas ist beim Schließen des AI-Chats schiefgelaufen.',
                flags: MessageFlags.Ephemeral,
            });
        }
        return;
    }
});

if (process.argv.includes('deploy-commands')) {
    require('./deploy-commands');
    return;
}

process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        if (debug) {
            console.log('Closed MongoDB connection');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});

function start() {
    client.login(token);
}
module.exports = client;
client.login(token);
