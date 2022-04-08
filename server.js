const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const multer  = require('multer')
const cookieParser = require('cookie-parser')

// this will allow us to save the user profile uploaded pic a mermory storage in byte array format, will be used inside post request
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// require dynamodb library
const { DynamoDBClient, BatchGetItemCommand, BatchWriteItemCommand } = require("@aws-sdk/client-dynamodb");
const AWS = require('@aws-sdk/client-s3');
const AWS_General = require("aws-sdk");

const s3 = new AWS.S3();


// require view engine for achiving dynamically modify the static html page - our case, specifically for the landing page
app.set('view engine', 'ejs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.listen(3000);


// for the generatString function
const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// randomnly generate string for building url, used in post request
function generateString(length) {
    let result = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

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
    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": email } }] } } });
    const responseRead = await client.send(commandRead);

    if (responseRead.Responses.users.length == 0) {
        // set the error message to non null and render it on login page
        userNonExistMessage = "User does not exit!";
        invalidPasswordMessage = null;
        res.render('login', { userNonExistMessage, invalidPasswordMessage });
        console.log("User does not exist!");

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
            let user_image = responseRead.Responses.users[0].profileUrl.S;

            let reminders = responseRead.Responses.users[0].reminders.SS;

            let background_image = responseReadImage.Responses.background_image[0].url.S;
            console.log(background_image);
            let titlelizedFirstName = firstName[0].toUpperCase() + firstName.substring(1);
            let titlelizedLastName = lastName[0].toUpperCase() + lastName.substring(1);
            firstName[0].toUpperCase();
            lastName[0].toUpperCase();

            res.cookie('email', email);

            res.render('landing_page', { titlelizedFirstName, titlelizedLastName, favSeason, reminders, background_image, user_image });
        }
    }

})


//Routing to landing page after first time sign up
// upload.single('profile') is a middleware, it will enable us to save the profile pic a buffer
// 'profile' - we named it 'profile' in the form, input field for the profile upload
app.post('/first', upload.single('profile'), async (req, res) => {

    let firstName = req.body.firstName;
    let lastName = req.body.lastName;
    let favSeason = req.body.season;
    // generate a random string to help build url
    let key = generateString(10);

    // build url for user to save it in Database
    let profileUrl = `https://profile-pic-term-project.s3.us-west-2.amazonaws.com/${key}`

    // upload user profile pic onto S3 bucket
    let params = {Bucket: 'profile-pic-term-project-connor', Key: key, Body: req.file.buffer, ContentType: 'image/jpeg', ACL: 'public-read'};
    s3.putObject(params, function(err, data) {
        console.log(err, data);
      });

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
                            reminders: { "SS": [""] },
                            profileUrl: {"S": profileUrl}
                        }
                    }
                }]
            }
        });
        await client.send(commandWrite);
        let background_image = responseReadImage.Responses.background_image[0].url.S;
        let user_image = profileUrl;
        let reminders = [];
        res.cookie('email', email);

        res.render('signup_landing_page', { titlelizedFirstName, titlelizedLastName, favSeason, reminders, background_image, user_image });
    }

})

app.post('/add-reminder', async (req, res) => {
    const client = new DynamoDBClient({ region: "us-west-2" });
    const docClient = new AWS_General.DynamoDB.DocumentClient({ region: "us-west-2" })
    let newReminder = req.body.newReminder;
    let email = req.cookies.email;

    const params = {
        TableName:"users",
        Key:{
            "email" : email
        },
        UpdateExpression: "ADD reminders :newReminder",
        ExpressionAttributeValues: {
            ":newReminder": docClient.createSet([newReminder])
        },
        ReturnValues: "UPDATED_NEW"
    }

    await docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        }
    });


    const commandRead = new BatchGetItemCommand({ RequestItems: { users: { Keys: [{ email: { "S": email } }] } } });
    const responseRead = await client.send(commandRead);

    let favSeason = responseRead.Responses.users[0].favSeason.S;
    const readBackgroundImage = new BatchGetItemCommand({ RequestItems: { background_image: { Keys: [{ image_name: { "S": favSeason } }] } } });
    const responseReadImage = await client.send(readBackgroundImage);
    let firstName = responseRead.Responses.users[0].firstName.S;
    let lastName = responseRead.Responses.users[0].lastName.S;
    let user_image = responseRead.Responses.users[0].profileUrl.S;

    let reminders = responseRead.Responses.users[0].reminders.SS;

    let background_image = responseReadImage.Responses.background_image[0].url.S;
    console.log(background_image);
    let titlelizedFirstName = firstName[0].toUpperCase() + firstName.substring(1);
    let titlelizedLastName = lastName[0].toUpperCase() + lastName.substring(1);
    firstName[0].toUpperCase();
    lastName[0].toUpperCase();
    res.render('landing_page', { titlelizedFirstName, titlelizedLastName, favSeason, reminders, background_image, user_image });
})

// 404 page, the use function is going to fire for every request come in, but only if the request only reaches
// to this line of code.
app.use((req, res) => {
    res.sendFile('./views/404.html', { root: __dirname });
})
