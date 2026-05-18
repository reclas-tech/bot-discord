const axios = require("axios");
const config = require("../configs/config");

async function getUploadsPlaylistId() {
    try {
        const res = await axios.get(
            "https://www.googleapis.com/youtube/v3/channels",
            {
                params: {
                    key: config.youtubeApiKey,
                    id: config.youtubeChannelId,
                    part: "contentDetails",
                },
            },
        );

        const items = res.data.items;

        if (!items || !items.length) {
            console.log("Channel tidak ditemukan");
            return;
        }

        const uploadsPlaylistId =
            items[0].contentDetails.relatedPlaylists.uploads;

        console.log("CHANNEL ID:");
        console.log(config.youtubeChannelId);

        console.log("\nUPLOADS PLAYLIST ID:");
        console.log(uploadsPlaylistId);
    } catch (error) {
        console.error("ERROR:");

        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

getUploadsPlaylistId();
