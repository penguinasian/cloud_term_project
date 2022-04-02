const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

const { DynamoDBClient, BatchGetItemCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");

(async () => {
    const client = new DynamoDBClient({ region: "us-west-2" });
    const commandRead = new BatchGetItemCommand({RequestItems: {users: {Keys:[{email: {"S": 'zhangqiangtianchen@gmail.com' }}]}}});
    const response = await client.send(commandRead);
    const commandWrite = new BatchWriteItemCommand({RequestItems: {users: [{PutRequest: {Item: {email: {"S": "andrew.paugh@gmail.com"}, password:{ "S": "12345"}}}}]}});
    await client.send(commandWrite);
})();

app.listen(3000);

// For linking the css to html files
app.use(express.static(path.join(__dirname, 'public')));

// Routing to sign up page
app.get('/', (req, res) => {
    res.sendFile('./views/login.html', { root: __dirname });
})

// Routing to login page
app.get('/signup', (req, res) => {
    res.sendFile('./views/signup.html', { root: __dirname });
})

//Routing to landing page when logged in
app.post('/landing', (req, res) => {

    res.sendFile('./views/landing_page.html', {root: __dirname});
})

//Routing to landing page after first time sign up
app.post('/first', (req, res) => {

    res.sendFile('./views/signup_landing_page.html', {root: __dirname});
})



// 404 page, the use function is going to fire for every request come in, but only if the request only reaches
// to this line of code.
app.use((req, res) => {
    res.sendFile('./views/404.html', { root: __dirname });
})