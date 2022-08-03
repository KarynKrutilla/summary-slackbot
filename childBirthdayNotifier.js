const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const { Client } = require('pg');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
//const CHANNEL = 'C02KY8DAU1L'; // bot_testing

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
            const emoji_list = [
                ':birthday:',
                ':birthday-banner:',
                ':happy_birthday:',
                ':happy_birthday2:',
                ':birthday-hat-circle:',
                ':happy-birthday:',
                ':partying_face:',
                ':party-parrot:',
                ':birthday_party_parrot:',
                ':party_blob:',
                ':confetti_ball:',
                ':meow_birthday:',
                ':birthday-dancer:',
                ':birthdayparty_kirby:'
        ];
            for (const user of users) {
                const age = getAge(user);
                const random_emoji = emoji_list[Math.floor(Math.random() * emoji_list.length)];
                await web.chat.postMessage({
                    text: `Happy ${age} birthday ${user.child_name}! ${random_emoji} (<@${user.userid}>)`,
                    channel: CHANNEL
                });
            }
        })();
    }
}

async function getRows(client) {
    const date = new Date();
    return client
        .query(`SELECT * FROM child_birthdays WHERE birthday LIKE '${date.getMonth() + 1}/${date.getDate()}/%';`)
        .then(res => {
            let users = [];
            for (let row of res.rows) {
                users = users.concat(row);
            }
            return users;
        }).finally(() => client.end());
}

function getAge(user) {
    const birth_year = user.birthday.split('/')[2];
    const date = new Date();
    let age = date.getFullYear() - birth_year;

    const j = age % 10;
    const k = age % 100;
    if (j == 1 && k != 11) {
        return age + "st";
    }
    if (j == 2 && k != 12) {
        return age + "nd";
    }
    if (j == 3 && k != 13) {
        return age + "rd";
    }
    return age + "th";
}
