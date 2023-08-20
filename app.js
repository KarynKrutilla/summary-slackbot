const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const birthdayNotifier = require('./birthdayNotifier.js');
const summarizer = require('./summarize.js');
const vlogger = require('./vlog');
const booksNotifier = require('./books');
const otherNotifications = require('./otherNotifications');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);
const date = new Date();

exports.handler = (event, context, callback) => {
    (async () => {

        otherNotifications.sendOtherNotifications();
        birthdayNotifier.sendBirthdayNotification();
        vlogger.postVlogs();
        booksNotifier.postBooksMessages();

        // Script starts up every day, but only run weekly summary on Sundays
        if (isSunday(date)) {
            summarizer.summarize();
        } else {
            console.log('Skipping weekly summary - only run on Sundays');
        }

    })();
//    callback(null, response);
};

function isSunday(date) {
    return date.getDay() === 0;
}
