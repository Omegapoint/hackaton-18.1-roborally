const express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');
var uuid = require('uuid/v4');
let rooms = {};

app.use(express.static('.'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/app/index.html');
});

class Director {
    constructor(board) {
        this.board = board;
        this.players = {};
    }

    addPlayer(playerName, socket) {
        console.log(`${playerName} joined`);
        let robot = new Robot(playerName);
        this.players[playerName] = 
            new Player(playerName,socket)
        ;
        this.board.addRobot(robot);
    }

    deal() {
        _.forEach(this.players, function(player) {
            player.receiveCards([new Card(1), new Card(0), new Card(1)]);
        });
    }
}

class Player {
	constructor(name, socket){
		this.name=name;
		this.socket=socket;
		this.socket.on('commitRegisters', (data)=> { this.commitRegisters(data);});
	}

	receiveCards(cards){
		this.socket.emit("give", cards);
	}

	commitRegisters(data){
		console.log("commitRegisters "+JSON.stringify(data));
	}


}
class Deck {
    constructor() { this.cards = []; }
    drawOne() {
        return new Card(1);
    }
}

class Card {
    constructor(steps) {
    	this.uuid = uuid();
        this.steps = steps;
        this.action = null;
    }
}

class Board {
    constructor() {
        this.size_x = 5;
        this.size_y = 5;
        this.next_pos = 0;
        this.robots={};
        console.log('Game created');
    }

    addRobot(robot) {
        console.log(`${robot.playerName}s robot added`);
        
        let position = this.findFreePosition();
        this.robots[robot.playerName] = {
            position,
            robot
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
    constructor(playerName) {
        this.avatar = '/app/images/duck.png';
        this.playerName = playerName;
    }
}

io.on('connection', (socket) => {

    // Create a new game room and notify the creator of game.
    socket.on('createGame', (data) => {
        let roomId = `room-0`;
        let board = new Board();
        let director = new Director(board);
        director.addPlayer(data.name, socket);

        rooms[roomId] = {
            board,
            director
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
            socket.emit('newGame', { name: data.name, room: data.room });
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
        rooms[data.room].director.deal();
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});