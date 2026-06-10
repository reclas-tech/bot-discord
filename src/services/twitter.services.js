const fs = require("fs");
const path = require("path");
const Parser = require("rss-parser");
const logger = require("../utils/logger");
const config = require("../configs/config");
const { xPostMessages } = require("../messages/x/xPostMessages");
const { getRandomMessage } = require("../utils/getRandomMessage");

const parser = new Parser();

const getFeedUrl = (username) => `https://nitter.net/${username}/rss`;

const dataFile = path.join(__dirname, "../database/x.json");

function getSavedPosts() {
    try {
        if (!fs.existsSync(dataFile)) {
            fs.writeFileSync(dataFile, JSON.stringify({ posts: [] }, null, 4));
        }

        const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

        return data.posts || [];
    } catch (err) {
        logger.error("Failed to read x.json", err);

        return [];
    }
}

function savePostId(postId) {
    try {
        const posts = getSavedPosts();

        if (posts.includes(postId)) {
            return;
        }

        posts.unshift(postId);

        const limitedPosts = posts.slice(0, 50);

        fs.writeFileSync(
            dataFile,
            JSON.stringify({ posts: limitedPosts }, null, 4),
        );
    } catch (err) {
        logger.error("Failed to save twitter.json", err);
    }
}

async function checkTwitter(client, first = false) {
    const username = config.twitterUsername;
    const channelId = config.twitterChannelId;

    try {
        const feed = await parser.parseURL(getFeedUrl(username));

        // logger.info(JSON.stringify(feed));

        if (!feed.items.length) return;

        const latest = feed.items[0];

        const latestId = latest.guid;

        if (first) {
            savePostId(latestId);
        }

        const savedPosts = getSavedPosts();

        if (savedPosts.includes(latestId)) {
            logger.info("Post already exists");

            return;
        }

        savePostId(latestId);

        const channel = await client.channels.fetch(channelId);

        const url = new URL(latest.link);

        await channel.send(
            `${getRandomMessage(xPostMessages)}\n\nhttps://x.com${url.pathname}`,
        );

        logger.info(`New post sent: ${latestId}`);
    } catch (err) {
        logger.error(err.message, err);
    }
}

module.exports = {
    checkTwitter,
};
