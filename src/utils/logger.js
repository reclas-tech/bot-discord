module.exports = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg, err) => {
        console.error(`[ERROR] ${msg}`);
        if (err) console.error(err);
    },
};
