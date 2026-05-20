const axios = require("axios");
const logger = require("./logger");
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
            logger.info("Channel tidak ditemukan");
            return;
        }

        const uploadsPlaylistId =
            items[0].contentDetails.relatedPlaylists.uploads;

        logger.info("CHANNEL ID:");
        logger.info(config.youtubeChannelId);

        logger.info("\nUPLOADS PLAYLIST ID:");
        logger.info(uploadsPlaylistId);
    } catch (error) {
        logger.error("ERROR:");

        if (error.response) {
            logger.error(error.response.data);
        } else {
            logger.error(error.message);
        }
    }
}

getUploadsPlaylistId();
