"use strict";

// Module
const express = require('express');
const http = require('http');
const striptags = require('striptags');
const path = require('path');
const bodyParser = require('body-parser');
const socketio = require('socket.io');

// Constantes
const app = express();
const server = http.Server(app);
const io = socketio(server);
const PORT = process.env.PORT || 8080;

// Mongodb
var MongoClient = require('mongodb').MongoClient;
const dbName = 'session-joueur';
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);

// Variables
let usernames = ['alex', 'cam'];


// Middlewares
app.use('/', express.static(path.join(__dirname, '/dist/app-liste-courses')));
// app.use(session(options));
app.use(bodyParser.json());

// Routes
app.all('*', (req, res) => { 
    res.sendFile(path.join(__dirname, '/dist/index.html'));
})

io.on('connection', (socket) => {

    // vérification du nom
    socket.on('setUsername', (usernameWanted) => {
        // traitement de la chaine de caractère
        usernameWanted = striptags(usernameWanted.trim());
        // console.log(usernameWanted);

        // Vérification de l'unicité de l'username
        let usernameTaken = false;
        for (let socketid in usernames) {
            if (usernames[socketid] == usernameWanted) {
                usernameTaken = true;
            }
        }

        // Traitement final
        if (usernameTaken == true) {
            // console.log(usernames);
            MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
                let db = client.db(dbName);
                let collection = db.collection(usernameWanted);
                collection.find().toArray(function (err, data) {
                    // console.log(data);
                    socket.emit('usernameTaken', data);
                    client.close();
                })
            })

        } else if (usernameWanted == '') {
            socket.emit('emptyUsername', usernameWanted);

        } else {
            // console.log('username non existant')
            usernames.push(usernameWanted);
            console.log(usernames)
            MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
                if (err) {
                    return;
                }
                let db = client.db(dbName);
                db.createCollection(usernameWanted);
            })
            
            socket.emit('acceptUsername', usernameWanted);
        }
    })

    // insertion dans la db de la valeur de l'input
    socket.on('inputElement', (inputValue, searchParams) => {
        MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
            if (err) {
                return;
            }
            let db = client.db(dbName);
            let collection = db.collection(searchParams);
            let insertion = {};
            insertion.article = inputValue;
            
            collection.insertOne(insertion, function () {
                collection.find().toArray(function (err, data) {
                    // console.log(data);
                    socket.emit('usernameTaken', data);
                    client.close();
                })
            })
        })
    })

    // suppression d'un article
    socket.on('deleteElement', (contentElement, searchParams) => {
        // console.log(contentElement);
        // console.log(searchParams);
        MongoClient.connect(url, { useUnifiedTopology: true }, function (err, client) {
            if (err) {
                return;
            }
            let db = client.db(dbName);
            let collection = db.collection(searchParams);
            
            collection.deleteOne({article: contentElement}, function () {
                collection.find().toArray(function (err, data) {
                    // console.log(data);
                    socket.emit('usernameTaken', data);
                    client.close();
                })
            })
        })
    })
})

server.listen(PORT, ()=> console.log(`listening on ${PORT}`));