const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// CONFIG:
// Controls how we score each post to pick the most popular
const REACTION_WEIGHT = 1;
const REPLY_WEIGHT = 3;
// Controls how far back we look
const NUM_DAYS = 7;
// Controls which channel will receive the message
const CHANNEL = 'tldr';
// Controls which channels to intentionally ignore
const CHANNELS_TO_IGNORE = ['tldr','summary_bot_testing']

////////////////////

const SECONDS_PER_DAY = 24 * 60 * 60;
const TODAY_IN_SECONDS = new Date().getTime() / 1000;
const DATE_CUTOFF = TODAY_IN_SECONDS - (NUM_DAYS * SECONDS_PER_DAY);

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

(async () => {
    const allChannels = await getAllChannels();
    let messageList = [];

    // Loop over all channels
    for (const currentChannel of allChannels) {
        let channelMessages;
        try {
            channelMessages = await getAllMessagesByChannel(currentChannel.id);
        } catch (error) {
            // We only want to summarize channels that opted into using this bot
            // All other channels will throw an error
            // Looping over all channels and catching the error is easier for the workspace to control than storing a list here
            if (error.data.error === 'not_in_channel') {
                console.log(`Bot not added to channel ${currentChannel.name}, continuing...`);
                continue;
            } else {
                console.error(error);
                throw error;
            }
        }
        for (const message of channelMessages) {
            const numReplies = message.reply_count ? message.reply_count : 0;
            const numReactions = message.reactions ? message.reactions.map(reaction => reaction.count).reduce((a, b) => a + b) : 0;

            messageList.push({
                ...message,
                // Needed later when fetching permalink
                channel_id: currentChannel.id,
                // Give each message a score based on replies + reactions
                score: (numReplies * REPLY_WEIGHT) + (numReactions * REACTION_WEIGHT),
                // Keep comment/reaction counts for post later
                numComments: numReplies,
                numEmojis: numReactions
            });
        }
    }

    const topTen = messageList
        .sort((a, b) => b.score - a.score) // Sort by score
        .slice(0, 10); // Grab top 10

    // Get each top message's permalink
    for (const message of topTen) {
        const details = await web.chat.getPermalink(
            {
                channel: message.channel_id,
                message_ts: message.ts
            });
        message.permalink = details.permalink;
    }

    // Post!
    // let post = buildPost(topTen);
    // console.log('Posting message...');
    // console.log(post);


    await web.chat.postMessage({
        text: '*Top ten posts from the last week:*',
        channel: CHANNEL
    });
    for (const message of topTen) {
        await web.chat.postMessage({
            text: `<${message.permalink}|Link>`,
            // blocks: [{
            //     "type": "section",
            //     "text": {
            //         "type": "mrkdwn",
            //         "text": `<${message.permalink}|Link>`
            //     }
            // }],
            // text: `<${message.permalink}|Link>`,
            channel: CHANNEL,
            // as_user: true,
            unfurl_links: true
            // unfurl_media: true,
            // mrkdwn: true
            // attachments: {
            //     image_url: `${message.permalink}`,
            //     thumb_url: `${message.permalink}`
            // }
        });
    }

    //     const result = await web.chat.postMessage({
    //     text: 'beep boop',
    //     // text: 'Top ten posts from the last week',
    //     channel: CHANNEL,
    //     // blocks: post
    // });
    // console.log(`Successfully sent message ${result.ts} to ${CHANNEL}`);
})();

/**
 * Gets all channels that haven't been archived and are not in the list of CHANNELS_TO_IGNORE
 * The response to this call is paginated, so it could come back with a cursor
 * If so, we have to pass the cursor back in and loop until we reach the last page
 */
async function getAllChannels() {
    let result = [];
    const response = await web.conversations.list(
        {
            exclude_archived: true
        });
    if (response.channels) {
        result = result.concat(response.channels.filter(channel => !CHANNELS_TO_IGNORE.includes(channel.name)));
        if (response.response_metadata.next_cursor) {
            let cursor = response.response_metadata.next_cursor;
            while (cursor) {
                const channels = await web.conversations.list(
                    {
                        exclude_archived: true
                    });
                result.push(channels.channels);
                cursor = channels.response_metadata ? channels.response_metadata.next_cursor : undefined;
            }
        }
    }
    return result;
}

/**
 * Gets all messages for a given channel ID for the last week
 * The response to this call is paginated, so it could come back with a cursor
 * If so, we have to pass the cursor back in and loop until we reach the last page
 */
async function getAllMessagesByChannel(channelId) {
    let result = [];
    const response = await web.conversations.history(
        {
            channel: channelId,
            exclude_archived: true,
            oldest: DATE_CUTOFF
        });
    if (response.messages) {
        result = result.concat(response.messages);
        if (response.response_metadata.next_cursor) {
            let cursor = response.response_metadata.next_cursor;
            while (cursor) {
                const response = await web.conversations.history(
                    {
                        channel: channelId,
                        exclude_archived: true,
                        oldest: DATE_CUTOFF,
                        cursor
                    });
                result = result.concat(response.messages);
                cursor = response.response_metadata ? response.response_metadata.next_cursor : undefined;
            }
        }
    }
    return result;
}

/**
 * Format the given list of top messages to be posted
 * https://api.slack.com/messaging/composing/layouts
 */
function buildPost(topMessages) {
    let blocks = [];

    // Intro:
    blocks.push({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "*Top ten posts from the last week:*"
        }
    });
    blocks.push({
        "type": "divider"
    });

    // Each message's details:
    for (const message of topMessages) {
        blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `*From:* <@${message.user}>\n`
                    + `\n*Message:* ${message.text}`
                    //  \n*Number of comments:* ${message.numComments} \n\n *Number of reactions:* ${message.numEmojis} \n\n
                    + `\n<${message.permalink}|Link>`
            }
        });
        blocks.push({
            "type": "divider"
        });
    }

    return blocks;
}
