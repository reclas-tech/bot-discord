const fs = require("fs");
const path = require("path");
const axios = require("axios");

const filePath = path.join(__dirname, "../database/yt.json");

// ===== STORAGE =====
function getData() {
  if (!fs.existsSync(filePath)) {
    return { videos: [], live: { current: null } };
  }

  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return { videos: [], live: { current: null } };
  }
}

function saveData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function fetchLatest(config) {
  const res = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        key: config.youtubeApiKey,
        channelId: config.youtubeChannelId,
        part: "snippet",
        order: "date",
        maxResults: 3,
        type: "video",
      },
    }
  );

  return res.data.items || [];
}

async function fetchLiveCandidate(config) {
  const res = await axios.get(
    "https://www.googleapis.com/youtube/v3/search",
    {
      params: {
        key: config.youtubeApiKey,
        channelId: config.youtubeChannelId,
        part: "snippet",
        eventType: "live",
        type: "video",
        maxResults: 1,
      },
    }
  );

  return res.data.items[0];
}

async function validateLive(config, videoId) {
  const res = await axios.get(
    "https://www.googleapis.com/youtube/v3/videos",
    {
      params: {
        key: config.youtubeApiKey,
        id: videoId,
        part: "snippet",
      },
    }
  );

  const video = res.data.items[0];
  if (!video) return false;

  return video.snippet.liveBroadcastContent === "live";
}

async function checkUploads(config) {
  const items = await fetchLatest(config);
  if (!items.length) return { type: "empty" };

  const data = getData();
  const newVideos = [];

  for (const item of items) {
    const id = item.id.videoId;
    if (!id) continue;

    if (!data.videos.includes(id)) {
      newVideos.push({
        id,
        title: item.snippet.title,
      });
    }
  }

  if (data.videos.length === 0) {
    data.videos = items.map(i => i.id.videoId).filter(Boolean);
    saveData(data);
    return { type: "init" };
  }

  if (!newVideos.length) return { type: "no_new" };

  newVideos.reverse();

  for (const v of newVideos) {
    data.videos.unshift(v.id);
  }

  data.videos = data.videos.slice(0, 10);
  saveData(data);

  return { type: "new", videos: newVideos };
}

async function checkLive(config) {
  const data = getData();

  const candidate = await fetchLiveCandidate(config);
  if (!candidate) {
    data.live.current = null;
    saveData(data);
    return { type: "none" };
  }

  const status = candidate.snippet.liveBroadcastContent;

  if (status === "none") {
    data.live.current = null;
    saveData(data);
    return { type: "none" };
  }

  const videoId = candidate.id.videoId;

  const isLive = await validateLive(config, videoId);
  if (!isLive) return { type: "none" };

  if (data.live.current === videoId) {
    return { type: "no_change" };
  }

  data.live.current = videoId;
  saveData(data);

  return {
    type: "live",
    id: videoId,
    title: candidate.snippet.title,
  };
}

module.exports = {
  checkUploads,
  checkLive,
};