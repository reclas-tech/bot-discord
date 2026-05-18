const Parser = require("rss-parser");
const logger = require("../utils/logger");
const config = require("../configs/config");

const parser = new Parser();

const getFeedUrl = (username) => `https://nitter.net/${username}/rss`;

let lastPostId = null;

async function checkTwitter(client) {
    const username = config.twitterUsername;
    const channelId = config.twitterChannelId;

    try {
        const feed = await parser.parseURL(getFeedUrl(username));

        logger.info(JSON.stringify(feed));

        if (!feed.items.length) return;

        const latest = feed.items[0];

        const id = latest.link.split("/").pop();

        if (id !== lastPostId) {
            lastPostId = id;

            const channel = await client.channels.fetch(channelId);

            const url = new URL(latest.link);

            await channel.send(`https://x.com${url.pathname}`);
        }
    } catch (err) {
        logger.error(err.message, err);
    }
}

module.exports = {
    checkTwitter,
};
