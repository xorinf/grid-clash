console.log('[Client] multiplayer.js script successfully loaded.');

// Connect to the Socket.IO server
// The server URL might need adjustment depending on your deployment
const socket = io();

// --- Read Player Name from LocalStorage ---
let localPlayerName = 'Player'; // Default name
try {
    const storedDetails = localStorage.getItem('playerDetails');
    if (storedDetails) {
        const details = JSON.parse(storedDetails);
        if (details && details.name) {
            localPlayerName = details.name;
        }
    }
} catch (e) {
    console.error('Error reading player details from localStorage:', e);
}

// --- DOM Elements ---
const lobbyContainer = document.getElementById('lobbyContainer');
const gameContainer = document.getElementById('gameContainer');
const statusMessage = document.getElementById('statusMessage');
const playerListDiv = document.getElementById('playerList');
const readyButton = document.getElementById('readyButton'); // Currently unused on server, but keep for potential future use
const waitingMessage = document.getElementById('waitingMessage');

const myScoreDisplay = document.getElementById('myScore');
const opponentScoreDisplay = document.getElementById('opponentScore');
const timerDisplay = document.getElementById('time');
const wordListDiv = document.getElementById('word-list');
const gridTable = document.getElementById('grid');
const userMessagesDiv = document.getElementById('userMessages');
const connectionIndicator = document.getElementById('connectionIndicator');

// Game Over Modal Elements
const gameOverModal = document.getElementById('gameOverModal');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverReason = document.getElementById('gameOverReason');
const gameOverScores = document.getElementById('gameOverScores');
const playAgainButton = document.getElementById('playAgainButton');

// Settings Form Elements
const settingsForm = document.getElementById('gameSettingsMulti');
const createGameButton = document.getElementById('createGameButton');
const joinGameSection = document.getElementById('joinGameSection');
const joinGameButton = document.getElementById('joinGameButton');
const categorySelect = document.getElementById('categoryMulti');
const difficultySelect = document.getElementById('difficultyMulti');

// --- Game State Variables ---
let myPlayerId = null;
let currentGrid = [];
let wordsToFind = [];
let foundWords = new Set(); // Words found by *anyone* in the game
let foundByPlayer = {}; // Map: word -> {playerId, playerName}
let isSelecting = false;
let selectedCells = [];
let startCell = { x: -1, y: -1 };
let currentWord = '';

// --- Utility Functions ---
function renderGrid(gridData) {
    currentGrid = gridData;
    gridTable.innerHTML = ''; // Clear previous grid
    const tbody = document.createElement('tbody');
    gridData.forEach((row, y) => {
        const tr = document.createElement('tr');
        row.forEach((cell, x) => {
            const td = document.createElement('td');
            td.textContent = cell;
            td.dataset.x = x;
            td.dataset.y = y;
            td.addEventListener('mousedown', handleMouseDown);
            td.addEventListener('mousemove', handleMouseMove);
            // Mouseup is handled globally
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    gridTable.appendChild(tbody);
}

function renderWordList(words) {
    wordsToFind = words.map(w => w.toUpperCase());
    wordListDiv.innerHTML = wordsToFind.map(word => {
        const isFound = foundWords.has(word);
        const finder = foundByPlayer[word];
        let classes = 'word-item';
        let suffix = '';
        if (isFound) {
            classes += ' found';
            if (finder) {
                // Add class based on who found it
                classes += (finder.playerId === myPlayerId) ? ' found-by-me' : ' found-by-opponent';
                suffix = ` (${finder.playerName})`; // Indicate finder
            }
        }
        return `<div class="${classes}">${word}${suffix}</div>`;
    }).join('');
}

function updateScores(scores) {
    const myScore = scores[myPlayerId] || 0;
    myScoreDisplay.textContent = myScore;

    // Find opponent's score
    let opponentScore = 0;
    for (const [playerId, score] of Object.entries(scores)) {
        if (playerId !== myPlayerId) {
            opponentScore = score;
            break; // Assuming only 2 players
        }
    }
    opponentScoreDisplay.textContent = opponentScore;
}

function updateTimer(timeLeft) {
    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
}

// Function to display messages to the user
let messageTimeout = null;
function showMessage(text, type = 'info', duration = 3000) {
    if (messageTimeout) clearTimeout(messageTimeout);
    userMessagesDiv.innerHTML = `<span class="message message-${type}">${text}</span>`;
    messageTimeout = setTimeout(() => {
        userMessagesDiv.innerHTML = '';
    }, duration);
}

function showLobby(isGameAvailable) {
    console.log(`[Client] Showing lobby. Is game available? ${isGameAvailable}`);
    lobbyContainer.style.display = 'block';
    gameContainer.style.display = 'none';
    gameOverModal.style.display = 'none';
    waitingMessage.style.display = 'none';
    playerListDiv.style.display = 'none';

    if (isGameAvailable) {
        settingsForm.style.display = 'none';
        joinGameSection.style.display = 'block';
        joinGameButton.disabled = false;
        statusMessage.textContent = 'A game lobby is available!';
    } else {
        settingsForm.style.display = 'block';
        joinGameSection.style.display = 'none';
        createGameButton.disabled = false;
        statusMessage.textContent = 'Create a new game or wait for one.';
    }
}

function showWaiting(message = 'Waiting for opponent...') {
    lobbyContainer.style.display = 'block';
    gameContainer.style.display = 'none';
    settingsForm.style.display = 'none';
    joinGameSection.style.display = 'none';
    statusMessage.textContent = message;
    waitingMessage.textContent = message; // Use the same message
    waitingMessage.style.display = 'block';
    playerListDiv.style.display = 'block';
    playerListDiv.innerHTML = '<h3>Players:</h3>You'; // Show self
}

function showGame(gameData) {
    console.log('[Client] Entering showGame function...');
    myPlayerId = socket.id;
    lobbyContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    try {
        renderGrid(gameData.grid);
        console.log('[Client] Grid rendered.');
        renderWordList(gameData.words);
        console.log('[Client] Word list rendered.');
        const opponent = gameData.players.find(p => p.id !== myPlayerId);
        const initialScores = { [myPlayerId]: 0 };
        if (opponent) { initialScores[opponent.id] = 0; }
        updateScores(initialScores);
        console.log('[Client] Scores updated.');
        updateTimer(gameData.initialTime);
        console.log('[Client] Timer updated.');
        document.querySelector('.player-self h3').textContent = `You (${localPlayerName})`;
        document.querySelector('.player-opponent h3').textContent = opponent ? `Opponent (${opponent.name})` : 'Opponent'; // Opponent joined
        console.log('[Client] Player names displayed.');
    } catch (renderError) {
        console.error('[Client] Error during initial game render:', renderError);
        showMessage('Error rendering game elements. Please refresh.', 'error', 10000);
        resetClientState(); showLobby(false); // Assume no game available after error
        statusMessage.textContent = 'Error loading game. Ready to try again.';
    }
    console.log('[Client] showGame function finished.');
}

function showGameOver(data) {
    gameContainer.style.pointerEvents = 'none'; // Disable grid interaction

    let title = 'Game Over!';
    let reason = '';

    if (data.reason === 'time_up') {
        reason = 'Time ran out!';
    } else if (data.reason === 'all_words_found') {
        reason = 'All words were found!';
    } else if (data.reason === 'opponent_left') {
        title = 'Opponent Left';
        reason = 'Your opponent disconnected.';
    }

    if (data.isTie) {
        reason += ' It\'s a tie!';
    } else if (data.winner) {
        reason += data.winner.id === myPlayerId ? ' You won! 🎉' : ' You lost. 😞';
    }

    gameOverTitle.textContent = title;
    gameOverReason.textContent = reason;

    // Display final scores
    gameOverScores.innerHTML = data.scores
        .map(p => `<div>${p.name}: <strong>${p.score}</strong></div>`)
        .join('');

    gameOverModal.style.display = 'flex';

    // Add redirect after a delay
    const redirectDelay = 5000; // 5 seconds
    console.log(`[Client] Game over. Redirecting to homepage in ${redirectDelay / 1000} seconds.`);
    setTimeout(() => {
        window.location.href = '/'; // Redirect to homepage
    }, redirectDelay);
}

function resetClientState() {
    myPlayerId = null; currentGrid = []; wordsToFind = []; foundWords = new Set(); foundByPlayer = {};
    isSelecting = false; selectedCells = []; startCell = { x: -1, y: -1 }; currentWord = '';
    gridTable.innerHTML = ''; wordListDiv.innerHTML = ''; myScoreDisplay.textContent = '0';
    opponentScoreDisplay.textContent = '0'; timerDisplay.textContent = '00:00';
    gameOverModal.style.display = 'none'; userMessagesDiv.innerHTML = '';
    gameContainer.style.pointerEvents = 'auto';
    // Also reset button states in lobby
    createGameButton.disabled = false;
    joinGameButton.disabled = false;
}

// --- Socket Event Handlers ---
socket.on('connect', () => {
    myPlayerId = socket.id;
    console.log('Connected to server with ID:', socket.id);
    connectionIndicator.classList.remove('disconnected');
    connectionIndicator.classList.add('connected');
    statusMessage.textContent = 'Connected. Checking lobby status...';
    resetClientState(); // Ensure clean state
    // UI shown based on 'lobby-status' event
});

socket.on('lobby-status', ({ openGameAvailable }) => {
     console.log(`[Client] Received lobby-status: openGameAvailable=${openGameAvailable}`);
     if (gameContainer.style.display !== 'block' && gameOverModal.style.display !== 'flex') {
         showLobby(openGameAvailable);
     }
});

socket.io.on("reconnect", (attempt) => {
    console.log(`[Client] Reconnected successfully after ${attempt} attempts with new ID: ${socket.id}`);
    connectionIndicator.classList.remove('disconnected');
    connectionIndicator.classList.add('connected');
    resetClientState();
    statusMessage.textContent = "Reconnected. Checking lobby status...";
    // Server should send lobby-status upon connection
});

socket.on('status-update', (message) => {
    console.log('Status Update:', message);
    if (lobbyContainer.style.display === 'block' && gameContainer.style.display !== 'block') {
        if (message.includes('Waiting for an opponent')) {
            showWaiting(message);
        } else {
             statusMessage.textContent = message;
             // Refresh lobby view based on message content if needed
             if(message.includes('lobby is already open') || message.includes('No game lobby')) {
                  // Let lobby-status event handle the UI change primarily
             }
             // Handle case where opponent disconnects while THIS client was waiting
             if (message.includes('Previous waiting player disconnected') || message.includes('Matching player disconnected')) {
                  resetClientState();
                  showLobby(false); // Assume lobby is now closed/needs recreation
                  statusMessage.textContent = message + ' Create a new game?';
                  showMessage(message, 'warning');
             }
        }
    }
});

socket.on('game-starting', (gameData) => {
    console.log('[Client] ***** Received game-starting event! *****');
    console.log('[Client] Raw game data received:', JSON.stringify(gameData).substring(0, 300) + "...");
    try {
        if (gameContainer.style.display === 'block') { console.warn('[Client] Received game-starting event but game container is already visible. Ignoring.'); return; }
        console.log('[Client] Proceeding to process game-starting event...');
        foundWords = new Set(); foundByPlayer = {};
        showGame(gameData);
        console.log('[Client] Post-showGame call in game-starting handler.');
    } catch (error) {
        console.error('[Client] CRITICAL ERROR executing showGame from game-starting handler:', error);
        showMessage('Critical Error starting game display. Please refresh.', 'error', 15000);
        resetClientState(); showLobby(false);
        statusMessage.textContent = 'Error loading game. Please refresh.';
    }
});

socket.on('time-update', (timeLeft) => { updateTimer(timeLeft); });

socket.on('word-found', (data) => {
    console.log('Word found:', data);
    const word = data.word.toUpperCase();
    if (!foundWords.has(word)) {
        foundWords.add(word); foundByPlayer[word] = { playerId: data.playerId, playerName: data.playerName };
        renderWordList(wordsToFind);
        if (data.playerId === myPlayerId) { myScoreDisplay.textContent = data.score; showMessage(`You found: ${word}!`, 'success', 2000); }
        else { opponentScoreDisplay.textContent = data.score; showMessage(`${data.playerName} found: ${word}`, 'info', 2000); }
    }
});

socket.on('player-left', (data) => { showMessage(data.message || 'Opponent has left the game.', 'error', 4000); });

socket.on('game-over', (data) => { console.log('Game Over:', data); showGameOver(data); });

socket.on('invalid-word', (data) => {
    console.log('Invalid word submitted:', data.word, 'Reason:', data.reason);
    let message = `Invalid selection: ${data.word}.`;
    if (data.reason === 'already_found') { const finder = foundByPlayer[data.word.toUpperCase()]; message = `${data.word.toUpperCase()} already found by ${finder ? finder.playerName : 'someone'}.`; }
    showMessage(message, 'error'); gridTable.classList.add('invalid-shake'); setTimeout(() => gridTable.classList.remove('invalid-shake'), 500);
});

socket.on('error-message', (message) => {
    console.error('Server Error:', message);
    showMessage(`Server Error: ${message}`, 'error', 5000);
    if (gameContainer.style.display !== 'block') {
         statusMessage.textContent = 'Server error occurred. Try again?';
         // Reset button states if in lobby
         createGameButton.disabled = false;
         joinGameButton.disabled = false;
    }
});

// --- Event Listeners ---

settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedCategory = categorySelect.value;
    const selectedDifficulty = difficultySelect.value;
    const settings = { category: selectedCategory, difficulty: selectedDifficulty };
    console.log(`[Client] Emitting create-game with settings:`, settings);
    socket.emit('create-game', settings);
    createGameButton.disabled = true;
    statusMessage.textContent = 'Creating game...';
});

joinGameButton.addEventListener('click', () => {
    console.log('[Client] Emitting join-game');
    socket.emit('join-game');
    joinGameButton.disabled = true;
    statusMessage.textContent = 'Joining game...';
});

// Grid Interaction Logic (handleMouseDown, handleMouseMove, handleMouseUp, getCellsBetween) - No changes needed
function handleMouseDown(event) {
    if (event.target.tagName !== 'TD') return;
    isSelecting = true;
    const target = event.target;
    startCell = { x: parseInt(target.dataset.x), y: parseInt(target.dataset.y) };
    selectedCells = [target];
    target.classList.add('selected');
    document.addEventListener('mouseup', handleMouseUp, { once: true });
}

function handleMouseMove(event) {
    if (!isSelecting || event.target.tagName !== 'TD') return;
    const currentCell = event.target;
    const endCellCoords = { x: parseInt(currentCell.dataset.x), y: parseInt(currentCell.dataset.y) };
    const cellsOnLine = getCellsBetween(startCell, endCellCoords);
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    selectedCells = cellsOnLine;
    selectedCells.forEach(cell => cell.classList.add('selected'));
    currentWord = selectedCells.map(cell => cell.textContent).join('');
}

function handleMouseUp() {
    if (!isSelecting) return;
    isSelecting = false;
    if (currentWord.length > 1) {
        console.log(`Submitting word: ${currentWord}`);
        socket.emit('submit-word', { word: currentWord });
    }
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    selectedCells = [];
    currentWord = '';
    startCell = { x: -1, y: -1 };
}

function getCellsBetween(start, end) {
    const cells = [];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let currentX = start.x;
    let currentY = start.y;
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const isHorizontal = dy === 0;
    const isVertical = dx === 0;
    const isDiagonal = Math.abs(dx) === Math.abs(dy);
    if (!(isHorizontal || isVertical || isDiagonal)) {
        const startElem = gridTable.querySelector(`td[data-x="${start.x}"][data-y="${start.y}"]`);
        return startElem ? [startElem] : [];
    }
    for (let i = 0; i <= steps; i++) {
        const cell = gridTable.querySelector(`td[data-x="${currentX}"][data-y="${currentY}"]`);
        if (cell) {
            cells.push(cell);
        }
        currentX += stepX;
        currentY += stepY;
    }
    return cells;
}

// Highlight cells on the grid for a word found by server
function highlightFoundWordOnGrid(word, isMine) {
    // This is tricky without knowing the start/end coordinates from the server.
    // For now, we'll just rely on the word list updating.
    // A future improvement: server could send coordinates OR client could search.
    console.log(`Highlighting for ${word} (found by me: ${isMine}) - requires coordinates for visual effect.`);
    // Placeholder: Find the word item and ensure its class is correct
    const wordItems = wordListDiv.querySelectorAll('.word-item');
    wordItems.forEach(item => {
        if (item.textContent.trim().startsWith(word)) { // Basic check
            item.classList.add('found');
            item.classList.toggle('found-by-me', isMine);
            item.classList.toggle('found-by-opponent', !isMine);
        }
    });
}

document.addEventListener('mouseup', handleMouseUp);

console.log('Multiplayer JS loaded with Host/Join logic and auto-redirect.');