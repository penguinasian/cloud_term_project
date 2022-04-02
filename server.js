const http = require('http');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

// Below are the codes for when not using express module
// const server = http.createServer((req, res) => {
//     console.log(req.url, req.method);
//     // set header content type
//     res.setHeader('Content-Type', 'text/html');

//     let path = './views/';
//     switch(req.url) {
//         case '/':
//             path += 'index.html';
//             break;
//         case '/login':
//             path += 'login.thml'
//             break;
//         default:
//             path += '404.html';
//             break;
//     }
    
//     // send an html file
//     fs.readFile(path, (err, data) => {
//         if (err) {
//             console.log(err);
//             res.end()
//         } else {
//             res.write(data);
//             res.end();
//         }
//     })
// });

// server.listen(3000, 'localhost', () => {
//     console.log('listening for requests on port number 3000');
// });

app.listen(3000);

// For linking the css to html files
app.use(express.static(path.join(__dirname, 'public')));

// Routing to sign up page
app.get('/', (req, res) => {
    res.sendFile('./views/login.html', {root: __dirname});
})

// Routing to login page
app.get('/signup', (req, res) => {
    res.sendFile('./views/signup.html', {root: __dirname});
})

// 404 page, the use function is going to fire for every request come in, but only if the request only reaches
// to this line of code.
app.use((req, res) => {
    res.sendFile('./views/404.html', {root: __dirname});
})