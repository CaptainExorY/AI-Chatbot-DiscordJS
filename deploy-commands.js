const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const mongoose = require('mongoose');
const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const mongoURI = process.env.MONGO_URI;

async function connectToMongo() {
    try {
        await mongoose.connect(mongoURI);
        console.info('Connected to MongoDB');
    } catch (err) {
        console.error('Error connecting to MongoDB', err);
        throw err;
    }
}

async function deployGlobalCommands(commands) {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.info(`Started refreshing ${commands.length} global application (/) commands`);

        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.info(`Successfully reloaded ${data.length} global application (/) commands`);
    } catch (error) {
        console.error('Error deploying global commands:', error);
        throw error;
    }
}

async function deployGlobalCommandsOnly() {
    try {
        await connectToMongo();

        const aiChatCommand = require('./commands/ai/aichat');

        const commands = [aiChatCommand.data];


        await deployGlobalCommands(commands);

        await mongoose.connection.close();
        console.info('Closed MongoDB connection');
        process.exit();
    } catch (error) {
        console.error('Error deploying global commands:', error);
    }
}

deployGlobalCommandsOnly();