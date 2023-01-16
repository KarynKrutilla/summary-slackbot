const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// CONFIG:
// #general-chat ID
const GENERAL_CHANNEL = 'C018WKJ5CHX';
// Controls how we score each post to pick the most popular
const REACTION_WEIGHT = 1;
const REPLY_WEIGHT = 3;
// Controls which channel will receive the message
const CHANNEL = 'C02L82VJ9U6'; // tldr
// const CHANNEL = 'C02KY8DAU1L'; // bot-testing
// Controls which channels to intentionally ignore
const CHANNELS_TO_IGNORE = ['tldr','bot-testing']

////////////////////

const NUM_DAYS = 7;
const SECONDS_PER_DAY = 24 * 60 * 60;
const TODAY_IN_SECONDS = new Date().getTime() / 1000;

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;


// Initialize
const web = new WebClient(token);

module.exports = {
    summarize() {
        (async () => {
            const dateCutoff = TODAY_IN_SECONDS - (NUM_DAYS * SECONDS_PER_DAY);
            let generalMessageList = [];
            let otherChannelMessageList = [];

            // Loop over all channels
            const allChannels = await getAllChannels();
            for (const currentChannel of allChannels) {
                let channelMessages;
                try {
                    channelMessages = await getAllMessagesByChannel(currentChannel.id, dateCutoff);
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

                    if (currentChannel.id === GENERAL_CHANNEL) {
                        generalMessageList.push({
                            ...message,
                            // Needed later when fetching permalink
                            channel_id: currentChannel.id,
                            // Give each message a score based on replies + reactions
                            score: (numReplies * REPLY_WEIGHT) + (numReactions * REACTION_WEIGHT),
                            // Keep comment/reaction counts for post later
                            numComments: numReplies,
                            numEmojis: numReactions
                        });
                    } else {
                        otherChannelMessageList.push({
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
            }

            let important = generalMessageList.filter(message => message.text.toUpperCase().endsWith('#IMPORTANT'));
            important = important.concat(otherChannelMessageList.filter(message => message.text.toUpperCase().endsWith('#IMPORTANT')));

            const generalTopTen = generalMessageList
                .sort((a, b) => b.score - a.score) // Sort by score
                .slice(0, 10); // Grab top 10
            const otherChannelTopTen = otherChannelMessageList
                .sort((a, b) => b.score - a.score) // Sort by score
                .slice(0, 10); // Grab top 10

            // Get each message's permalink
            for (const message of generalTopTen) {
                const details = await web.chat.getPermalink(
                    {
                        channel: message.channel_id,
                        message_ts: message.ts
                    });
                message.permalink = details.permalink;
            }
            for (const message of otherChannelTopTen) {
                const details = await web.chat.getPermalink(
                    {
                        channel: message.channel_id,
                        message_ts: message.ts
                    });
                message.permalink = details.permalink;
            }
            for (const message of important) {
                const details = await web.chat.getPermalink(
                    {
                        channel: message.channel_id,
                        message_ts: message.ts
                    });
                message.permalink = details.permalink;
            }

            // Post!
            const one_week_ago = new Date(dateCutoff * 1000).toDateString();
            const today = new Date().toDateString();

            if (important.length > 0) {
                await web.chat.postMessage({
                    text: `*_Important posts from ${one_week_ago} to ${today}:_*`,
                    channel: CHANNEL
                });
                for (const message of important) {
                    await web.chat.postMessage({
                        text: `<${message.permalink}|Link>`,
                        channel: CHANNEL,
                        unfurl_links: true
                    });
                }
            }

            await web.chat.postMessage({
                text: `*_Top ten posts in General channel from ${one_week_ago} to ${today}:_*`,
                channel: CHANNEL
            });
            for (const message of generalTopTen) {
                await web.chat.postMessage({
                    text: `<${message.permalink}|Link>`,
                    channel: CHANNEL,
                    unfurl_links: true
                });
            }

            await web.chat.postMessage({
                text: `*_Top ten posts in other channels from ${one_week_ago} to ${today}:_*`,
                channel: CHANNEL
            });
            for (const message of otherChannelTopTen) {
                await web.chat.postMessage({
                    text: `<${message.permalink}|Link>`,
                    channel: CHANNEL,
                    unfurl_links: true
                });
            }
        })();
    }
}


/**
 * Gets all channels that haven't been archived and are not in the list of CHANNELS_TO_IGNORE
 * The response to this call is paginated, so it could come back with a cursor
 * If so, we have to pass the cursor back in and loop until we reach the last page
 */
async function getAllChannels() {
    let result = [];
    const response = await web.conversations.list(
        {
            exclude_archived: true,
            limit: 130
        });
    if (response.channels) {
        result = result.concat(response.channels.filter(channel => !CHANNELS_TO_IGNORE.includes(channel.name)));
        if (response.response_metadata.next_cursor) {
            let cursor = response.response_metadata.next_cursor;
            // TODO - fix this loop so limit can be lowered
            while (cursor) {
                const channels = await web.conversations.list(
                    {
                        exclude_archived: true,
                        limit: 130
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
async function getAllMessagesByChannel(channelId, dateCutoff) {
    let result = [];
    const response = await web.conversations.history(
        {
            channel: channelId,
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
                        channel: channelId,
                        exclude_archived: true,
                        oldest: dateCutoff,
                        cursor
                    });
                result = result.concat(response.messages);
                cursor = response.response_metadata ? response.response_metadata.next_cursor : undefined;
            }
        }
    }
    return result;
}
