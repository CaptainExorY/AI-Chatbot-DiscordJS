
# DiscordJS AI Chatbot with Server and Private Chats

This is a Discord bot built with **Discord.js**, integrated with **OpenAI (ChatGPT)** and **MongoDB**, offering AI-powered chat and custom configurations per server. It also supports a WebUI for chat interaction.

## Features

- 🤖 AI Chat with context (via OpenAI API or OpenWebUI)
- ⚙️ Per-guild configuration and setup
- 📦 Slash command support
- 🧠 MongoDB integration for persistent settings

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/CaptainExorY/AI-Chatbot-DiscordJS.git
cd AI-Chatbot-DiscordJS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Create a `.env` file using the provided `.env.example`:

```bash
cp .env.example .env
```

Fill in the following fields:

```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
MONGO_URI=your_mongodb_connection_string
OPENAI_API_KEY=your_openai_api_key
OPEN_AI_LOGO='https://seeklogo.com/images/O/open-ai-logo-8B9BFEDC26-seeklogo.com.png'
OPEN_AI_NAME='ChatGPT'
OPEN_AI_URL='https://example.com'
```

---

## Commands

### `/ai-setup`
Initializes the AI system for your guild. This command must be run before using the AI chat feature.

### `/aichat`
Starts an AI conversation. Messages will be tracked in context.

---

## Project Structure

```
.
├── index.js                  # Bot startup
├── deploy-commands.js        # Slash command deployment script
├── commands/
│   └── ai/
│       ├── ai-setup.js       # Setup command for AI usage
│       └── aichat.js         # Slash command for chatting with AI
├── clients/
│   ├── chatGPTClient.js      # Handles OpenAI API communication
│   └── openWebUI.js          # Opens external WebUI (browser)
├── handlers/
│   └── aiMessageCreate.js    # Handles incoming AI messages
├── models/
│   └── guildModel.js         # Mongoose model for guild configs
├── status.json               # Used to persist readiness state
└── .env.example              # Environment variable template
```

---

## Database

The bot uses MongoDB to store guild-specific settings such as whether AI is enabled and which channels are authorized. This is handled via `guildModel.js`.

> A free Cluster can be created at https://www.mongodb.com/cloud/atlas/register

---

## Deploy Slash Commands

Run this after changing or adding slash commands:

```bash
npm run deploy
```

---

## Run the Bot

```bash
npm run start
```

## Requirements

- Node.js 18+
- Discord Bot
- OpenAI API Key or OpenWebUI Server with api access
- MongoDB URI

---

## License

Creative Commons Attribution 4.0