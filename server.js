const express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

let rooms = 0;

app.use(express.static('.'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/app/index.html');
});

io.on('connection', (socket) => {

    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        socket.join(`room-${++rooms}`);
        socket.emit('newGame', { name: data.name, room: `room-${rooms}` });
    });

    // Connect the Player 2 to the room he requested. Show error if room full.
    socket.on('joinGame', function(data) {
        console.log("join game " + JSON.stringify(data))

        var room = io.nsps['/'].adapter.rooms[data.room];
        if (room) {
            socket.join(data.room);
            socket.emit('newGame', { name: data.name, room: `room-${rooms}` });
            io.to(data.room).emit('playerJoined', {
                room: data.room,
                player: data.name
            });
        } else {
            socket.emit('err', { message: 'Sorry, the room does not exist' });
        }
    });

    socket.on('startGame', function(data) {
        console.log("start game " + JSON.stringify(data))
        var room = io.nsps['/'].adapter.rooms[data.room];
        io.to(data.room).emit('gameOn', {
            room: data.room
        });
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});