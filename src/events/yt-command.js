const { Events } = require("discord.js");
const config = require("../configs/config");
const { checkUploads, checkLive } = require("../services/youtube.services");

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.id !== config.youtubeUploadAnnouncementChannelId) return;

    if (message.content === "!yt") {
      try {
        const upload = await checkUploads(config);
        const live = await checkLive(config);

        if (upload.type === "init") {
          return message.reply("Data awal disimpan.");
        }

        if (upload.type === "no_new" && live.type !== "live") {
          return message.reply("Tidak ada update.");
        }

        if (upload.type === "new") {
          for (const v of upload.videos) {
            await message.channel.send(
              `📺 Upload baru:\n${v.title}\nhttps://youtu.be/${v.id}`
            );
          }
        }

        if (live.type === "live") {
          await message.channel.send(
            `🔴 LIVE!\n${live.title}\nhttps://youtu.be/${live.id}`
          );
        }

      } catch (err) {
        console.error(err);
        await message.reply("Error ambil data YouTube.");
      }
    }
  },
};