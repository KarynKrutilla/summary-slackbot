const summarizer = require('./summarize.js');
const express = require('express');
const bodyParser = require('body-parser');

const app = new express();
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/summarize', (request, response) => {
    const days = request.body.text.split(' ')[0];
    const data = {
        "response_type": "ephemeral",
        "text": `Received request to summarize the past ${days} days`
    }

    response.header('Content-Type', 'application/json')
        .status(200)
        .send(data);

    summarizer.summarize(days, true);
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening...`);
})
