const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const birthdayNotifier = require('./birthdayNotifier.js');
const summarizer = require('./summarize.js');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing
// const BOOKS = 'C01BGEWM68H';

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

                // Script starts up every day, but only run weekly summary on Sundays
                if (date.getDay() === 0) {
                    summarizer.summarize();
                } else {
                    console.log('Skipping weekly summary - only run on Sundays');
                }



                // book messages - TODO add for last day of each month
    //            await web.chat.postMessage({
    //                text: `What did you read in September?`,
    //                channel: BOOKS
    //            });
    //            await web.chat.postMessage({
    //                text: `Book of the month thread for September!`,
    //                channel: BOOKS
    //            });
            })();
//    callback(null, response);
};



