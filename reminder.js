const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing

////////////////////

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

module.exports = {
    sendWaterReminder() {
        (async () => {
//            await web.chat.postMessage({
//                text: `Remember to drink water today! :water_cup:`,
//                channel: CHANNEL
//            });
            await web.chat.postMessage({
                text: `Daily gratitude check-in! I'm grateful for:`,
                channel: CHANNEL
            });
        })();
    }
}
