const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("../utils/logger");
const config = require("../configs/config");
const { execFile } = require("child_process");
const { liveMessages } = require("../messages/yt/liveMessages");
const { getRandomMessage } = require("../utils/getRandomMessage");
const { shortMessages } = require("../messages/yt/shortMessages");
const { uploadMessages } = require("../messages/yt/uploadMessages");
const { upcomingMessages } = require("../messages/yt/upcomingMessages");

const filePath = path.join(__dirname, "../database/yt.json");
const ytDlpPath = path.join(__dirname, "../bin/yt-dlp.exe");

// Storage
function getData() {
    const defaultData = {
        videos: [],
        live: {
            current: null,
        },
        upcoming: {
            streams: [],
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
            upcoming: {
                ...defaultData.upcoming,
                ...parsed.upcoming,
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
                maxResults: 5,
            },
        },
    );

    return res.data.items || [];
}

// Check Short
async function checkShort(videoId) {
    return new Promise((resolve) => {
        execFile(
            ytDlpPath,
            ["--dump-json", "--no-warnings", `https://youtu.be/${videoId}`],
            { timeout: 10000 },
            (error, stdout) => {
                if (error || !stdout) {
                    return resolve(false);
                }

                try {
                    const data = JSON.parse(stdout);

                    const url = data.webpage_url || data.original_url || "";
                    const media_type = data.media_type || "";
                    resolve(url.includes("/shorts/") || media_type === "short");
                } catch {
                    resolve(false);
                }
            },
        );
    });
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
            const isShort = await checkShort(videoId);
            newVideos.push({
                id: videoId,
                title: item.snippet.title,
                publishedAt: item.snippet.publishedAt,
                thumbnail:
                    item.snippet.thumbnails?.high?.url ||
                    item.snippet.thumbnails?.default?.url,
                isShort,
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

                // Waiting room
                if (errorMessage.includes("This live event will begin")) {
                    return resolve({
                        type: "upcoming",
                    });
                }

                // Offline
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

                // Unexpected yt-dlp error
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

                        data.upcoming.streams = data.upcoming.streams.filter(
                            (id) => id !== live.id,
                        );

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

async function getUpcomingInfo(videoId) {
    return new Promise((resolve) => {
        execFile(
            ytDlpPath,
            [
                "--dump-json",
                "--no-warnings",
                `https://www.youtube.com/watch?v=${videoId}`,
            ],
            { timeout: 30000 },
            (error, stdout, stderr) => {
                const match = stderr.match(
                    /This live event will begin in (.+?)\./,
                );

                resolve({
                    beginIn: match ? match[1] : null,
                });
            },
        );
    });
}

function beginInToTimestamp(beginIn) {
    if (!beginIn) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);

    const dayMatch = beginIn.match(/(\d+)\s+days?/i);
    if (dayMatch) {
        return now + Number(dayMatch[1]) * 86400;
    }

    const hourMatch = beginIn.match(/(\d+)\s+hours?/i);
    if (hourMatch) {
        return now + Number(hourMatch[1]) * 3600;
    }

    const minuteMatch = beginIn.match(/(\d+)\s+minutes?/i);
    if (minuteMatch) {
        return now + Number(minuteMatch[1]) * 60;
    }

    return null;
}

// Check Upcoming
async function checkUpcoming(channelId) {
    const data = getData();

    return new Promise((resolve) => {
        execFile(
            ytDlpPath,
            [
                "--flat-playlist",
                "--dump-json",
                "--playlist-end",
                "20",
                "--no-warnings",
                `https://www.youtube.com/channel/${channelId}/streams`,
            ],
            { timeout: 30000 },
            async (error, stdout) => {
                if (error || !stdout) {
                    return resolve({
                        type: "none",
                        streams: [],
                    });
                }

                try {
                    const streams = stdout
                        .trim()
                        .split("\n")
                        .filter(Boolean)
                        .map((line) => JSON.parse(line));

                    const upcomingStreams = streams.filter(
                        (stream) =>
                            stream.duration === null &&
                            !data.upcoming.streams.includes(stream.id),
                    );

                    const newUpcoming = await Promise.all(
                        upcomingStreams.map(async (stream) => {
                            const info = await getUpcomingInfo(stream.id);

                            return {
                                id: stream.id,
                                title: stream.title,
                                url: stream.url,
                                beginIn: info.beginIn,
                            };
                        }),
                    );

                    for (const stream of newUpcoming) {
                        data.upcoming.streams.push(stream.id);
                    }

                    data.upcoming.streams = data.upcoming.streams.slice(-100);

                    saveData(data);

                    return resolve({
                        type: newUpcoming.length > 0 ? "new" : "none",
                        streams: newUpcoming,
                    });
                } catch (err) {
                    logger.error("[YouTube] Upcoming Parse Error:", err);

                    return resolve({
                        type: "error",
                        streams: [],
                    });
                }
            },
        );
    });
}

async function youtubeAnnouncement(client) {
    const uploadAnnouncementChannel = await client.channels.fetch(
        config.youtubeUploadAnnouncementChannelId,
    );

    const liveAnnouncementChannel = await client.channels.fetch(
        config.youtubeLiveAnnouncementChannelId,
    );

    const shortAnnouncementChannel = await client.channels.fetch(
        config.youtubeShortAnnouncementChannelId,
    );

    try {
        // Check uploads
        const upload = await checkUploads(
            config.youtubeApiKey,
            config.youtubeUploadsPlaylistId,
        );

        if (upload.type === "init") {
            logger.info("[YouTube] Initial YouTube upload cache created.");
        }

        if (upload.type === "empty") {
            logger.info("[YouTube] Uploads playlist is empty.");
        }

        if (upload.type === "new") {
            for (const video of upload.videos) {
                if (video.isShort) {
                    await shortAnnouncementChannel.send(
                        [
                            getRandomMessage(shortMessages),
                            `**${video.title}**`,
                            `https://youtube.com/shorts/${video.id}`,
                        ].join("\n"),
                    );
                } else {
                    await uploadAnnouncementChannel.send(
                        [
                            getRandomMessage(uploadMessages),
                            `**${video.title}**`,
                            `https://youtu.be/${video.id}`,
                        ].join("\n"),
                    );
                }
            }
        }

        // Check upcoming
        const upcoming = await checkUpcoming(config.youtubeChannelId);

        if (upcoming.type === "new") {
            for (const stream of upcoming.streams) {
                const timestamp = beginInToTimestamp(stream.beginIn);

                const date = timestamp
                    ? `<t:${timestamp}:F>`
                    : stream.beginIn
                      ? `Mulai dalam ${stream.beginIn}`
                      : "Jadwal belum diketahui";

                await liveAnnouncementChannel.send(
                    [
                        getRandomMessage(upcomingMessages),
                        `**${stream.title}**`,
                        date,
                        stream.url,
                    ].join("\n"),
                );
            }
        }

        // Check live
        const live = await checkLive(config.youtubeChannelId);

        if (live.type === "new") {
            await liveAnnouncementChannel.send(
                [
                    getRandomMessage(liveMessages),
                    `**${live.live.title}**`,
                    live.live.url,
                ].join("\n"),
            );
        }

        if (live.type === "ended") {
            logger.info("[YouTube] Live stream has ended.");
            // await liveAnnouncementChannel.send(
            //     "📴 Live telah selesai.",
            // );
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

module.exports = {
    checkUploads,
    checkLive,
    checkUpcoming,
    youtubeAnnouncement,
};
