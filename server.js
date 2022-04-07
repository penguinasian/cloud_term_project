const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

// require dynamodb library
const { DynamoDBClient, BatchGetItemCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const AWS = require('@aws-sdk/client-s3');
const s3 = new AWS.S3();


// require view engine for achiving dynamically modify the static html page - our case, specifically for the landing page
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(3000);

// const uploadFile = (fileName) => {

//     const fileContent = fs.readFileSync(fileName);
//     const params = {
//         Bucket: 'term-project/images/background',
//         Key: fileName,
//         Body: fileContent
//     };

//     s3.upload(params, (err, data) => {
//         if(err) {
//             console.log(err);
//         } else {
//             console.log(`Image uploaded successfully. ${data.Location}`);
//         }
//     });
// }

// uploadFile('fall_resized.jpg');

// setting up variables to manipulate the front end with ejs template
// Error message, such as "User already exists" "invalid password" will show up depending on the input
let userNonExistMessage = null;
let invalidPasswordMessage = null;
let userExistsMessage = null;

// For linking the css to html files
app.use(express.static(path.join(__dirname, 'public')));

// Routing to sign up page
app.get('/', (req, res) => {
    userNonExistMessage = null;
    invalidPasswordMessage = null;
    res.render('login', { userNonExistMessage, invalidPasswordMessage });
})

// Routing to login page
app.get('/signup', (req, res) => {
    userExistsMessage = null;
    res.render('signup', { userExistsMessage });
})

//Routing to landing page when logged in
app.post('/landing', async (req, res) => {
    let password = req.body.password;
    let email = req.body.email;


    const client = new DynamoDBClient({ region: "us-west-2" });
    // Read data by primary key - email
    const commandRead = new BatchGetItemCommand({
        RequestItems: {
            users: {
                Keys: [ { email: { "S": email } } ]
            }
        }
    });
    const responseRead = await client.send(commandRead);

    if (responseRead.Responses.users.length == 0) {
        // set the error message to non null and render it on login page
        userNonExistMessage = "User does not exit!";
        invalidPasswordMessage = null;
        res.render('login', { userNonExistMessage, invalidPasswordMessage });
        console.log("User does not exist!");
        console.log(responseRead)

    } else {
        if (responseRead.Responses.users[0].password.S != password) {
            invalidPasswordMessage = "Invalid Password!";
            userNonExistMessage = null;
            res.render('login', { userNonExistMessage, invalidPasswordMessage });
            console.log("Incorrect Password!")
        }
        else {
            let favSeason = responseRead.Responses.users[0].favSeason.S;
            const readBackgroundImage = new BatchGetItemCommand({ RequestItems: { background_image: { Keys: [{ image_name: { "S": favSeason } }] } } });
            const responseReadImage = await client.send(readBackgroundImage);
            let firstName = responseRead.Responses.users[0].firstName.S;
            let lastName = responseRead.Responses.users[0].lastName.S;

            let reminders = responseRead.Responses.users[0].reminders.SS;

            let background_image = responseReadImage.Responses.background_image[0].url.S;
            console.log(background_image);
            let titlelizedFirstName = firstName[0].toUpperCase() + firstName.substring(1);
            let titlelizedLastName = lastName[0].toUpperCase() + lastName.substring(1);
            firstName[0].toUpperCase();
            lastName[0].toUpperCase();
            res.render('landing_page', { titlelizedFirstName, titlelizedLastName, favSeason, reminders, background_image });
        }
    }

})


//Routing to landing page after first time sign up
app.post('/first', async (req, res) => {

    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let favSeason = req.body.season;


    let titlelizedFirstName = firstName[0].toUpperCase() + firstName.substring(1);
    let titlelizedLastName = lastName[0].toUpperCase() + lastName.substring(1);

    let password = req.body.password;
    let email = req.body.email;
    const client = new DynamoDBClient({ region: "us-west-2" });
    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": email } }] } } });
    const readBackgroundImage = new BatchGetItemCommand({ RequestItems: { background_image: { Keys: [{ image_name: { "S": favSeason } }] } } });

    const responseReadImage = await client.send(readBackgroundImage);
    const response = await client.send(commandRead);
    console.log(responseReadImage);

    if (response.Responses.users.length != 0) {
        // set the error message to non null and render it on signup page
        userExistsMessage = "User already exists!";
        res.render('signup', { userExistsMessage });
        console.log("User already exists!")
    } else {
        const commandWrite = new BatchWriteItemCommand({
            RequestItems: {
                users: [{
                    PutRequest: {
                        Item: {
                            email: { "S": email },
                            password: { "S": password },
                            firstName: { "S": firstName },
                            lastName: { "S": lastName },
                            favSeason: { "S": favSeason },
                            reminders: { "SS": [""]}
                        }
                    }
                }]
            }
        });
        await client.send(commandWrite);
        let background_image = responseReadImage.Responses.background_image[0].url.S;

        res.render('signup_landing_page', { titlelizedFirstName, titlelizedLastName, favSeason, background_image });
    }

})



// 404 page, the use function is going to fire for every request come in, but only if the request only reaches
// to this line of code.
app.use((req, res) => {
    res.sendFile('./views/404.html', { root: __dirname });
})
