// handleAIMessage.js
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const Discord = require('discord.js');
const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    DiscordAPIError
} = require('discord.js');
const {
    ActivityType,
    EmbedBuilder
} = require("discord.js");
const Guild = require('../models/guildModel');

const useOpenAIChatGPT = process.env.OPEN_AI === 'true';

let currentAIClient;

if (useOpenAIChatGPT) {
    const { chatgpt } = require('../clients/chatGPTClient.js');
    currentAIClient = chatgpt;
} else {
    const { aiClient } = require('../clients/openWebUI.js');
    currentAIClient = aiClient;
}


async function handleAIMessage(message) {
    try {
        if (message.author.bot) {
            return;
        }

        const guildSettings = await Guild.findOne({
            key: message.guild.id
        });

        if (guildSettings) {
            const aiChannel = guildSettings.settings.aiChannel;
            const aiRoles = guildSettings.settings.aiRoles || [];
            const aiUserChannels = guildSettings.settings.aiUserChannel || [];

            const member = message.guild.members.cache.get(message.author.id);
            const hasRequiredRoles = aiRoles.length === 0 || member.roles.cache.some((role) => aiRoles.includes(role.id));

            const isInAIChannel = message.channelId === aiChannel;
            const isInAIUserChannels = aiUserChannels.includes(message.channelId);

            if ((isInAIChannel || isInAIUserChannels) && hasRequiredRoles) {
                const loadingMsg = await message.reply({
                    content: `<a:discord:1399438262308704517>`,
                    allowedMentions: { repliedUser: false }
                });

                let selectedModel = 'llama3:8b';

                if (message.channel.topic && message.channel.topic.startsWith('model=')) {
                    selectedModel = message.channel.topic.replace('model=', '').trim();
                }

                let aiResponse;
                let responseMaxLength = 2000;

                if (useOpenAIChatGPT) {
                    const chatGPTReply = await currentAIClient.send(message.content, currentAIClient.options.contextRemembering && currentAIClient.contextData.get(message.author.id) ? currentAIClient.contextData.get(message.author.id) : undefined);
                    aiResponse = chatGPTReply.text;
                    if (currentAIClient.options.contextRemembering) {
                        currentAIClient.contextData.set(message.author.id, chatGPTReply.id);
                    }
                    responseMaxLength = currentAIClient.options.maxLength;

                } else {
                    aiResponse = await currentAIClient.getChatResponse(message, selectedModel);
                    responseMaxLength = currentAIClient.options.maxLength;
                }
                if (!isInAIUserChannels) {
                    await loadingMsg.delete();
                    await message.reply({
                        content: aiResponse.substring(0, responseMaxLength),
                        allowedMentions: { repliedUser: true }
                    });
                } else {
                    await loadingMsg.delete();
                    await message.reply(aiResponse.substring(0, aiClient.options.maxLength || 2000));
                }

            } else {
                return;
            }
        } else {
            return;
        }
    } catch (error) {
        console.error('Error handling AI message:', error);

        if (error instanceof DiscordAPIError) {
            console.error('Discord API Error:', error.message);
            message.reply('An error occurred while processing your request. Please try again.');
        } else {
            console.error('Unexpected Error:', error.message);
            message.reply('An unexpected error occurred. Please try again later.');
        }
    }
}

module.exports = handleAIMessage;
