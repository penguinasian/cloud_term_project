const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

const { DynamoDBClient, BatchGetItemCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");

(async () => {
    const client = new DynamoDBClient({ region: "us-west-2" });
    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": 'andrew.paugh@gmail.com' } }] } } });
    // email = commandRead.input.RequestItems.users.Keys[0].email.S;
    // console.log(email);
    // console.log(email == "zhangqiangtianchen@gmail.com");
    const response = await client.send(commandRead);
    console.log(response);
    const commandWrite = new BatchWriteItemCommand({ RequestItems: { users: [{ PutRequest: { Item: { email: { "S": "andrew.paugh@gmail.com" }, password: { "S": "12345" } } } }] } });
    await client.send(commandWrite);
})();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
app.post('/landing', async (req, res) => {
    let password = req.body.password;
    let email = req.body.email;

    const client = new DynamoDBClient({ region: "us-west-2" });
    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": email } }] } } });

    const responseRead = await client.send(commandRead);

    if (responseRead.Responses.users.length == 0) {
        console.log("User does not exist!");
    } else {
        if (responseRead.Responses.users[0].password.S != password) {
            console.log("Incorrect Password!")
        }
        else  {
            res.sendFile('./views/landing_page.html', { root: __dirname });
        }
    }

})

//Routing to landing page after first time sign up
app.post('/first', async (req, res) => {

    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let password = req.body.password;
    let email = req.body.email;
    const client = new DynamoDBClient({ region: "us-west-2" });
    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": email } }] } } });

    const response = await client.send(commandRead);
    if (response.Responses.users.length != 0) {
        console.log("User already exists!")
    } else {
        const commandWrite = new BatchWriteItemCommand({ RequestItems: { users: [{ PutRequest: { Item: { email: { "S": email }, password: { "S": password } } } }] } });
        await client.send(commandWrite);
        res.sendFile('./views/signup_landing_page.html', { root: __dirname });
    }

})



// 404 page, the use function is going to fire for every request come in, but only if the request only reaches
// to this line of code.
app.use((req, res) => {
    res.sendFile('./views/404.html', { root: __dirname });
})