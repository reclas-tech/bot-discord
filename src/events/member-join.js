const { Events } = require("discord.js");
const logger = require("../utils/logger");
const { welcomeChannelId } = require("../configs/config");

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(client) {
        try {
            const channel = client.guild.channels.cache.get(welcomeChannelId);

            if (!channel || !channel.isTextBased()) {
                return logger.error("Welcome channel not found or invalid");
            }

            await channel.send({
                content: `👋 Welcome ${client}!`,
                embeds: [
                    {
                        title: "Welcome to the server!",
                        description: `Hey ${client}, we're glad you joined **${client.guild.name}** 🎉`,
                        color: 0x5865f2,
                        thumbnail: {
                            url: client.user.displayAvatarURL(),
                        },
                        footer: {
                            text: `Member #${client.guild.memberCount}`,
                        },
                        timestamp: new Date(),
                    },
                ],
            });
        } catch (error) {
            logger.error("Error in member-join event", error);
        }
    },
};
