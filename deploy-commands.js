const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const mongoose = require('mongoose');

const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const guildId = process.env.GUILD_ID;
const mongoURI = process.env.MONGO_URI;

const mode = process.argv[2];

async function connectToMongo() {
    try {
        await mongoose.connect(mongoURI);
        console.info('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        throw err;
    }
}

async function clearGlobalCommands() {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.info('Deleting all global commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.info('All global commands deleted successfully.');
    } catch (error) {
        console.error('Failed to delete global commands:', error);
    }
}

async function deployCommands(commands, privateDeployment = false) {
    const rest = new REST({ version: '10' }).setToken(token);

    const route = privateDeployment
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

    try {
        console.info(`Started refreshing ${commands.length} ${privateDeployment ? 'guild' : 'global'} application (/) commands`);

        const data = await rest.put(route, { body: commands });

        console.info(`Successfully reloaded ${data.length} ${privateDeployment ? 'guild' : 'global'} commands`);
    } catch (error) {
        console.error(`Error deploying ${privateDeployment ? 'guild' : 'global'} commands:`, error);
        throw error;
    }
}

async function deploy() {
    try {
        if (mode === 'clear-global') {
            await clearGlobalCommands();
            process.exit();
            return;
        }
        await connectToMongo();

        const aiChatCommand = require('./commands/ai/aichat');
        const commands = [aiChatCommand.data];

        const isPrivate = mode === 'private';

        if (isPrivate && !guildId) {
            throw new Error('GUILD_ID is missing in .env for private deployment.');
        }

        await deployCommands(commands, isPrivate);

        await mongoose.connection.close();
        console.info('Closed MongoDB connection');
        process.exit();
    } catch (error) {
        console.error('Deployment failed:', error);
    }
}

deploy();
