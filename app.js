const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const birthdayNotifier = require('./birthdayNotifier.js');
const summarizer = require('./summarize.js');
const vlogger = require('./vlog');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing
const BOOKS = 'C01BGEWM68H'; // books
// const BOOKS = 'C02KY8DAU1L'; // bot_testing

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);
const date = new Date();

exports.handler = (event, context, callback) => {
    (async () => {

        await web.chat.postMessage({
            text: `Daily gratitude check-in! I'm grateful for:`,
            channel: CHANNEL
        });
        await web.chat.postMessage({
            text: `Daily goals check-in! What do you want to achieve today?`,
            channel: CHANNEL
        });

        birthdayNotifier.sendBirthdayNotification();
        vlogger.postVlogs();

        // Script starts up every day, but only run weekly summary on Sundays
        if (isSunday(date)) {
            summarizer.summarize();
        } else {
            console.log('Skipping weekly summary - only run on Sundays');
        }

        // Script starts up every day, but only send book messages on last day of the month
        if (isLastDayOfMonth(date)) {
            const monthName = date.toLocaleString('default', { month: 'long' });
            await web.chat.postMessage({
                text: `What did you read in ${monthName}?`,
                channel: BOOKS
            });
            await web.chat.postMessage({
                text: `Book of the month thread for ${monthName}!`,
                channel: BOOKS
            });
        } else {
             console.log('Skipping books messages - only send on last day of month');
        }
    })();
//    callback(null, response);
};


/**
* Given date is last day of month if tomorrow is the 1st
*/
function isLastDayOfMonth(date) {
    const oneMoreDay = new Date(date.getTime() + 24*60*60*1000);
    return oneMoreDay.getDate() === 1;
}

function isSunday(date) {
    return date.getDay() === 0;
}
