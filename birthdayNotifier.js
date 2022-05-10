const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const { Client } = require('pg');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing

////////////////////

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

module.exports = {
    sendBirthdayNotification() {
        (async () => {
            const client = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            client.connect();
            let users = await getRows(client);
            for (const user of users) {
                await web.chat.postMessage({
                    text: `Happy birthday <@${user.userid}>! :happy_birthday:`,
                    channel: CHANNEL
                });
            }
        })();
    }
}

async function getRows(client) {
    date = new Date();
    return client
        .query(`SELECT * FROM birthdays where birthday = '${date.getMonth() + 1}/${date.getDate()}';`)
        .then(res => {
            let users = [];
            for (let row of res.rows) {
                users = users.concat(row);
            }
            return users;
        }).finally(() => client.end());
}
