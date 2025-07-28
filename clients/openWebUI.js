// clients/openWebUI.js
const axios = require('axios');

const apiUrl = process.env.API_URL;
const apiKey = process.env.API_KEY;

const system_prompt = process.env.AI_PROMPT;
class OpenWebUIClient {
    constructor(apiUrl, apiKey, options = {}) {
        if (!apiUrl) throw new Error('API_URL is not defined');
        this.apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        this.apiKey = apiKey;
        this.options = options;
        this.history = {};
    }

    async chatMessage(message) {
        const userId = message.author.id;

        if (!this.history[userId]) {
            this.history[userId] = [
                {
                    role: "system",
                    content: system_prompt
                }
            ];
        }

        this.history[userId].push({
            role: "user",
            content: message.content
        });

        const payload = {
            model: "llama3:8b",
            messages: this.history[userId],
            stream: false
        };

        try {
            const response = await axios.post(`${this.apiUrl}/api/chat/completions`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            const reply = response.data?.choices?.[0]?.message?.content || "No response from AI.";
            this.history[userId].push({ role: "assistant", content: reply });

            await message.reply(reply.substring(0, this.options.maxLength || 2000));
        } catch (error) {
            console.error('OpenWebUI API error:', error.message);
            await message.reply('There was an error communicating with the AI. Please try again later.');
        }
    }
    async getChatResponse(message) {
        const userId = message.author.id;

        if (!this.history[userId]) {
            this.history[userId] = [
                {
                    role: "system",
                    content: system_prompt
                }
            ];
        }

        this.history[userId].push({
            role: "user",
            content: message.content
        });

        const payload = {
            model: "llama3:8b",
            messages: this.history[userId],
            stream: false
        };

        try {
            const response = await axios.post(`${this.apiUrl}/api/chat/completions`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            const reply = response.data?.choices?.[0]?.message?.content || "No response from AI.";
            this.history[userId].push({ role: "assistant", content: reply });
            return reply;
        } catch (error) {
            console.error('OpenWebUI API error:', error.message);
            throw new Error('There was an error communicating with the AI.');
        }
    }
}
const aiClient = new OpenWebUIClient(apiUrl, apiKey, {
    contextRemembering: true,
    responseType: 'embed',
    maxLength: 4000
});

module.exports = { OpenWebUIClient, aiClient };
