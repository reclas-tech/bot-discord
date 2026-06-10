const path = require("path");
const logger = require("../utils/logger");
const { welcomeChannelId } = require("../configs/config");
const { getRandomMessage } = require("../utils/getRandomMessage");
const { AttachmentBuilder, EmbedBuilder, Events } = require("discord.js");
const { welcomeMessages, firstMessages } = require("../messages/welcome/messages");

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        logger.info(`New member joined: ${member.user.tag}`);
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) return;

        const attachment = new AttachmentBuilder(
            path.join(__dirname, "../assets/sierra_bg.jpg"),
            { name: "sierra_bg.jpg" },
        );

        channel.send({
            content: `${getRandomMessage(firstMessages)} ${member}!`,
            embeds: [
                new EmbedBuilder()
                    .setColor("#5DADE2")
                    .setAuthor({
                        name: `${member.user.username} joined the community`,
                        iconURL: member.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setDescription(
                        `Welcome to **${member.guild.name}** 💙 \n\n ${getRandomMessage(welcomeMessages)}`,
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({ dynamic: true }),
                    )
                    .setTimestamp()
                    .setImage("attachment://sierra_bg.jpg"),
            ],
            files: [attachment],
        });
    },
};
