const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const AWS = require('aws-sdk');

// CONFIG:
const CHANNEL = 'C018WKJ5CHX'; // general
const FOOD_CHANNEL = 'C018J6Q0W4A';
// const CHANNEL = 'C02KY8DAU1L'; // bot_testing

////////////////////

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

module.exports = {
    sendOtherNotifications() {
        (async () => {
            // Send these messages every day
            await web.chat.postMessage({
                text: `Daily gratitude check-in! I'm grateful for:`,
                channel: CHANNEL
            });
            await web.chat.postMessage({
                text: `Daily goals check-in! What do you want to achieve today?`,
                channel: CHANNEL
            });
            await web.chat.postMessage({
                text: `What's for dinner tonight?`,
                channel: FOOD_CHANNEL
            });

            // Send these messages only on the date specified
            const docClient = new AWS.DynamoDB.DocumentClient();
            const date = new Date();
            const value = `${date.getMonth() + 1}/${date.getDate()}`;
            var params = {
                TableName: 'messages',
                IndexName: 'date-index',
                KeyConditionExpression: '#date = :value',
                ExpressionAttributeValues: { ':value': value },
                ExpressionAttributeNames: { '#date': 'date' }
            }

            let data;
            try {
                data = await docClient.query(params).promise();
            } catch (err) {
                console.log(err);
                return err;
            }

            for (const details of data.Items) {
                await web.chat.postMessage({
                    text: `${details.message} <@${details.userId}>`,
                    channel: CHANNEL
                });
            }
        })();
    }
}
