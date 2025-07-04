// clients/chatGPTClient.js
const { EmbedBuilder, Colors, Message, ChatInputCommandInteraction } = require('discord.js');
const apiKey = process.env.API_KEY;
const name = process.env.OPEN_AI_NAME;
const logo = process.env.OPEN_AI_LOGO;
const url = process.env.OPEN_AI_URL;

/**
 * Class for creating a Discord.JS ChatGPTClient.
 */
class ChatGPTClient {
  contextData = new Map();
  apiClient = null;
  options = {};

  /**
   * @param {string} openAIAPIKey Your OpenAI API Key.
   * @param {{contextRemembering:boolean, responseType: 'embed' | 'string', maxLength:number}} options `.contextRemembering` Whether to keep track of ongoing conversations for each user.
   */
  constructor(openAIAPIKey, options) {
    if (!openAIAPIKey) throw new TypeError("An OpenAI API key must be provided. Create an OpenAI account and get an API key at https://platform.openai.com/account/api-keys");

    const optionDefaults = {
      contextRemembering: true,
      responseType: 'embed',
      maxLength: 2000
    };

    this.options = Object.assign(optionDefaults, options);
    import('chatgpt').then(function(lib) {
      const { ChatGPTAPI } = lib;

      
      this.apiClient = new ChatGPTAPI({
        apiKey: openAIAPIKey
      });
      
    }.bind(this));
  }

  /**
   * Sends the chat API a message and returns the response.
   * @param {string} message The message to send.
   * @param {string} id The chat id if providing context.
   * @returns {object}
   */
  async send(message, id) {
    try {
      if (!this.apiClient) throw new TypeError("ChatGPT client failed to initialize");
      const response = await this.apiClient.sendMessage(message, { 
        parentMessageId:id
      });
      return response;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Deletes an existing conversation.
   * @param {string} userId The ID of the Discord user.
   */
  forgetContext(userId) {
    if (this.options.contextRemembering) this.contextData.delete(userId);
  }

  /**
   * Send a message to chat through a `Message`.
   * @param {Message} message The message object.
   * @param {string} str The content to send the API.
   */
	async chatMessage(message, str) {
	  const context = this.contextData.get(message.author.id);
	  const response = await message.reply({
		content: '⌛'
	  });

	  const reply = await this.send(str || message.content, this.options.contextRemembering && context ? context : undefined);
	  await response.delete().catch(_ => null);

	  if (this.options.responseType === 'string') {
		await message.reply(reply.text);
	  } else {
		const embed = new EmbedBuilder()
		  .setColor(Colors.DarkerGrey)
		  .setDescription(reply.text)
		  .setAuthor({
			iconURL: logo,
			url: url,
			name: name
		  });

		await message.reply({
		  content: undefined, // Fix typo 'cotent' to 'content'
		  embeds: [embed]
		});
	  }

	  if (this.options.contextRemembering) {
		this.contextData.set(message.author.id, reply.id); // Fix 'interaction.user.id' to 'message.author.id'
	  }
	}

  /**
   * Send a message to chat through a Slash Command.
   * @param {ChatInputCommandInteraction} interaction The interaction object.
   * @param {string} str The content to send the API.
   */
  async chatInteraction(interaction, str) {
    if (!interaction.deferred) await interaction.deferReply();
    
    const context = this.contextData.get(interaction.user.id);
    const reply = await this.send(str, this.options.contextRemembering && context ? context : undefined);

    if (this.options.responseType === 'string') {
      await interaction.editReply(reply.text);
    } else {
      const embed = new EmbedBuilder()
        .setColor(Colors.DarkerGrey)
        .addFields(
          { name: 'Input', value: str },
          { name: 'Response', value: reply.text.length > 1024 ? reply.text.slice(0, 1021) + '...' : reply.text}
        )
        .setAuthor({
          iconURL: logo,
          url: url,
          name: name
        })
        
      await interaction.editReply({
        embeds: [embed]
      });
    }

    if (this.options.contextRemembering) {
      this.contextData.set(interaction.user.id, reply.id);
    }
  }
}
const chatgpt = new ChatGPTClient(apiKey, {
  contextRemembering: true,
  responseType: 'embed',
  maxLength: 2000,
});

module.exports = {
  ChatGPTClient,
  chatgpt
}