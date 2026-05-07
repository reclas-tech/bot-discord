const { Events } = require("discord.js");

const config = require("../configs/config");

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
                console.log("Initial YouTube upload cache created.");
            }

            if (upload.type === "empty") {
                console.log("Uploads playlist is empty.");
            }

            if (upload.type === "new") {
                for (const video of upload.videos) {
                    await message.channel.send(
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
                await message.channel.send(
                    [
                        "🔴 LIVE SEKARANG!",
                        `**${live.live.title}**`,
                        live.live.url,
                    ].join("\n"),
                );
            }

            if (live.type === "ended") {
                await message.channel.send("📴 Live telah selesai.");
            }

            // No updates
            if (
                upload.type === "no_new" &&
                (live.type === "offline" || live.type === "live")
            ) {
                console.log("[YouTube] No new updates.");
            }
        } catch (error) {
            console.error("[YouTube Announcement Error]");

            console.error(error);
        }
    },
};
