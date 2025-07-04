const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    lang: {
        type: String,
        required: true,
        default: 'en',
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    settings: {
        aiRoles: {
            type: [String],
            default: [],
        },
        aiChannel: {
            type: String,
            default: '',
        },
        aiUserChannel: {
            type: [String],
            default: [],
        },
    },
});

module.exports = mongoose.model('Guild', guildSchema);