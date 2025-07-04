require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
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

        const commands = [];
        const foldersPath = path.join(__dirname, 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            
                const commandsPath = path.join(foldersPath, folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);

                    if ('data' in command && 'execute' in command) {
                        commands.push(command.data);
                    } else {
                        console.debug(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                }
        }

        await deployGlobalCommands(commands);

        await mongoose.connection.close();
        console.info('Closed MongoDB connection');
        process.exit();
    } catch (error) {
        console.error('Error deploying global commands:', error);
    }
}

deployGlobalCommandsOnly();