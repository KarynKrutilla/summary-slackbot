const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// TODO - move to config file?
// CONFIG:
// Controls how we score each post to pick the most popular
const REACTION_SCORE = 1;
const REPLY_SCORE = 3;
// Controls how far back we look (in seconds)
const NUM_DAYS = 7;
// Controls which channel will receive the message
const CHANNEL = 'summary-bot-testing';

const SECONDS_PER_DAY = 24 * 60 * 60;
const DATE_CUTOFF = new Date().getSeconds() - NUM_DAYS * SECONDS_PER_DAY;

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
            // Get all messages from the last week
            channelMessages = await getAllMessagesByChannel(currentChannel.id)
                .then(messageList => messageList
                    .filter(message =>
                        // ts field contains the timestamp, plus a unique message identifier - slice the ID off to filter
                        // TODO - fix - older messages aren't filtered out
                        Number(message.ts.split('.')[0]) > DATE_CUTOFF)); 
        } catch (error) {
            // We only want to summarize channels that opted into using this bot
            // All other channels will throw an error
            // Looping over all channels and catching the error is easier for the workspace to control than storing a list here
            if (error.data.error === 'not_in_channel') {
                console.log(`Bot not added to channel ${currentChannel.name}, continuing...`);
                continue;
            } else {
                console.log(error);
            }
        }
        for (const message of channelMessages) {
            const numComments = message.reply_count ? message.reply_count : 0;
            const numEmojis = message.reactions ? message.reactions.map(reaction => reaction.count).reduce((a, b) => a + b) : 0;

            messageList.push({
                ...message,
                // Needed later when fetching permalink
                channel_id: currentChannel.id,
                // Give each message a score based on replies + reactions
                score: (numComments * REPLY_SCORE) + (numEmojis * REACTION_SCORE),
                // Keep comment/reaction counts for post later
                numComments,
                numEmojis
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
    let post = buildPost(topTen);
    console.log('Posting message...');
    console.log(post);

    const result = await web.chat.postMessage({
        text: 'Top ten posts from the last week',
        channel: CHANNEL,
        blocks: post
    });
    console.log(`Successfully sent message ${result.ts} to channel`);
})();

async function getAllChannels() {
    let result = [];
    const response = await web.conversations.list(
        {
            exclude_archived: true
        });
    if (response.channels) {
        result = result.concat(response.channels);
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

async function getAllMessagesByChannel(channelId) {
    let result = [];
    const response = await web.conversations.history(
        {
            channel: channelId,
            exclude_archived: true,
            // oldest: ONE_WEEK
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
                        cursor
                        // oldest: ONE_WEEK
                    });
                result = result.concat(response.messages);
                cursor = response.response_metadata ? response.response_metadata.next_cursor : undefined;
            }
        }
    }
    return result;
}

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
                "text": `*From:* <@${message.user}> \n\n *Message:* ${message.text} \n\n *Number of comments:* ${message.numComments} \n\n *Number of reactions:* ${message.numEmojis} \n\n <${message.permalink}|Link>`
            }
        });
        blocks.push({
            "type": "divider"
        });
    }

    return blocks;
}
