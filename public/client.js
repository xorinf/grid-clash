const socket = io();
let playerName = '';
let isMyTurn = false;
let selectedCells = [];
let startCell = null;
let startTime = null;
let timerInterval = null;

// Add loading state management
const loadingEl = document.getElementById('loading');

// Add these constants at the top
const CONNECTION_CHECK_INTERVAL = 5000;
const RECONNECT_DELAY = 3000;

// Add connection status indicator
const connectionStatus = document.getElementById('connection-status');

function showLoading(show) {
    loadingEl.style.display = show ? 'flex' : 'none';
}

// Show loading when connecting
showLoading(true);

socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.style.backgroundColor = '#4CAF50';
    showLoading(false);
    showMessage('Connected to server', 'success');
});

socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.style.backgroundColor = '#f44336';
    showLoading(true);
    showMessage('Disconnected from server', 'error');
});

// Add timeout for connection
setTimeout(() => {
    if (!socket.connected) {
        showMessage('Connection is taking longer than expected', 'error');
    }
}, 5000);

socket.on('gameStart', (data) => {
    isMyTurn = data.isMyTurn;
    renderGrid(data.grid);
    renderWordList(data.words);
    startTime = new Date();
    timerInterval = setInterval(updateTimer, 1000);
});

socket.on('updateGrid', (updatedGrid) => {
    renderGrid(updatedGrid);
});

socket.on('wordFound', ({ word, player }) => {
    showMessage(`${player} found: ${word}`);
});

socket.on('gameOver', (winner) => {
    showMessage(winner === socket.id ? 'You won!' : `${winner} won!`);
    clearInterval(timerInterval);
});

// Add global error handler
window.addEventListener('error', (event) => {
    showMessage('An unexpected error occurred', 'error');
    console.error('Global error:', event.error);
});

// Add socket error handlers
socket.on('connect_error', (err) => {
    showMessage('Connection failed. Trying to reconnect...', 'error');
    console.error('Connection error:', err);
});

socket.on('reconnect_attempt', () => {
    showMessage('Attempting to reconnect...', 'error');
});

socket.on('reconnect_failed', () => {
    showMessage('Failed to reconnect. Please refresh the page.', 'error');
});

socket.on('error', (err) => {
    showMessage('Server error: ' + (err.message || 'Unknown error'), 'error');
    console.error('Socket error:', err);
});

socket.on('invalidWord', (data) => {
    showMessage(data.message || 'Invalid word selection', 'error');
});

function renderGrid(grid) {
    const table = document.getElementById('grid');
    table.innerHTML = '';
    
    grid.forEach((row, i) => {
        const tr = document.createElement('tr');
        row.forEach((cell, j) => {
            const td = document.createElement('td');
            td.textContent = cell.letter;
            if (cell.found) td.classList.add('found');
            td.dataset.x = i;
            td.dataset.y = j;
            
            td.addEventListener('click', () => handleCellClick(i, j));
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function handleCellClick(x, y) {
    if (!isMyTurn) return;
    
    const cell = document.querySelector(`td[data-x="${x}"][data-y="${y}"]`);
    cell.classList.add('selected');
    selectedCells.push({x, y});
    
    if (selectedCells.length === 2) {
        socket.emit('checkWord', selectedCells);
        selectedCells.forEach(({x, y}) => {
            document.querySelector(`td[data-x="${x}"][data-y="${y}"]`).classList.remove('selected');
        });
        selectedCells = [];
    }
}

function renderWordList(words) {
    const wordList = document.getElementById('word-list');
    wordList.innerHTML = words.map(word => `
        <div class="word-item">${word}</div>
    `).join('');
}

function updateTimer() {
    const now = new Date();
    const elapsed = new Date(now - startTime);
    const minutes = elapsed.getUTCMinutes().toString().padStart(2, '0');
    const seconds = elapsed.getUTCSeconds().toString().padStart(2, '0');
    document.getElementById('time').textContent = `${minutes}:${seconds}`;
}

// Modify the initGame function
function initGame() {
    // Set default player name
    playerName = `Player_${Math.floor(Math.random() * 1000)}`;
    document.getElementById('player-id').textContent = playerName;
    
    // Connect to server immediately
    setupSocket();
    setupEventListeners();
    
    // Join game automatically
    socket.emit('join', playerName);
}

// Update the connection handling
function setupSocket() {
    socket = io({
        reconnectionAttempts: 5,
        reconnectionDelay: RECONNECT_DELAY,
        timeout: CONNECTION_CHECK_INTERVAL
    });

    // Add connection quality monitoring
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping');
        }
    }, CONNECTION_CHECK_INTERVAL);

    // Handle game full scenario
    socket.on('gameFull', () => {
        showMessage('Game is full. Please try again later.', 'error');
        setTimeout(() => {
            window.location.reload();
        }, 5000);
    });

    // Add these new event handlers
    socket.on('playerJoined', (playerId) => {
        showMessage(`Player ${playerId.substring(0, 4)} joined`, 'info');
    });

    socket.on('playerLeft', (playerId) => {
        showMessage(`Player ${playerId.substring(0, 4)} left`, 'info');
    });

    // Rest of socket handlers remain the same...
}

function setupEventListeners() {
    // Implementation of setupEventListeners function
}

// Add this function to show messages
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message message-${type}`;
    
    // Auto-hide after delay
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        messageEl.className = 'message';
    }, delay);
}

// Modify the grid creation code to use maximum available space
function createGrid(rows, cols) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    
    // Calculate cell size based on available space
    const gridContainer = document.querySelector('.word-grid');
    const cellSize = Math.min(
        Math.floor(gridContainer.clientWidth / cols),
        Math.floor(gridContainer.clientHeight / rows)
    );
    
    for (let i = 0; i < rows; i++) {
        const row = grid.insertRow();
        for (let j = 0; j < cols; j++) {
            const cell = row.insertCell();
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            // Rest of cell setup...
        }
    }
}

// 1. Render grid
function renderGrid(grid) {
    const container = document.getElementById('grid');
    container.innerHTML = '';
    
    grid.forEach((row, y) => {
        const tr = container.insertRow();
        row.forEach((cell, x) => {
            const td = tr.insertCell();
            td.textContent = cell;
            td.dataset.x = x;
            td.dataset.y = y;
            td.addEventListener('click', handleCellClick);
        });
    });
}

// 2. Render word list
function renderWordList(wordList) {
    const listEl = document.getElementById('word-list');
    listEl.innerHTML = '';
    
    wordList.forEach(word => {
        const div = document.createElement('div');
        div.textContent = word;
        div.dataset.word = word;
        listEl.appendChild(div);
    });
}

// 3. Handle word selection
function handleCellClick(event) {
    if (!startCell) {
        startCell = event.target;
        startCell.classList.add('selected-start');
        return;
    }

    const endCell = event.target;
    const startX = parseInt(startCell.dataset.x);
    const startY = parseInt(startCell.dataset.y);
    const endX = parseInt(endCell.dataset.x);
    const endY = parseInt(endCell.dataset.y);

    // Validate coordinates
    if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
        throw new Error('Invalid cell coordinates');
    }

    const { direction, letters } = getSelectedLetters(startX, startY, endX, endY);
    
    if (!direction) {
        showMessage('Please select in a straight line', 'error');
        return;
    }

    const selectedWord = letters.join('');
    if (selectedWord.length < 3) {
        showMessage('Word must be at least 3 letters', 'error');
        return;
    }

    socket.emit('submitWord', { 
        word: selectedWord, 
        playerId: socket.id 
    });
    
    highlightCells(startX, startY, endX, endY, direction);
    
    // Reset selection
    document.querySelectorAll('.selected-start, .selected').forEach(c => {
        c.classList.remove('selected-start', 'selected');
    });
    startCell = null;
}

function getSelectedLetters(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(Math.abs(dx), Math.abs(dy)) + 1;
    let direction = null;
    const letters = [];

    if (dx === 0 && dy !== 0) { // Vertical
        direction = 'vertical';
        const step = dy > 0 ? 1 : -1;
        for (let i = 0; i < length; i++) {
            const y = startY + (i * step);
            const cell = document.querySelector(`[data-x="${startX}"][data-y="${y}"]`);
            letters.push(cell.textContent.trim());
        }
    } else if (dy === 0 && dx !== 0) { // Horizontal
        direction = 'horizontal';
        const step = dx > 0 ? 1 : -1;
        for (let i = 0; i < length; i++) {
            const x = startX + (i * step);
            const cell = document.querySelector(`[data-x="${x}"][data-y="${startY}"]`);
            letters.push(cell.textContent.trim());
        }
    } else if (Math.abs(dx) === Math.abs(dy)) { // Diagonal
        direction = 'diagonal';
        const xStep = dx > 0 ? 1 : -1;
        const yStep = dy > 0 ? 1 : -1;
        for (let i = 0; i < length; i++) {
            const x = startX + (i * xStep);
            const y = startY + (i * yStep);
            const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            letters.push(cell.textContent.trim());
        }
    }

    return { direction, letters };
}

function highlightCells(startX, startY, endX, endY, direction) {
    // Implementation to highlight cells based on direction
}

// 5. Update game state
socket.on('gameState', (state) => {
    // Update UI based on game state
    renderGrid(state.puzzle.grid);
    renderWordList(state.puzzle.words);
    
    // Update scores
    updateScoreboard(state.players);
});

// 6. Display winner
socket.on('gameOver', ({ winner, scores }) => {
    const winnerEl = document.createElement('div');
    winnerEl.className = 'winner-message';
    winnerEl.innerHTML = `
        <h2>Game Over!</h2>
        <p>Winner: Player ${winner} with ${scores[winner].score} points</p>
    `;
    document.body.appendChild(winnerEl);
});

// Add this at the BOTTOM of the file to initialize the game
document.addEventListener('DOMContentLoaded', () => {
    initGame();
}); 