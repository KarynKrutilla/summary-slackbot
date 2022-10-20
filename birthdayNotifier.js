const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const { Client } = require('pg');
const AWS = require('aws-sdk');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing

////////////////////

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

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

module.exports = {
    sendBirthdayNotification() {
        (async () => {
            const docClient = new AWS.DynamoDB.DocumentClient();
            const date = new Date();
            const value = `${date.getMonth() + 1}/${date.getDate()}`;
            console.log(value);
            var params = {
              TableName: 'birthdays',
              IndexName: 'birthday-index',
              KeyConditionExpression: '#birthday = :value',
              ExpressionAttributeValues: { ':value': value },
              ExpressionAttributeNames: { '#birthday': 'birthday' }
            }

            let data;
            try {
                data = await docClient.query(params).promise();
            } catch (err) {
                console.log(err);
                return err;
            }

            for (const user of data.Items) {
                const random_emoji = emoji_list[Math.floor(Math.random() * emoji_list.length)];

                // Children are in the db with ID parentId-0
                // So we know which message to use based on whether ID contains '-'
                const split = user.id.split('-');
                const userId = split[0];
                if (split.length === 1) { // parent
                    await web.chat.postMessage({
                        text: `Happy birthday <@${userId}>! ${random_emoji}`,
                        channel: CHANNEL
                    });
                } else { // child
                    const age = getAge(user.birth_year);
                    await web.chat.postMessage({
                        text: `Happy ${age} birthday ${user.name}! ${random_emoji} (<@${userId}>)`,
                        channel: CHANNEL
                    });
                }
            }
        })();
    }
}

function getAge(birth_year) {
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
