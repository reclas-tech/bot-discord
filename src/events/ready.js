const { Events } = require("discord.js");
const logger = require("../utils/logger");
const config = require("../configs/config");
const { checkTwitter } = require("../services/twitter.services");
const { checkUploads, checkLive } = require("../services/youtube.services");
const cron = require("node-cron");

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        const uploadAnnouncementChannel = await client.channels.fetch(
            config.youtubeUploadAnnouncementChannelId,
        );

        const liveAnnouncementChannel = await client.channels.fetch(
            config.youtubeLiveAnnouncementChannelId,
        );

        async function youtubeAnnouncement() {
            try {
                // Check uploads
                const upload = await checkUploads(
                    config.youtubeApiKey,
                    config.youtubeUploadsPlaylistId,
                );

                if (upload.type === "init") {
                    logger.info(
                        "[YouTube] Initial YouTube upload cache created.",
                    );
                }

                if (upload.type === "empty") {
                    logger.info("[YouTube] Uploads playlist is empty.");
                }

                if (upload.type === "new") {
                    for (const video of upload.videos) {
                        await uploadAnnouncementChannel.send(
                            [
                                "📺 Upload baru!",
                                `**${video.title}**`,
                                `https://youtu.be/${video.id}`,
                            ].join("\n"),
                        );
                    }
                }

                // Check live
                const live = await checkLive(config.youtubeChannelId);

                if (live.type === "new") {
                    await liveAnnouncementChannel.send(
                        [
                            "🔴 LIVE SEKARANG!",
                            `**${live.live.title}**`,
                            live.live.url,
                        ].join("\n"),
                    );
                }

                if (live.type === "ended") {
                    await liveAnnouncementChannel.send(
                        "📴 Live telah selesai.",
                    );
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
        }

        await youtubeAnnouncement();

        setInterval(youtubeAnnouncement, 5 * 60 * 1000);
        cron.schedule("*/5 * * * *", checkTwitter);
    },
};
