const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const AWS = require('aws-sdk');

// CONFIG:
const BOOKS = 'C01BGEWM68H'; // books
// const BOOKS = 'C02KY8DAU1L'; // bot_testing

////////////////////

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);
const docClient = new AWS.DynamoDB.DocumentClient();
const date = new Date();

module.exports = {
    postBooksMessages() {
        (async () => {
            // At the beginning of the month, send the initial book-of-the-month thread and store the thread ID
            if (isFirstDayOfMonth(date)) {
                const monthName = date.toLocaleString('default', { month: 'long' });
                const bookDetails = await getBookDetails(monthName);

                const messageText =
                    `The book of the month for ${monthName} is ${bookDetails.bookName} by ${bookDetails.bookAuthor}. `
                    + `Post your thoughts in this thread!`

                const messageResult = await web.chat.postMessage({
                    text: messageText,
                    channel: BOOKS
                });

                await persistThreadId(monthName, messageResult.ts);
            }
            // At the end of the month, send monthly checkin and post another message to the book-of-the-month thread
            if (isLastDayOfMonth(date)) {
                const monthName = date.toLocaleString('default', { month: 'long' });
                const bookDetails = await getBookDetails(monthName);

                await web.chat.postMessage({
                    text: `What did you read in ${monthName}?`,
                    channel: BOOKS
                });
                await web.chat.postMessage({
                    text: `Share your thoughts here for ${monthName}'s book of the month, ${bookDetails.bookName}!`,
                    channel: BOOKS,
                    thread_ts: bookDetails.threadTs,
                    reply_broadcast: true
                });
            }
        })();
    }
}

/**
 * Given date is last day of month if tomorrow is the 1st
 */
function isLastDayOfMonth(date) {
    const oneMoreDay = new Date(date.getTime() + 24*60*60*1000);
    return oneMoreDay.getDate() === 1;
}

/**
 * Check if given date is the 1st
 */
function isFirstDayOfMonth(date) {
    return date.getDate() === 1;
}

/**
 * Retrieve book details for given month
 */
async function getBookDetails(monthName) {
    var params = {
        TableName: 'books',
        KeyConditionExpression: '#month = :value',
        ExpressionAttributeValues: { ':value': monthName },
        ExpressionAttributeNames: { '#month': 'month' }
    }

    let data;
    try {
        data = await docClient.query(params).promise();
    } catch (err) {
        console.log(err);
        return err;
    }

    return data.Items[0];
}

/**
 * Persist the thread ID for the book-of-the-month
 * so it can be used to re-post at the end of the month
 */
async function persistThreadId(monthName, threadTs) {
    var params = {
        TableName: 'books',
        Key: { month : monthName },
        UpdateExpression: 'set #threadTs = :threadTs',
        ExpressionAttributeNames: {'#threadTs' : 'threadTs'},
        ExpressionAttributeValues: {
            ':threadTs' : threadTs
        }
    }
    await docClient.update(params).promise();
}

