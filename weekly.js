const summarizer = require('./summarize.js');
const dotenv = require('dotenv').config()
const { WebClient } = require('@slack/web-api');

// CONFIG:
// Controls how far back we look
const NUM_DAYS = 7;


////////////////////

const SECONDS_PER_DAY = 24 * 60 * 60;
const TODAY_IN_SECONDS = new Date().getTime() / 1000;
const DATE_CUTOFF = TODAY_IN_SECONDS - (NUM_DAYS * SECONDS_PER_DAY);

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);
summarizer.summarize(NUM_DAYS, false);
