const { Events } = require("discord.js");
const config = require("../configs/config");
const { checkTwitter } = require("../services/twitter.services");
const { checkUploads, checkLive } = require("../services/youtube.services");

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        console.log(`Logged in as ${client.user.tag}`);

        async function youtubeAnnouncement() {
            try {
                const upload = await checkUploads(config);
                const live = await checkLive(config);

                const channel = await client.channels.fetch(
                    config.youtubeUploadAnnouncementChannelId,
                );

                if (!channel) return;

                if (upload.type === "new") {
                    for (const v of upload.videos) {
                        await channel.send(
                            `📺 Upload baru:\n${v.title}\nhttps://youtu.be/${v.id}`,
                        );
                    }
                }

                if (live.type === "live") {
                    await channel.send(
                        `🔴 LIVE MULAI!\n${live.title}\nhttps://youtu.be/${live.id}`,
                    );
                }
            } catch (err) {
                console.error("Scheduler error:", err.message);
            }
        }

        youtubeAnnouncement();

        setInterval(youtubeAnnouncement, 5 * 60 * 1000);
        cron.schedule("*/5 * * * *", checkTwitter);
    },
};
