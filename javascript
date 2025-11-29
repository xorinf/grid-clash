const testGame = new SinglePlayerGame();
console.log('Generated Words:', testGame.words);
console.log('Grid Size:', testGame.gridSize); 

// In multiplayer.js constructor
this.socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
}); 