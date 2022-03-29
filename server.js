var express = require('express');
var app = express();
var fs = require('fs');
var User = require('./User.js');
var UserList = require('./UserList.js');

console.log("Started")


if(!fs.existsSync('./users.json')){
    fs.writeFileSync('./users.json', '');
    console.log("Created new users json file")
} else{
    console.log("Users json already exists");
}

let userFile = JSON.parse(fs.readFileSync('./users.json'));

//stuff to connect to the servers / clients

var serverApp = app.listen(50000);
app.use(express.static('public'));

var socket = require('socket.io');
var io = socket(serverApp);
io.sockets.on('connection', newConnection);

let userList = new UserList(userFile);

// add test users
userList.addUser("abcdef", new User(userList, "abcdef", socket, "test user 1", testUser=true));
//userList.addUser("12356a", new User(userList, "12356a", socket, "test user 2", testUser=true));

/**
 * A new connection has been made
 * @param {*} socket 
 */
function newConnection(socket){
    console.log("New connection")
    let tempuser = new User(userList, "TEMPCODE", socket, "UNNAMED");
    
}