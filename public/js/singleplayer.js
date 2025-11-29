class WordSearchGame {
    constructor() {
        // Define explicit directions and their offsets
        this.directions = {
            HORIZONTAL: { dx: 1, dy: 0 },
            VERTICAL: { dx: 0, dy: 1 },
            DIAGONAL_DR: { dx: 1, dy: 1 }, // Down-Right
            HORIZONTAL_REV: { dx: -1, dy: 0 },
            VERTICAL_REV: { dx: 0, dy: -1 },
            DIAGONAL_UL: { dx: -1, dy: -1 }, // Up-Left
            DIAGONAL_UR: { dx: 1, dy: -1 }, // Up-Right
            DIAGONAL_DL: { dx: -1, dy: 1 }  // Down-Left
        };

        this.difficultyLevels = {
            easy: { size: 12, words: 10, directions: ['HORIZONTAL', 'VERTICAL'] },
            medium: { size: 15, words: 15, directions: ['HORIZONTAL', 'VERTICAL', 'DIAGONAL_DR'] },
            hard: { size: 18, words: 20, directions: Object.keys(this.directions) } // All 8 directions for hard
        };
        
        this.themes = {
            tech: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Node', 'Python', 'Java', 'Kotlin', 'Swift', 'Rust'],
            nature: ['Forest', 'Mountain', 'River', 'Ocean', 'Desert', 'Valley', 'Canyon', 'Waterfall', 'Meadow', 'Glacier'],
            space: ['Galaxy', 'Nebula', 'Asteroid', 'Comet', 'Orbit', 'Satellite', 'Telescope', 'Universe', 'Pulsar', 'Quasar'],
            animals: ['Lion', 'Tiger', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Kangaroo', 'Penguin', 'Dolphin', 'Whale'],
            food: ['Pizza', 'Burger', 'Pasta', 'Sushi', 'Salad', 'Steak', 'Chicken', 'Soup', 'Bread', 'Cheese'],
            countries: ['Canada', 'Brazil', 'France', 'Germany', 'India', 'Japan', 'Mexico', 'Russia', 'Spain', 'Egypt']
        };

        // Initialize after form submission
        document.getElementById('gameSettings').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startNewGame();
        });
    }

    startNewGame() {
        const category = document.getElementById('category').value;
        const difficulty = document.getElementById('difficulty').value;
        
        // Hide setup and show game
        document.getElementById('gameSetup').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        
        this.initGame(difficulty, category);
    }

    initGame(difficulty, theme) {
        const config = this.difficultyLevels[difficulty];
        if (!config || !this.themes[theme]) {
            alert('Invalid game configuration');
            return;
        }
        
        this.gridSize = config.size;
        this.allowedDirections = config.directions; // Store allowed directions for this game
        this.words = this.selectWords(theme, config.words);
        this.foundWords = new Set();
        this.score = 0;
        this.startTime = Date.now();
        this.timerInterval = null;
        
        // Clear previous grid
        this.grid = [];
        this.generateGrid();
        this.placeWords();
        this.startTimer();
        this.setupEventListeners();
        this.render();

        this.logGridState();
        if (!this.validateGrid()) {
            alert('Error generating grid - please try again');
            return;
        }
    }

    selectWords(theme, count) {
        return this.themes[theme]
            .sort(() => Math.random() - 0.5)
            .slice(0, count)
            .map(word => word.toUpperCase());
    }

    generateGrid() {
        this.grid = Array.from({ length: this.gridSize }, () => 
            Array(this.gridSize).fill('')
        );
    }

    placeWords() {
        let placedCount = 0;
        
        this.words.forEach(word => {
            let placed = false;
            let attempts = 0;
            const cleanWord = word.toUpperCase().replace(/[^A-Z]/g, '');
            
            while (!placed && attempts < 100) {
                const directionKey = this.randomDirection(); // Get a direction key (e.g., 'HORIZONTAL')
                const [startX, startY] = this.randomStartPosition(cleanWord.length, directionKey);
                
                if (this.canPlaceWord(cleanWord, startX, startY, directionKey)) {
                    this.insertWord(cleanWord, startX, startY, directionKey);
                    placed = true;
                    placedCount++;
                }
                attempts++;
            }
        });
        
        if (placedCount === 0) {
            alert('Could not place any words - try a larger grid size!');
            return;
        }
        
        this.fillEmptyCells();
    }

    randomDirection() {
        // Select a random direction from the allowed ones for the current difficulty
        return this.allowedDirections[Math.floor(Math.random() * this.allowedDirections.length)];
    }

    randomStartPosition(wordLength, directionKey) {
        const { dx, dy } = this.directions[directionKey];
        let startX, startY;

        // Adjust potential start positions based on direction to avoid immediate out-of-bounds
        const maxX = dx > 0 ? this.gridSize - wordLength : (dx < 0 ? this.gridSize - 1 : this.gridSize -1);
        const minX = dx < 0 ? wordLength - 1 : 0;
        const maxY = dy > 0 ? this.gridSize - wordLength : (dy < 0 ? this.gridSize - 1 : this.gridSize -1);
        const minY = dy < 0 ? wordLength - 1 : 0;
        
        startX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        startY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

        return [startX, startY];
    }

    canPlaceWord(word, startX, startY, directionKey) {
        const { dx, dy } = this.directions[directionKey];

        for (let i = 0; i < word.length; i++) {
            const currX = startX + (dx * i);
            const currY = startY + (dy * i);
            
            // Check bounds
            if (currX >= this.gridSize || currY >= this.gridSize || currX < 0 || currY < 0) {
                return false; // Out of bounds
            }
            
            // Check if cell is empty or matches the letter
            const cellContent = this.grid[currY][currX];
            if (cellContent !== '' && cellContent !== word[i]) {
                return false; // Cell occupied by a different letter
            }
        }
        return true; // Word can be placed
    }

    insertWord(word, startX, startY, directionKey) {
        const { dx, dy } = this.directions[directionKey];

        for (let i = 0; i < word.length; i++) {
            const currX = startX + (dx * i);
            const currY = startY + (dy * i);
            this.grid[currY][currX] = word[i];
        }
    }

    fillEmptyCells() {
        const freq = 'EEEEEEEEEETAAAAOIIINNNSSSHRRRLLLDDCCUUMMFFGGYYWPPBBVVKJXQZ';
        this.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell === '') {
                    this.grid[y][x] = freq[Math.floor(Math.random() * freq.length)];
                }
            });
        });
    }

    setupEventListeners() {
        document.getElementById('grid').addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    handleMouseDown(e) {
        if (e.target.tagName === 'TD') {
            this.isSelecting = true;
            this.startX = parseInt(e.target.dataset.x);
            this.startY = parseInt(e.target.dataset.y);
            this.selectedCells = [e.target];
            this.highlightCells();
        }
    }

    handleMouseMove(e) {
        if (this.isSelecting && e.target.tagName === 'TD') {
            const endX = parseInt(e.target.dataset.x);
            const endY = parseInt(e.target.dataset.y);
            
            this.selectedCells = this.getCellsBetween(this.startX, this.startY, endX, endY);
            this.highlightCells();
        }
    }

    handleMouseUp() {
        if (this.isSelecting) {
            this.validateSelection();
            this.isSelecting = false;
            this.clearHighlight();
        }
    }

    getCellsBetween(x1, y1, x2, y2) {
        const cells = [];
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));

        for (let i = 0; i <= steps; i++) {
            const x = x1 + (dx !== 0 ? i * dx : 0);
            const y = y1 + (dy !== 0 ? i * dy : 0);
            const cell = document.querySelector(`td[data-x="${x}"][data-y="${y}"]`);
            if (cell) cells.push(cell);
        }
        return cells;
    }

    highlightCells() {
        document.querySelectorAll('#grid td').forEach(td => {
            td.classList.remove('selected');
        });
        this.selectedCells.forEach(td => {
            td.classList.add('selected');
        });
    }

    clearHighlight() {
        document.querySelectorAll('#grid td').forEach(td => {
            td.classList.remove('selected');
        });
    }

    validateSelection() {
        const word = this.selectedCells.map(td => td.textContent).join('');
        if (this.words.includes(word.toUpperCase()) && !this.foundWords.has(word.toUpperCase())) {
            this.foundWords.add(word.toUpperCase());
            this.score += word.length * 100;
            this.updateFoundCells();
            this.render();
            this.checkCompletion();
        }
    }

    updateFoundCells() {
        this.selectedCells.forEach(td => {
            td.classList.add('found');
            td.classList.remove('selected');
        });
    }

    render() {
        this.renderGrid();
        this.renderWordList();
        this.updateScoreDisplay();
    }

    renderGrid() {
        const gridElement = document.getElementById('grid');
        gridElement.innerHTML = '';
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        this.grid.forEach((row, y) => {
            const tr = document.createElement('tr');
            row.forEach((cell, x) => {
                const td = document.createElement('td');
                td.textContent = cell;
                td.dataset.x = x;
                td.dataset.y = y;
                
                if (this.foundWords.has(cell.toUpperCase())) {
                    td.classList.add('found');
                }
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        gridElement.appendChild(tbody);
    }

    renderWordList() {
        const wordList = document.getElementById('word-list');
        wordList.innerHTML = this.words
            .map(word => `
                <div class="word-item ${this.foundWords.has(word.toUpperCase()) ? 'found' : ''}">
                    ${word}
                    ${this.foundWords.has(word.toUpperCase()) ? '✓' : ''}
                </div>
            `).join('');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('time').textContent = 
                `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
        }, 1000);
    }

    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
    }

    checkCompletion() {
        if (this.foundWords.size === this.words.length) {
            clearInterval(this.timerInterval);
            this.showCompletionModal();
        }
    }

    showCompletionModal() {
        const modal = document.createElement('div');
        modal.className = 'completion-modal';
        modal.innerHTML = `
            <h2>Game Completed! 🎉</h2>
            <p>Final Score: ${this.score}</p>
            <button onclick="location.reload()">Play Again</button>
        `;
        document.body.appendChild(modal);
    }

    provideHint() {
        const unfound = this.words.filter(w => !this.foundWords.has(w));
        const hintWord = unfound[Math.floor(Math.random() * unfound.length)];
        const position = this.findWordPosition(hintWord);
        
        // Pulse animation for hint cells
        document.querySelectorAll(`td[data-x="${position.x}"][data-y="${position.y}"]`)
            .forEach(cell => {
                cell.style.animation = 'hint-pulse 1.5s ease 3';
            });
    }

    findWordPosition(word) {
        // Implementation to find word's starting position
    }

    logGridState() {
        console.log('Grid Dimensions:', this.grid.length, 'x', this.grid[0].length);
        console.log('Sample Grid Content:');
        this.grid.slice(0, 5).forEach(row => console.log(row.join(' ')));
    }

    validateGrid() {
        const emptyCells = this.grid.flat().filter(cell => !cell.trim());
        if (emptyCells.length > 0) {
            console.error('Grid contains empty cells:', emptyCells.length);
            return false;
        }
        return true;
    }
}

new WordSearchGame(); 