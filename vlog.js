const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// CONFIG:
// #general-chat ID
const GENERAL_CHANNEL = 'C018WKJ5CHX';
// Controls which channel will receive the message
const CHANNEL = 'C04KNQP01K2'; // vlogs
// const CHANNEL = 'C02KY8DAU1L'; // bot-testing

////////////////////

const NUM_DAYS = 1;
const SECONDS_PER_DAY = 24 * 60 * 60;
const TODAY_IN_SECONDS = new Date().getTime() / 1000;

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;


// Initialize
const web = new WebClient(token);

module.exports = {
    postVlogs() {
        (async () => {
            const dateCutoff = TODAY_IN_SECONDS - (NUM_DAYS * SECONDS_PER_DAY);
            let messageList = await getAllGeneralMessages(dateCutoff);

            for (const message of messageList) {
                if (message.files && message.files[0].media_display_type === 'video') {
                    const details = await web.chat.getPermalink(
                        {
                            channel: GENERAL_CHANNEL,
                            message_ts: message.ts
                        });

                    await web.chat.postMessage({
                        text: `<${details.permalink}|Link>`,
                        channel: CHANNEL,
                        unfurl_links: true
                    });
                }
            }
        })();
    }
}


/**
 * Gets all messages for a given channel ID for the last week
 * The response to this call is paginated, so it could come back with a cursor
 * If so, we have to pass the cursor back in and loop until we reach the last page
 */
async function getAllGeneralMessages(dateCutoff) {
    let result = [];
    const response = await web.conversations.history(
        {
            channel: GENERAL_CHANNEL,
            exclude_archived: true,
            oldest: dateCutoff
        });
    if (response.messages) {
        result = result.concat(response.messages);
        if (response.response_metadata.next_cursor) {
            let cursor = response.response_metadata.next_cursor;
            while (cursor) {
                const response = await web.conversations.history(
                    {
                        channel: GENERAL_CHANNEL,
                        exclude_archived: true,
                        oldest: dateCutoff,
                        cursor
                    });
                result = result.concat(response.messages);
                cursor = response.response_metadata ? response.response_metadata.next_cursor : undefined;
            }
        }
    }
    // order by timestamp, oldest to newest
    return result.sort((m1, m2) => m1.ts - m2.ts);
}
