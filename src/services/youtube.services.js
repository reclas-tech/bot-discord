const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("../utils/logger");
const { execFile } = require("child_process");

const filePath = path.join(__dirname, "../database/yt.json");
const ytDlpPath = path.join(__dirname, "../bin/yt-dlp.exe");

// Storage
function getData() {
    const defaultData = {
        videos: [],
        live: {
            current: null,
        },
    };

    if (!fs.existsSync(filePath)) {
        return defaultData;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        return {
            ...defaultData,
            ...parsed,
            live: {
                ...defaultData.live,
                ...parsed.live,
            },
        };
    } catch {
        return defaultData;
    }
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Youtube Api
async function fetchLatest(apiKey, playlistId) {
    const res = await axios.get(
        "https://www.googleapis.com/youtube/v3/playlistItems",
        {
            params: {
                key: apiKey,
                playlistId: playlistId,
                part: "snippet",
                order: "date",
                maxResults: 5,
            },
        },
    );

    return res.data.items || [];
}

// Check Uploads
async function checkUploads(apiKey, playlistId) {
    const items = await fetchLatest(apiKey, playlistId);

    if (!items.length) {
        return { type: "empty" };
    }

    const data = getData();

    if (data.videos.length === 0) {
        data.videos = items
            .map((item) => item.snippet?.resourceId?.videoId)
            .filter(Boolean);

        saveData(data);

        return { type: "init" };
    }

    const newVideos = [];

    for (const item of items) {
        const videoId = item.snippet?.resourceId?.videoId;

        if (!videoId) continue;

        if (!data.videos.includes(videoId)) {
            newVideos.push({
                id: videoId,
                title: item.snippet.title,
                publishedAt: item.snippet.publishedAt,
                thumbnail:
                    item.snippet.thumbnails?.high?.url ||
                    item.snippet.thumbnails?.default?.url,
            });
        }
    }

    if (!newVideos.length) {
        return { type: "no_new" };
    }

    newVideos.reverse();

    for (const video of newVideos) {
        data.videos.unshift(video.id);
    }

    data.videos = data.videos.slice(0, 20);

    saveData(data);

    return {
        type: "new",
        videos: newVideos,
    };
}

// Check Live
async function checkLive(channelId) {
    const data = getData();

    return new Promise((resolve) => {
        execFile(
            ytDlpPath,
            [
                "--flat-playlist",
                "--dump-json",
                "--playlist-end",
                "1",
                "--no-warnings",
                `https://www.youtube.com/channel/${channelId}/live`,
            ],
            { timeout: 10000 },
            (error, stdout, stderr) => {
                const errorMessage = [error?.message || "", stderr || ""].join(
                    "\n",
                );

                if (
                    errorMessage.includes("The channel is not currently live")
                ) {
                    if (data.live.current !== null) {
                        const endedLiveId = data.live.current;

                        data.live.current = null;

                        saveData(data);

                        return resolve({
                            type: "ended",
                            id: endedLiveId,
                        });
                    }

                    return resolve({
                        type: "offline",
                    });
                }

                if (error) {
                    logger.error("[YouTube] Yt-dlp Error:", error);

                    return resolve({
                        type: "error",
                    });
                }

                try {
                    const lines = stdout.trim().split("\n").filter(Boolean);

                    if (!lines.length) {
                        return resolve({
                            type: "offline",
                        });
                    }

                    const liveData = JSON.parse(lines[0]);

                    const live = {
                        id: liveData.id,
                        title: liveData.title,
                        url: `https://youtu.be/${liveData.id}`,
                    };

                    if (data.live.current !== live.id) {
                        data.live.current = live.id;

                        saveData(data);

                        return resolve({
                            type: "new",
                            live,
                        });
                    }

                    return resolve({
                        type: "live",
                        live,
                    });
                } catch (parseError) {
                    logger.error("[YouTube] Parse Error:", parseError);

                    return resolve({
                        type: "error",
                    });
                }
            },
        );
    });
}

module.exports = {
    checkUploads,
    checkLive,
};
