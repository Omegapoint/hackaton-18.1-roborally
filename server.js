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
        this.deck = new Deck();
    }

    addPlayer(playerName, socket) {
        console.log(`${playerName} joined`);
        this.players[playerName] = new Player(playerName, socket, this);
        let robot = new Robot(playerName);
        this.board.addRobot(robot);
    }

    deal() {
        let board = this.board;
        let director = this;
        _.forEach(this.players, function(player) {
            board.robots[player.name].robot.clearRegisters();
            player.receiveCards(director.deck.drawCards(3));
        });
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    readyPlayer(player, registers) {
        console.log("Ready player " + player.name);
        this.board.commitRegisters(player.name, registers);
        if (this.board.areAllRobotsCommitted()) {
            console.log("All players are ready");
            this.playRound();
        } else {
            console.log("Not all players are ready");
        }
    }

    playRound() {
        let winner = this.board.playRegister(0);
        let director = this;
        _.forEach(this.players, function(player) {
            player.updateBoard(director.board);
        });
        if (winner !== undefined) {
            _.forEach(this.players, function(player) {
                player.announceWinner(winner);
            });
            // TODO: kill everything
            return;
        }
        this.deal();
    }
}

class Player {
    constructor(name, socket, director) {
        this.name = name;
        this.socket = socket;
        this.director = director;
        this.hand = [];

        this.socket.on('commitRegisters', (data) => {
            this.commitRegisters(data);
        });
    }

    receiveCards(cards) {
        this.socket.emit("give", cards);
        this.hand = cards;
    }

    commitRegisters(data) {
        console.log("commitRegisters " + JSON.stringify(data));
        this.director.readyPlayer(this, data.registers);
    }

    updateBoard(board) {
        this.socket.emit("updateBoard", { board });
    }

    announceWinner(robot) {
        this.socket.emit("announceWinner", { robot });
    }
}

class Deck {
    constructor() { this.cards = []; }
    drawOne() {
        return new Card(1, this.getRandomInt(200));
    }

    drawCards(number) {
    	let deck = this;
    	return _.map(_.range(number), () => {
    		return new Card(deck.getRandomInt(3), deck.getRandomInt(200));
    	});
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}

class Card {
    constructor(steps, priority) {
        this.uuid = uuid();
        this.steps = steps;
        this.action = null;
        this.priority = priority
    }
}

class Board {
    constructor() {
        this.size_x = 5;
        this.size_y = 5;
        this.next_pos = 0;
        this.robots = {};
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

    commitRegisters(playerName, registers) {
        this.robots[playerName].robot.commitRegisters(registers);
    }

    areAllRobotsCommitted() {
        let notReady = _.filter(_.map(this.robots, 'robot'), function(robot) {
            return _.isEmpty(robot.registers);
        });
        return _.isEmpty(notReady);
    }

    playRegister(registerId) {
        let aliveRobots = _.filter(_.map(this.robots, 'robot'), {'status': 'ALIVE'});
        let sortedRobots = _.sortBy(aliveRobots, [function(robot) {
            return robot.getRegister(registerId).priority;
        }]);

        let board = this;
        let winner = undefined;

        _.forEach(sortedRobots, function(robot) {
            let card = robot.getRegister(registerId);
            board.moveRobot(robot, card);
            let newPosition = board.robots[robot.playerName].position;
            if (newPosition.y === board.size_y - 1) {
                winner = robot;
                return false;
            }
            if (newPosition.y >= board.size_y) {
            	robot.die();
            }
        });
        return winner;
    }

    moveRobot(robot, card) {
        console.log("Move Robot: " + JSON.stringify(robot) + " - card: " + JSON.stringify(card));
        let position = this.robots[robot.playerName].position;
        this.robots[robot.playerName].position = position.plusNorth(card.steps);
        console.log("Robot position is now " + JSON.stringify(this.robots[robot.playerName].position));
    }
}

class Position {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    plusNorth(steps) {
        console.log("steps " + steps);
        return new Position(this.x, this.y + steps);
    }
}

class Robot {
    constructor(playerName) {
        this.avatar = '/app/images/duck.png';
        this.playerName = playerName;
        this.registers = [];
        this.status = "ALIVE";
    }

    commitRegisters(registers) {
        this.registers = registers;
        console.log("Robot says registers " + JSON.stringify(registers));
    }

    clearRegisters() {
        this.registers = [];
    }

    getRegister(registerId) {
        return this.registers[registerId];
    }

    die() {
    	this.status = "DEAD";
    	console.log("Robot died: " + this.playerName);
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
            rooms[data.room].director.addPlayer(data.name, socket);
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