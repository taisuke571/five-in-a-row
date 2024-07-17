const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];
let currentGameId = 1;
let gameBoard = Array(19).fill(null).map(() => Array(19).fill(null));
let awaitingGameId = null;
function checkVictory(x, y, color) {
    const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (const [dx, dy] of directions) {
        let count = 0;
        for (let i = -4; i <= 4; i++) {
            const nx = x + i * dx;
            const ny = y + i * dy;
            if (nx >= 0 && nx < 19 && ny >= 0 && ny < 19 && gameBoard[nx][ny] === color) {
                count++;
                if (count === 5) return true;
            } else {
                count = 0;
            }
        }
    }
    return false;
}

io.on('connection', (socket) => {
    console.log('User connected');

    if (!awaitingGameId) {
        players.push({ socket: socket, color: 'black', gameId: currentGameId });
        socket.emit('colorAssigned', 'black');
        socket.emit('gameIdAssigned', currentGameId);
        awaitingGameId = currentGameId;
    } else if (awaitingGameId) {
        players.push({ socket: socket, color: 'red', gameId: awaitingGameId });
        socket.emit('colorAssigned', 'red');
        socket.emit('gameIdAssigned', awaitingGameId);
        currentGameId++;
        awaitingGameId = null;
    } else {
        socket.emit('message', 'Game is full.');
        socket.disconnect();
        return;
    }

    socket.on('stonePlaced', (data) => {
        if (gameBoard[data.x][data.y] !== null) {
            socket.emit('placementError', 'This spot is already occupied!');
            return;}
            
        gameBoard[data.x][data.y] = data.color;
        socket.broadcast.emit('newMove', data);
        if (checkVictory(data.x, data.y, data.color)) {
            io.emit('gameOver', data.color);
            gameBoard = Array(19).fill(null).map(() => Array(19).fill(null));
            awaitingGameId = null;
        }
        
        
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        players = players.filter(p => p.socket !== socket);
        if (players.length === 0) {
            gameBoard = Array(19).fill(null).map(() => Array(19).fill(null));
            awaitingGameId = null;
        }
    });
});

app.get('/ping', (req, res) => {
    res.send('Server is up and running!');
});

app.use(express.static(__dirname));

server.listen(3001, () => {
    console.log('Server listening on port 3001');
});