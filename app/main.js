(function init() {
    const P1 = 'X';
    const P2 = 'O';
    let player;
    let game;
    let roomId;

    const socket = io.connect('http://localhost:3000');

    function initBoard(board) {
        console.log("Init board: " + JSON.stringify(board));

        for (y = board.size_y - 1; y >= 0; y--) {
            let row = $('<div class="row"></div>');
            $('#factoryFloor').append(row);
            for (x = 0; x < board.size_x; x++) {
                row.append(`<div class="tile" id="tile-${x}-${y}">[${x},${y}]</div>`);
            }
        }
    }

    function updateBoard(board) {
        $('.robot').remove();
        _.forEach(board.robots, function(r) {
            console.log("Robot: " + JSON.stringify(r));
            $(`#tile-${r.position.x}-${r.position.y}`).html(`<img class="robot" id="${r}" src="${r.robot.avatar}"/>`);
        });
    }

    function announceWinner(robot) {
        $('#userHello').html("The winner is " + robot.playerName);
    }

    // Create a new game. Emit newGame event.
    $('#new').on('click', () => {
        const name = $('#nameNew').val();
        if (!name) {
            alert('Please enter your name.');
            return;
        }
        socket.emit('createGame', { name });
    });

    $('#join').on('click', () => {
        const name = $('#nameJoin').val();
        const roomID = $('#room').val();
        if (!name || !roomID) {
            alert('Please enter your name and game ID.');
            return;
        }
        socket.emit('joinGame', { name, room: roomID });

    });

    $('#start').on('click', () => {
        if (!roomId) {
            alert('Room not started yet.');
            return;
        }
        socket.emit('startGame', { room: roomId });
    });

    $('#commitRegisters').on('click', () => {
        const registers = _.split($('#registers').val(), ",");
        let cards = JSON.parse($('#cards').html());
        let commitRegisters = _.map(registers, (index) => cards[index]);
        socket.emit('commitRegisters', { registers: commitRegisters });
    });

    // New Game created by current client. Update the UI and create new Game var.
    socket.on('newGame', (data) => {
        const message =
            `Hello, ${data.name}. Please ask your friend to enter Game ID: ${data.room}. Waiting for player 2...`;

        $('.lobby').css('display', 'none');
        $('.waiting').css('display', 'block');
        $('#userHello').html(message);

        roomId = data.room;
    });

    // New Game created by current client. Update the UI and create new Game var.
    socket.on('gameOn', (data) => {
        initBoard(data.board);
        updateBoard(data.board);
        $('.waiting').css('display', 'none');
        $('.gameBoard').css('display', 'block');
        $('#userHello').html("Nu kör vi!");

    });

    socket.on('give', (data) => {
        $('#cards').html(JSON.stringify(data));
    });

    socket.on('updateBoard', (data) => {
        updateBoard(data.board);
    });

    socket.on('announceWinner', (data) => {
        announceWinner(data.robot);
    });

    socket.on('err', (data) => {
        game.endGame(data.message);
    });
}());