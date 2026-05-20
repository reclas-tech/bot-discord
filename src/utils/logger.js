const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "../logs");

// Create logs directory if doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function getTime() {
    return new Date().toISOString();
}

function getLogFileName() {
    const date = new Date().toISOString().split("T")[0];

    return path.join(logsDir, `${date}.log`);
}

function writeToFile(content) {
    fs.appendFileSync(getLogFileName(), content + "\n");
}

module.exports = {
    info: (msg) => {
        const log = `[INFO] [${getTime()}] ${msg}`;

        console.log(log);
    },

    error: (msg, err = null) => {
        let log = `[ERROR] [${getTime()}] ${msg}`;

        if (err) {
            log += `\n${err.stack || err}`;
        }

        console.error(log);

        writeToFile(log);
    },
};
