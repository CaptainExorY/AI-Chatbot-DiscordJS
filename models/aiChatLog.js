const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    authorId: String,
    authorName: String,
    content: String,
    timestamp: Date
});

const AiChatLogSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    chatId: String,
    channelId: String,
    channelName: String,
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AiChatLog', AiChatLogSchema);
