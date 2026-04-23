const path = require("path");
const { welcomeChannelId } = require("../configs/config");
const { AttachmentBuilder, EmbedBuilder, Events } = require("discord.js");

const messages = [
    "We're happy to have you here! Say hello to everyone and enjoy the community vibes ✨",
    "Hope you enjoy your stay! Grab some snacks and join the chat 🍿",
    "The community just got better with you here 💙",
    "Make yourself comfy and enjoy the stream vibes ✨",
    "Everyone say hi! A new friend has joined the server 🎉",
    "Welcome to the cozy corner of the internet 🌸",
    "A new adventurer has arrived! Enjoy your journey here ✨",
    "The chat just got more fun with you here! 💫",
    "Sit back, relax, and enjoy the comfy community vibes 💙",
    "Salam Hangat dari gunung yang dingin 🏔️",
];

function getRandomWelcomeMessage() {
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member) {
        console.log(`New member joined: ${member.user.tag}`);
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) return;

        const attachment = new AttachmentBuilder(
            path.join(__dirname, "../assets/sierra_bg.jpg"),
            { name: "sierra_bg.jpg" },
        );

        channel.send({
            content: `✨ Welcome ${member}!`,
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
                        `Welcome to **${member.guild.name}** 💙 ${getRandomWelcomeMessage()}`,
                    )
                    .addFields({
                        name: "Member Count",
                        value: `👥 Member #${member.guild.memberCount}`,
                        inline: true,
                    })
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
