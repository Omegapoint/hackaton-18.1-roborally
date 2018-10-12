const express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

let rooms = {};

app.use(express.static('.'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/app/index.html');
});


class Board {

    constructor() {
        this.size_x = 5;
        this.size_y = 5;
        this.next_pos = 0;
        this.robots = {};

        console.log('Game created');
    }

    addPlayer(playerName) {
        console.log(`${playerName} joined`);
        let r = new Robot();
        let position = this.findFreePosition();
        this.robots[playerName] = {
        	position: position,
        	robot: r
        };
        this.printBoard();
    }

    findFreePosition() {
    	return new Position(this.next_pos++, 0);
    }

    printBoard() {
    	console.log(JSON.stringify(this));
    }
}

class Position {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Robot {

}

io.on('connection', (socket) => {

    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        let roomId = `room-0`;
        let board = new Board();
        board.addPlayer(data.name);

        rooms[roomId] = {
            board
        };

        socket.join(roomId);
        socket.emit('newGame', { name: data.name, room: roomId });
    });

    // Connect the Player 2 to the room he requested. Show error if room full.
    socket.on('joinGame', function(data) {
        console.log("join game " + JSON.stringify(data))

        var room = io.nsps['/'].adapter.rooms[data.room];
        if (room) {
        	rooms[data.room].board.addPlayer(data.name);
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
            room: data.room,
            board: rooms[data.room].board
        });
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});