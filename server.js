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
    socket.on('joinGame', function (data) {
        var room = io.nsps['/'].adapter.rooms[data.room];
        if (room && room.length === 1) {
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', { name: data.name, room: data.room })
        } else {
            socket.emit('err', { message: 'Sorry, The room is full!' });
        }
    });

    /**
       * Handle the turn played by either player and notify the other.
       */
    socket.on('playTurn', (data) => {
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    /**
       * Notify the players about the victor.
       */
    socket.on('gameEnded', (data) => {
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});