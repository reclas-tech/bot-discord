const { Events } = require("discord.js");
const logger = require("../utils/logger");
const config = require("../configs/config");
const { liveMessages } = require("../messages/yt/liveMessages");
const { shortMessages } = require("../messages/yt/shortMessages");
const { uploadMessages } = require("../messages/yt/uploadMessages");
const { getRandomMessage } = require("../utils/getRandomMessage");
const { checkUploads, checkLive } = require("../services/youtube.services");

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        if (message.channel.id !== config.youtubeUploadAnnouncementChannelId) {
            return;
        }

        if (message.content !== "!yt") return;

        try {
            // Check uploads
            const upload = await checkUploads(
                config.youtubeApiKey,
                config.youtubeUploadsPlaylistId,
            );

            if (upload.type === "init") {
                logger.info("[YouTube] Initial YouTube upload cache created.");
            }

            if (upload.type === "empty") {
                logger.info("[YouTube] Uploads playlist is empty.");
            }

            if (upload.type === "new") {
                for (const video of upload.videos) {
                    await message.channel.send(
                        [
                            video.isShort ? getRandomMessage(shortMessages) : getRandomMessage(uploadMessages),
                            `**${video.title}**`,
                            video.isShort ? `https://youtu.be/shorts/${video.id}` : `https://youtu.be/${video.id}`,
                        ].join("\n"),
                    );
                }
            }

            // Check live
            const live = await checkLive(config.youtubeChannelId);

            if (live.type === "new") {
                await message.channel.send(
                    [
                        getRandomMessage(liveMessages),
                        `**${live.live.title}**`,
                        live.live.url,
                    ].join("\n"),
                );
            }

            if (live.type === "ended") {
                logger.info("[YouTube] Live stream has ended.");
                // await message.channel.send("📴 Live telah selesai.");
            }

            // No updates
            if (
                upload.type === "no_new" &&
                (live.type === "offline" || live.type === "live")
            ) {
                logger.info("[YouTube] No new updates.");
            }
        } catch (error) {
            logger.error("[YouTube] YouTube announcement error:", error);
        }
    },
};
