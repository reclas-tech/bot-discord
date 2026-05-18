require("dotenv").config();

module.exports = {
    botToken: process.env.DISCORD_BOT_TOKEN,
    welcomeChannelId: process.env.DISCORD_WELCOME_CHANNEL_ID,
    youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID,
    youtubeUploadsPlaylistId: process.env.YOUTUBE_UPLOADS_PLAYLIST_ID,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    youtubeUploadAnnouncementChannelId:
        process.env.DISCORD_YOUTUBE_UPLOAD_ANNOUNCEMENT_CHANNEL_ID,
    youtubeLiveAnnouncementChannelId:
        process.env.DISCORD_YOUTUBE_LIVE_ANNOUNCEMENT_CHANNEL_ID,
    twitterUsername: process.env.TWITTER_USERNAME,
    twitterChannelId: process.env.DISCORD_TWITTER_CHANNEL_ID,
};
