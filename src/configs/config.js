require("dotenv").config();

module.exports = {
    botToken: process.env.DISCORD_BOT_TOKEN,
    welcomeChannelId: process.env.DISCORD_WELCOME_CHANNEL_ID,
};
