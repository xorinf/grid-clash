import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto'; // Use crypto for UUIDs
import fs from 'fs'; // Need fs for the include fallback

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
// const MAX_PLAYERS = 2; // Renamed below
const MAX_PLAYERS_PER_GAME = 2; // Multiplayer focused
const GAME_DURATION_SECONDS = 180; // 3 minutes per game
// const GAME_TIMEOUT = 60 * 60 * 1000; // 1 hour - Removed, using GAME_DURATION_SECONDS

// Removed global gameState and related functions

// --- Game Generation Logic (Similar to Single Player) ---
const DIRECTIONS = {
    HORIZONTAL: { dx: 1, dy: 0 },
    VERTICAL: { dx: 0, dy: 1 },
    DIAGONAL_DR: { dx: 1, dy: 1 }, // Down-Right
    HORIZONTAL_REV: { dx: -1, dy: 0 },
    VERTICAL_REV: { dx: 0, dy: -1 },
    DIAGONAL_UL: { dx: -1, dy: -1 }, // Up-Left
    DIAGONAL_UR: { dx: 1, dy: -1 }, // Up-Right
    DIAGONAL_DL: { dx: -1, dy: 1 }  // Down-Left
};
const ALL_DIRECTIONS = Object.keys(DIRECTIONS);
const GRID_SIZE = 15; // Standard size for multiplayer

function generatePuzzleForGame(wordsToPlace) {
    console.log(`[PuzzleGen] Attempting to place ${wordsToPlace.length} words:`, wordsToPlace);
    const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
    const successfullyPlacedWords = []; // Store words that were actually placed
    const MAX_PLACEMENT_ATTEMPTS = 200; // Increased attempts

    const canPlaceWord = (word, startX, startY, directionKey, currentGrid) => {
        const { dx, dy } = DIRECTIONS[directionKey];
        for (let i = 0; i < word.length; i++) {
            const currX = startX + (dx * i);
            const currY = startY + (dy * i);
            if (currX < 0 || currX >= GRID_SIZE || currY < 0 || currY >= GRID_SIZE) return false;
            const cellContent = currentGrid[currY][currX];
            if (cellContent !== '' && cellContent !== word[i]) return false;
        }
        return true;
    };

    const insertWord = (word, startX, startY, directionKey, targetGrid) => {
        const { dx, dy } = DIRECTIONS[directionKey];
        for (let i = 0; i < word.length; i++) {
            const currX = startX + (dx * i);
            const currY = startY + (dy * i);
            targetGrid[currY][currX] = word[i];
        }
    };

    // Iterate through the requested words
    wordsToPlace.forEach(word => {
        const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
        if (!cleanWord || cleanWord.length > GRID_SIZE) { // Basic check for length
             console.warn(`[PuzzleGen] Skipping word '${word}' (length ${cleanWord.length} > grid size ${GRID_SIZE} or empty).`);
             return;
        }

        let placed = false;
        let attempts = 0;
        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) { // Use increased attempts
            attempts++;
            const directionKey = ALL_DIRECTIONS[Math.floor(Math.random() * ALL_DIRECTIONS.length)];
            const { dx, dy } = DIRECTIONS[directionKey];

            // Calculate valid start positions based on direction
            const maxX = dx > 0 ? GRID_SIZE - cleanWord.length : (dx < 0 ? GRID_SIZE - 1 : GRID_SIZE - 1);
            const minX = dx < 0 ? cleanWord.length - 1 : 0;
            const maxY = dy > 0 ? GRID_SIZE - cleanWord.length : (dy < 0 ? GRID_SIZE - 1 : GRID_SIZE - 1);
            const minY = dy < 0 ? cleanWord.length - 1 : 0;

            if (maxX < minX || maxY < minY) continue; // Word too long for grid in this direction

            const startX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
            const startY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

            if (canPlaceWord(cleanWord, startX, startY, directionKey, grid)) {
                insertWord(cleanWord, startX, startY, directionKey, grid);
                successfullyPlacedWords.push(cleanWord); // Add to list of successfully placed words
                placed = true;
            }
        }
        if (!placed) {
            console.warn(`[PuzzleGen] Could not place word: ${cleanWord} after ${MAX_PLACEMENT_ATTEMPTS} attempts.`);
        }
    });

    console.log(`[PuzzleGen] Successfully placed ${successfullyPlacedWords.length}/${wordsToPlace.length} words.`);

    // Fill empty cells
    const freq = 'EEEEEEEEEETAAAAOIIINNNSSSHRRRLLLDDCCUUMMFFGGYYWPPBBVVKJXQZ';
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === '') {
                grid[y][x] = freq[Math.floor(Math.random() * freq.length)];
            }
        }
    }

    return {
        grid: grid,
        words: successfullyPlacedWords // Return only the words that were actually placed
    };
}
// --- End Game Generation Logic ---

// Server setup
const app = express();
const server = createServer(app);
const io = new Server(server);

// Define word counts per difficulty
const DIFFICULTY_WORDS = {
    easy: 10,
    medium: 15,
    hard: 20,
};

// Modify GameManager class
class GameManager {
    constructor() {
        this.games = new Map();
        this.openLobbyId = null; // ID of the ONE game waiting for players
        this.wordLists = {
            general: ['NODE', 'REACT', 'SOCKET', 'EXPRESS', 'HTML', 'CSS', 'GRID', 'SERVER', 'CLIENT', 'DATABASE', 'ASYNC', 'AWAIT', 'FETCH', 'LOGIN', 'STYLE', 'VARIABLE', 'FUNCTION', 'OBJECT', 'CLASS', 'MODULE'],
            tech: ['JAVASCRIPT', 'TYPESCRIPT', 'PYTHON', 'RUST', 'GOLANG', 'DOCKER', 'KUBERNETES', 'TERRAFORM', 'WEBPACK', 'BABEL', 'ANGULAR', 'VUEJS', 'SVELTE', 'MYSQL', 'POSTGRES', 'FIREBASE', 'ALGORITHM', 'DEBUGGING', 'NETWORK', 'SECURITY'],
            // Add more themes if needed
            animals: ['LION', 'TIGER', 'ELEPHANT', 'GIRAFFE', 'ZEBRA', 'MONKEY', 'KANGAROO', 'PENGUIN', 'DOLPHIN', 'WHALE', 'BEAR', 'WOLF', 'EAGLE', 'SNAKE', 'CROCODILE', 'HIPPO', 'RHINO', 'CHEETAH', 'LEOPARD', 'PANDA'],
            food: ['PIZZA', 'BURGER', 'PASTA', 'SUSHI', 'SALAD', 'STEAK', 'CHICKEN', 'SOUP', 'BREAD', 'CHEESE', 'APPLE', 'BANANA', 'ORANGE', 'GRAPES', 'WATERMELON', 'CHOCOLATE', 'CAKE', 'COOKIE', 'ICECREAM', 'FRIES'],
            countries: ['CANADA', 'BRAZIL', 'FRANCE', 'GERMANY', 'INDIA', 'JAPAN', 'MEXICO', 'RUSSIA', 'SPAIN', 'EGYPT', 'KENYA', 'AUSTRALIA', 'ARGENTINA', 'CHINA', 'ITALY', 'NIGERIA', 'SWEDEN', 'THAILAND', 'TURKEY', 'VIETNAM']
        };
    }

    createGame(socket, settings) {
        if (socket.currentGameId) {
             console.log(`[GameManager] Socket ${socket.id} tried to create game but is already in ${socket.currentGameId}.`);
             socket.emit('error-message', 'You are already in a game.');
             return null;
        }
        if (this.openLobbyId && this.games.has(this.openLobbyId)) {
            console.log(`[GameManager] Socket ${socket.id} tried to create game, but lobby ${this.openLobbyId} already exists.`);
            socket.emit('error-message', 'Another game lobby is already open. Try joining.');
             io.emit('lobby-status', { openGameAvailable: true });
            return null;
        }
        if (!settings || !this.wordLists[settings.category] || !DIFFICULTY_WORDS[settings.difficulty]) {
            console.error(`[GameManager] Invalid settings for createGame from ${socket.id}:`, settings);
            socket.emit('error-message', 'Invalid game settings provided.');
            return null;
        }

        const gameId = `game_${crypto.randomUUID()}`;
        console.log(`[GameManager] Creating new game lobby ${gameId} hosted by ${socket.id} with settings:`, settings);

        const game = {
            id: gameId,
            players: new Map(),
            puzzle: null, // Generated only when starting
            status: 'waiting', // New status: waiting for opponent
            hostId: socket.id, // Store the host
            foundWords: new Map(),
            scores: {},
            timer: null,
            startTime: null,
            timeLeft: GAME_DURATION_SECONDS,
            settings: settings // Store settings chosen by host
        };

        const hostPlayerInfo = { id: socket.id, name: `Player_${socket.id.substring(0, 4)}` };
        game.players.set(socket.id, hostPlayerInfo);
        game.scores[socket.id] = 0;

        this.games.set(gameId, game);
        this.openLobbyId = gameId; // Mark this game as the open lobby

        socket.currentGameId = gameId; // Assign game ID to host socket
        socket.join(gameId); // Host joins the room
        console.log(`[GameManager] Host ${socket.id} joined room ${gameId}.`);

        socket.emit('status-update', 'Game created. Waiting for an opponent to join...');
        socket.broadcast.emit('lobby-status', { openGameAvailable: true });

        return gameId;
    }

    joinGame(socket) {
        if (socket.currentGameId) {
             console.log(`[GameManager] Socket ${socket.id} tried to join game but is already in ${socket.currentGameId}.`);
             socket.emit('error-message', 'You are already in a game.');
             return null;
        }
        if (!this.openLobbyId || !this.games.has(this.openLobbyId)) {
            console.log(`[GameManager] Socket ${socket.id} tried to join, but no open lobby found.`);
            socket.emit('error-message', 'No game lobby is currently available to join.');
            socket.emit('lobby-status', { openGameAvailable: false });
            return null;
        }

        const gameId = this.openLobbyId;
        const game = this.games.get(gameId);

        if (game.players.size >= MAX_PLAYERS_PER_GAME) {
            console.log(`[GameManager] Socket ${socket.id} tried to join lobby ${gameId}, but it's full.`);
            socket.emit('error-message', 'The game lobby is already full.');
            this.openLobbyId = null;
            io.emit('lobby-status', { openGameAvailable: false });
            return null;
        }

        console.log(`[GameManager] Player ${socket.id} joining game ${gameId} hosted by ${game.hostId}.`);

        const joinerPlayerInfo = { id: socket.id, name: `Player_${socket.id.substring(0, 4)}` };
        game.players.set(socket.id, joinerPlayerInfo);
        game.scores[socket.id] = 0;

        socket.currentGameId = gameId;
        socket.join(gameId);
        console.log(`[GameManager] Joiner ${socket.id} joined room ${gameId}.`);

        // --- Start game logic --- 
        this.openLobbyId = null;
        game.status = 'starting';
        console.log(`[GameManager] Game ${gameId} is now full and starting.`);

        const wordListSource = this.wordLists[game.settings.category];
        const wordCount = DIFFICULTY_WORDS[game.settings.difficulty];
        const selectedWords = wordListSource.sort(() => 0.5 - Math.random()).slice(0, wordCount);

        // Generate the puzzle - This now returns { grid, words (placed) }
        game.puzzle = generatePuzzleForGame(selectedWords);
        console.log(`[GameManager] Generated puzzle for game ${gameId}. Placed ${game.puzzle.words.length} words.`);

        // Prepare and emit game data - Use the words list from the generated puzzle
        const gameDataForClient = {
             gameId: game.id,
             grid: game.puzzle.grid,
             words: game.puzzle.words, // Use the successfully placed words
             players: Array.from(game.players.values()),
             initialTime: GAME_DURATION_SECONDS,
             settings: game.settings
        };
        // Verify room members before emitting
        const roomMembers = io.sockets.adapter.rooms.get(gameId);
        console.log(`[GameManager] Sockets currently in room ${gameId}: ${roomMembers ? Array.from(roomMembers) : '[]'}`);
        console.log(`[GameManager] Emitting 'game-starting' to room ${gameId} with ${game.puzzle.words.length} words...`);
        io.to(gameId).emit('game-starting', gameDataForClient);
        console.log(`[GameManager] ***** 'game-starting' event emitted to room ${gameId}. *****`);

        this.startGameTimer(gameId);
        console.log(`[GameManager] Game timer started for ${gameId}.`);

        io.emit('lobby-status', { openGameAvailable: false });

        return gameId;
    }

    startGameTimer(gameId) {
        const game = this.games.get(gameId);
        if (!game || game.timer) return; // Already started or game not found

        game.startTime = Date.now();
        game.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
            game.timeLeft = GAME_DURATION_SECONDS - elapsed;

            if (game.timeLeft <= 0) {
                this.endGame(gameId, 'time_up');
            } else {
                // Send time updates to the room
                 io.to(gameId).emit('time-update', game.timeLeft);
            }
        }, 1000);
    }

    handlePlayerDisconnect(socketId) {
        const socket = io.sockets.sockets.get(socketId);
        const gameId = socket?.currentGameId;

        if (!gameId || !this.games.has(gameId)) {
            console.log(`[GameManager] Disconnected player ${socketId} was not in an active game.`);
            return;
        }

        const game = this.games.get(gameId);
        console.log(`[GameManager] Player ${socketId} disconnected from game ${game.id}`);
        game.players.delete(socketId);

        if (game.status === 'waiting' && game.hostId === socketId) {
            console.log(`[GameManager] Host ${socketId} disconnected from waiting lobby ${gameId}. Cancelling lobby.`);
            this.games.delete(gameId);
            this.openLobbyId = null;
             io.emit('lobby-status', { openGameAvailable: false });
        }
        else if (game.status === 'starting') {
            if(socket) socket.currentGameId = null;
            console.log(`[GameManager] Notifying room ${game.id} that player ${socketId} left.`);
            io.to(game.id).emit('player-left', { playerId: socketId, message: 'Opponent disconnected.' });
            this.endGame(game.id, 'opponent_left');
        }
         else if (game.players.size === 0) {
            console.log(`[GameManager] Last player left game ${game.id}. Cleaning up.`);
            clearInterval(game.timer);
            this.games.delete(game.id);
            if (this.openLobbyId === gameId) {
                this.openLobbyId = null;
                io.emit('lobby-status', { openGameAvailable: false });
            }
        }
    }

    validateWord(gameId, playerId, word) {
        const game = this.games.get(gameId);
        // Ensure game exists and is in the 'starting' state (i.e., active)
        if (!game || game.status !== 'starting') {
            console.log(`Word validation failed: Game ${gameId} not found or not active.`);
            return false;
        }

        const upperWord = word.toUpperCase();

        // Check if it's a valid word for the puzzle and hasn't been found yet
        const isValid = game.puzzle.words.includes(upperWord);
        const alreadyFound = game.foundWords.has(upperWord);

        if (isValid && !alreadyFound) {
            game.foundWords.set(upperWord, playerId); // Mark word as found by this player
            game.scores[playerId] = (game.scores[playerId] || 0) + upperWord.length * 10; // Add score
            console.log(`Player ${playerId} found word ${upperWord} in game ${gameId}. New score: ${game.scores[playerId]}`);
            return true;
        } else {
            console.log(`Word validation failed for ${upperWord} in game ${gameId}. Valid: ${isValid}, Found: ${alreadyFound}`);
            return false;
        }
    }

    // Ends the game and notifies players
     endGame(gameId, reason = 'unknown') {
         const game = this.games.get(gameId);
         if (!game || game.status === 'finished') return; // Game not found or already finished

         console.log(`Ending game ${gameId}. Reason: ${reason}`);

        clearInterval(game.timer);
        game.status = 'finished';
         game.timer = null; // Clear timer interval ID

         // Determine winner based on score
         let winnerId = null;
         let highScore = -1;
         let isTie = false;

         const finalScores = [];
          // Use game.players which should still exist even if one player disconnected just before this call
          const currentPlayers = Array.from(game.players.keys());
          const allPlayerIdsInvolved = new Set([...currentPlayers, ...Object.keys(game.scores)]); // Include players who might have disconnected but had score

          for (const playerId of allPlayerIdsInvolved) {
              const playerInfo = game.players.get(playerId); // May be undefined if player disconnected
              const score = game.scores[playerId] || 0;
              // Avoid optional chaining here
              const playerName = playerInfo ? playerInfo.name : `Player_${playerId.substring(0,4)}`;
              finalScores.push({
                    id: playerId,
                    // Use stored name, default if player disconnected before game end
                    // name: playerInfo?.name || `Player_${playerId.substring(0,4)}`,
                    name: playerName,
                    score: score
              });

              if (score > highScore) {
                  highScore = score;
                  winnerId = playerId;
                  isTie = false;
              } else if (score === highScore && highScore !== -1) { // Ensure it's not the initial state
                   isTie = true;
              }
          }


         const winnerInfo = isTie ? null : game.players.get(winnerId); // Get winner info if not a tie and player still connected

         io.to(gameId).emit('game-over', {
             reason: reason,
             // winner: isTie ? null : { id: winnerId, name: winnerInfo?.name || `Player_${winnerId?.substring(0,4)}` }, // Send null for ties or if winner disconnected
             // Avoid optional chaining for winner name too
             winner: isTie ? null : { id: winnerId, name: winnerInfo ? winnerInfo.name : `Player_${winnerId?.substring(0,4)}` },
             isTie: isTie,
             scores: finalScores.sort((a, b) => b.score - a.score) // Send sorted scores
         });

         // Disconnect sockets from the room after sending the final message
         const socketsInRoom = io.sockets.adapter.rooms.get(gameId);
         if (socketsInRoom) {
            socketsInRoom.forEach(socketId => {
                const socketInstance = io.sockets.sockets.get(socketId);
                if (socketInstance) {
                    socketInstance.leave(gameId);
                }
            });
         }


         // Clean up the game after a short delay to allow messages to send
         setTimeout(() => {
        this.games.delete(gameId);
              console.log(`Game ${gameId} removed from active games.`);
         }, 5000); // 5-second delay
     }

     checkGameCompletion(gameId) {
         const game = this.games.get(gameId);
         if (!game) return;
         // Check if game is still active before declaring completion
         if (game.status === 'starting' && game.foundWords.size === game.puzzle.words.length) {
             this.endGame(gameId, 'all_words_found');
         }
     }
}

const gameManager = new GameManager();

// Socket.IO Connection Handling
io.on('connection', (socket) => {
    console.log(`[Socket] Player connected: ${socket.id}`);
    // Initialize currentGameId on socket object
    socket.currentGameId = null;

    socket.emit('lobby-status', { openGameAvailable: (gameManager.openLobbyId !== null && gameManager.games.has(gameManager.openLobbyId)) });

    socket.on('create-game', (settings) => {
        console.log(`[Socket] Player ${socket.id} executing create-game with settings:`, settings);
        gameManager.createGame(socket, settings);
    });

    socket.on('join-game', () => {
        console.log(`[Socket] Player ${socket.id} executing join-game.`);
        gameManager.joinGame(socket);
    });

    // Handle player submitting a word
    socket.on('submit-word', ({ word }) => {
        const gameId = socket.currentGameId; // Use stored gameId
        if (!gameId) {
            socket.emit('error-message', 'You are not currently in an active game.');
            console.log(`[Socket] Submit word failed: Socket ${socket.id} has no currentGameId.`);
            return;
        }
        const game = gameManager.games.get(gameId);
        if (!game) {
             socket.emit('error-message', 'Game not found.');
             console.log(`Submit word failed: Game ${gameId} not found for socket ${socket.id}.`);
             socket.currentGameId = null; // Reset if game doesn't exist anymore
             return;
        }
        if (game.status !== 'starting') {
             socket.emit('error-message', 'Game is not active or has finished.');
             console.log(`Submit word failed: Game ${gameId} status is ${game.status}.`);
             return;
        }

        if (gameManager.validateWord(gameId, socket.id, word)) {
            // Ensure score is updated before sending
            const score = game.scores[socket.id];
            const foundWord = word.toUpperCase();
            // Avoid optional chaining for player name
            const playerInfo = game.players.get(socket.id);
            const playerName = playerInfo ? playerInfo.name : `Player_${socket.id.substring(0, 4)}`;

            console.log(`Broadcasting 'word-found' for ${foundWord} by ${playerName} in game ${gameId}`);
            // Broadcast to the room that the word was found
            io.to(gameId).emit('word-found', {
                playerId: socket.id,
                playerName: playerName,
                word: foundWord,
                score: score, // Send the updated score
                foundWordsCount: game.foundWords.size,
                totalWords: game.puzzle.words.length
            });
            // Check if the game is completed
             gameManager.checkGameCompletion(gameId);
        } else {
            // Optionally notify the player if the word was invalid or already found
             const alreadyFoundBy = game.foundWords.get(word.toUpperCase());
             if (alreadyFoundBy) {
                  console.log(`Word ${word} already found by ${alreadyFoundBy} in game ${gameId}.`);
                  socket.emit('invalid-word', { word: word, reason: 'already_found', finderId: alreadyFoundBy });
             } else {
                  console.log(`Word ${word} is invalid for game ${gameId}.`);
                  socket.emit('invalid-word', { word: word, reason: 'not_in_list' });
             }
        }
    });


    // Handle player disconnect
    socket.on('disconnect', (reason) => {
        console.log(`[Socket] Player disconnected: ${socket.id}. Reason: ${reason}`);
        gameManager.handlePlayerDisconnect(socket.id); // Pass socketId, function gets gameId from socket obj if needed
    });

    // Add more handlers as needed (e.g., chat messages, hints)

});

// Static file serving - Place this before the include fallback
app.use(express.static(path.join(__dirname, 'public')));

// Simple API endpoint (example)
app.get('/api/stats', (req, res) => {
    res.json({
        activeGames: gameManager.games.size,
        openLobbies: gameManager.openLobbyId ? 1 : 0,
        totalPlayersOnline: io.engine.clientsCount // Approximate total connections
    });
});

// Fallback for HTML includes (if you're using them without a template engine)
// This approach is basic and might have security implications if not careful
app.use((req, res, next) => {
    // A better approach would be a proper template engine like EJS, Handlebars, etc.
    // This is just a placeholder if you rely on <!--#include virtual="..." -->
    // Note: This requires manual handling for each file type or a more robust solution.
    if (req.path.endsWith('.html') && !req.path.startsWith('/api/')) { // Avoid interfering with API routes
        const filePath = path.join(__dirname, 'public', req.path);
        fs.readFile(filePath, 'utf8', (err, content) => {
            if (err) {
                 // If file not found, let express handle the 404 later
                 if (err.code === 'ENOENT') {
                    console.log(`HTML file not found: ${filePath}`);
                    next();
                 } else {
                    console.error(`Error reading HTML file ${filePath}:`, err);
                    next(err); // Pass other errors to Express error handler
                 }
                 return;
            }
            // VERY basic include processing - replace with actual file content
            // This is INEFFICIENT and potentially UNSAFE for complex cases
            try {
                 const processedContent = content.replace(/<!--#include virtual="(.+?)" -->/g, (match, includePath) => {
                     const safeIncludePath = path.normalize(includePath).replace(/^(\.\.[\/\\])+/, ''); // Basic path sanitization
                     const includeFilePath = path.join(__dirname, 'public', safeIncludePath);
                     console.log(`Including file: ${includeFilePath}`);
                     try {
                         return fs.readFileSync(includeFilePath, 'utf8');
                     } catch (includeErr) {
                         console.error(`Failed to include ${includeFilePath}:`, includeErr);
                         return `<!-- Include Error: ${safeIncludePath} not found or unreadable -->`;
                     }
                 });
                  res.type('html').send(processedContent);
            } catch (processingError) {
                 console.error("Error during include processing:", processingError);
                 next(processingError);
            }
        });
    } else {
        next(); // Pass to other middleware or static serving
    }
});


// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Removed redundant functions and global gameState
// Removed old GameManager methods that are now handled differently
// Removed old socket handlers that were replaced