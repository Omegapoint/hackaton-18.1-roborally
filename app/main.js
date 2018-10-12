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
        _.forEach(board.robots, function(r) {
            console.log("Robot: " + JSON.stringify(r));
            $(`#tile-${r.position.x}-${r.position.y}`).html(`<img class="robot" id="${r}" src="${r.robot.avatar}"/>`);
        });

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
        console.log("give " + JSON.stringify(data));
    });


    /**
     * If player creates the game, he'll be P1(X) and has the first turn.
     * This event is received when opponent connects to the room.
     */
    socket.on('player1', (data) => {
        const message = `Hello, ${player.getPlayerName()}`;
        $('#userHello').html(message);
        player.setCurrentTurn(true);
    });

    /**
     * Joined the game, so player is P2(O). 
     * This event is received when P2 successfully joins the game room. 
     */
    socket.on('player2', (data) => {
        const message = `Hello, ${data.name}`;

        // Create game for player 2
        game = new Game(data.room);
        game.displayBoard(message);
        player.setCurrentTurn(false);
    });

    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
    socket.on('turnPlayed', (data) => {
        const row = data.tile.split('_')[1][0];
        const col = data.tile.split('_')[1][1];
        const opponentType = player.getPlayerType() === P1 ? P2 : P1;

        game.updateBoard(opponentType, row, col, data.tile);
        player.setCurrentTurn(true);
    });

    // If the other player wins, this event is received. Notify user game has ended.
    socket.on('gameEnd', (data) => {
        game.endGame(data.message);
        socket.leave(data.room);
    });

    /**
     * End the game on any err event. 
     */
    socket.on('err', (data) => {
        game.endGame(data.message);
    });
}());