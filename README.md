
# Discord AI Chatbot

This is a powerful and extensible Discord AI chatbot supporting both OpenAI and OpenWebUI backends. It offers public and private conversational AI channels with per-guild configuration and transcript logging.

## 🧠 Features

* Conversational AI chat powered by OpenAI or OpenWebUI
* `/aichat setup` to configure channel and required roles
* `/aichat create` creates a private AI chat channel
* `/aichat close` deletes the channel and sends a full transcript via DM
* Role-based access control
* HTML transcript generation
* Optional pre-built binaries (no Node.js required)

---

## 🛠 Setup (with Node.js)

### 1. Clone the repository

```bash
git clone https://github.com/CaptainExorY/AI-Chatbot-DiscordJS.git
cd AI-Chatbot-DiscordJS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example and fill in the values:

```bash
cp .env.example .env
```

**Required environment variables:**

```env
TOKEN=your-discord-bot-token
CLIENT_ID=your-discord-application-id
GUILD_ID=optional-guild-id-for-dev-commands
OPEN_AI=true/false           # Setting for what AI Interface to use
OPENAI_API_KEY=sk-...        # Optional if using OpenAI
OPENWEBUI_API=http://...     # Optional if using OpenWebUI
```

You can use either `OPENAI_API_KEY` or `OPENWEBUI_API`, depending on the backend you want.

---

## ⚙️ Commands

### `/aichat setup`

Configure the public AI channel and the required role to access it:

```bash
/aichat setup aichannel:#ai-chat airoles:@AI-Access
```

### `/aichat create`

Creates a private text channel just for you and the AI.

* Optional: Choose a model like `llama3`, `vicuna`, or `mistral`
* The bot checks if you already have a channel and prevents duplicates

Once created, the bot sends a welcome message and adds a **Close Chat** button.

### `/aichat close`

Closes your private AI channel. Upon closing:

* The channel is deleted
* You receive a DM with an **HTML transcript** of the conversation

---

## 🧩 Architecture

```
.
├── commands/ai/aichat.js          # Main command logic with setup/create/close
├── clients/chatGPTClient.js       # OpenAI backend
├── clients/openWebUI.js           # OpenWebUI backend
├── handlers/aiMessageCreate.js    # Handles message input
├── models/guildModel.js           # Guild config and settings
├── models/aiChatLog.js            # Logging conversation history
├── patches/discordjs-ws-index.js  # WebSocket patch for Discord.js
├── status.json                    # Bot runtime state
└── deploy-commands.js             # Registers slash commands
```

---

## 🚀 Deploying Commands

To register or refresh your slash commands:

```bash
node deploy-commands.js or npm run deploy
```

---

## 🖥️ Running Without Node.js

If you don’t want to install Node.js, pre-built binaries (if provided) can be used:

* `./discord-bot-linux`
* `discord-bot-win.exe`
* `./discord-bot-macos`

Just make sure the `.env` and `status.json` files are correctly configured before launching the binary.

You can also create your own binaries using [`pkg`](https://github.com/vercel/pkg):

```bash
npm install -g pkg
pkg .
```

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## 🙋 Support

Need help? Open an issue or contact the project maintainer or join my [Discord Server](https://discord.gg/GSXHksYbhG)

