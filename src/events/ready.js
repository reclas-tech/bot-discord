const { Events } = require("discord.js");
const logger = require("../utils/logger");
const config = require("../configs/config");
const { liveMessages } = require("../messages/yt/liveMessages");
const { checkTwitter } = require("../services/twitter.services");
const { shortMessages } = require("../messages/yt/shortMessages");
const { getRandomMessage } = require("../utils/getRandomMessage");
const { uploadMessages } = require("../messages/yt/uploadMessages");
const { checkUploads, checkLive, youtubeAnnouncement } = require("../services/youtube.services");

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {

        logger.info(`Logged in as ${client.user.tag}`);

        await youtubeAnnouncement(client);
        await checkTwitter(client, true);

        setInterval(() => youtubeAnnouncement(client), 1 * 60 * 1000);
        setInterval(() => checkTwitter(client), 60 * 1000);
    },
};
