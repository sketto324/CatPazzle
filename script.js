const gameBoard = document.getElementById('game-board');
const message = document.getElementById('message');
const shuffleButton = document.getElementById('shuffle-button');
const moveCountElement = document.getElementById('move-count');
const soundToggleButton = document.getElementById('sound-toggle-button');
const confettiCanvas = document.getElementById('confetti-canvas');

const ROWS = 5;
const COLS = 6;
const CAT_COLORS = ['white', 'black', 'brown', 'gray'];
const CATS_PER_COLUMN = 5; // This should match ROWS
const CLEAR_COLUMN_DELAY = 1000; // ms

// --- Sound Effects ---
// Create Audio objects to preload the sounds
const MEOW_SOUNDS = [
    new Audio('sounds/meow1.mp3'),
    new Audio('sounds/meow2.mp3'),
    new Audio('sounds/meow3.mp3')
];
const CLEAR_SOUND = new Audio('sounds/clear.mp3');
const FANFARE_SOUND = new Audio('sounds/fanfare.mp3');

let board = [];
let selectedCol = null;
let moveCount = 0;
let isSoundEnabled = true;

function generateInitialBoard() {
    let newBoard;
    let attempts = 0;
    let validBoard = false;

    while (!validBoard && attempts < 100) { // Try up to 100 times to generate a valid board
        newBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        // Create a "bag" of cats to draw from. 4 colors * 5 cats each = 20 cats.
        const catBag = CAT_COLORS.flatMap(color => Array(CATS_PER_COLUMN).fill(color));

        // Shuffle the cat bag
        for (let i = catBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [catBag[i], catBag[j]] = [catBag[j], catBag[i]];
        }

        // Distribute cats into the first N columns, leaving some empty
        const initialColumns = COLS - 2;
        for (let c = 0; c < initialColumns; c++) {
            for (let r = 0; r < ROWS; r++) {
                newBoard[r][c] = catBag.pop();
            }
        }

        // Check for more than 2 consecutive cats of the same color
        validBoard = true;
        for (let c = 0; c < COLS; c++) {
            let consecutiveCount = 0;
            let lastColor = null;
            for (let r = ROWS - 1; r >= 0; r--) { // Check from bottom up
                const currentColor = newBoard[r][c];
                if (currentColor !== null) {
                    if (currentColor === lastColor) {
                        consecutiveCount++;
                        if (consecutiveCount > 2) {
                            validBoard = false;
                            break;
                        }
                    } else {
                        consecutiveCount = 1;
                        lastColor = currentColor;
                    }
                } else {
                    consecutiveCount = 0; // Reset count for empty cells
                    lastColor = null;
                }
            }
            if (!validBoard) break;
        }
        attempts++;
    }

    if (!validBoard) {
        console.warn("Could not generate a valid board after 100 attempts. The game might start with more than 2 consecutive cats of the same color.");
    }

    return newBoard;
}

function initGame() {
    // Reset game state
    moveCount = 0;
    moveCountElement.textContent = moveCount;
    displayMessage('');
    selectedCol = null;

    // Generate and set up the board
    board = generateInitialBoard();
    gameBoard.innerHTML = '';
    // Create cell elements
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            gameBoard.appendChild(cell);
        }
    }

    renderBoard();
}

function findTopCatRow(col) {
    for (let r = 0; r < ROWS; r++) {
        if (board[r][col] !== null) return r;
    }
    return -1;
}

function findLandingRow(col) {
    const topCatRow = findTopCatRow(col);
    if (topCatRow === 0) return -1;
    if (topCatRow === -1) return ROWS - 1;
    return topCatRow - 1;
}

function highlightCell(row, col, isSelected) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    if (cell) cell.classList.toggle('selected', isSelected);
}

function displayMessage(text, duration = 0) {
    message.textContent = text;
    if (duration > 0) {
        setTimeout(() => {
            // Clear message only if it hasn't been changed by another call
            if (message.textContent === text) {
                message.textContent = '';
            }
        }, duration);
    }
}

function playSound(audio) {
    if (!isSoundEnabled) return;
    // Rewind to the start to allow playing the sound again quickly
    audio.currentTime = 0;
    audio.play().catch(error => {
        // Autoplay is often blocked by browsers until the user interacts with the page.
        // This is fine, as our sounds are triggered by user clicks.
        // We can log other errors if needed.
        console.error("Error playing sound:", error);
    });
}

function checkWin() {
    for (let c = 0; c < COLS; c++) {
        const firstCat = board[0][c];
        if (firstCat && board.every(row => row[c] === firstCat)) {
            playSound(CLEAR_SOUND);
            displayMessage(`Cat ${firstCat} is complete!`, CLEAR_COLUMN_DELAY);
            setTimeout(() => {
                for (let r = 0; r < ROWS; r++) board[r][c] = null;
                renderBoard();
                checkGameClear();
            }, CLEAR_COLUMN_DELAY);
        }
    }
}

function checkGameClear() {
    if (board.flat().every(cell => cell === null)) {
        playSound(FANFARE_SOUND);
        displayMessage('Game Clear!');
        startConfetti();
    }
}

function startConfetti() {
    const confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];
    const confettiColors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];

    function createConfetti() {
        const particleCount = 200;
        confettiParticles = [];
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        for (let i = 0; i < particleCount; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: -Math.random() * confettiCanvas.height * 0.5,
                radius: Math.random() * 5 + 2,
                color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                speedX: Math.random() * 6 - 3,
                speedY: Math.random() * 3 + 2,
                gravity: 0.05,
                opacity: 1,
                fade: Math.random() * 0.01 + 0.005
            });
        }
    }

    function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiParticles.forEach((p, index) => {
            p.speedY += p.gravity;
            p.x += p.speedX;
            p.y += p.speedY;
            p.opacity -= p.fade;
            if (p.y > confettiCanvas.height || p.opacity <= 0) {
                confettiParticles.splice(index, 1);
            } else {
                confettiCtx.beginPath();
                confettiCtx.globalAlpha = p.opacity;
                confettiCtx.fillStyle = p.color;
                confettiCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
                confettiCtx.fill();
            }
        });
        confettiCtx.globalAlpha = 1;
        if (confettiParticles.length > 0) {
            requestAnimationFrame(animateConfetti);
        } else {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }

    createConfetti();
    animateConfetti();
}

function renderBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
            const catColor = board[r][c];

            cell.className = 'cell';
            cell.innerHTML = '';

            if (catColor) {
                cell.classList.add(`cat-${catColor}`);
                const isConnectedTop = r > 0 && board[r - 1][c] === catColor;
                const isConnectedBottom = r < ROWS - 1 && board[r + 1][c] === catColor;

                let part = 'cat-single';
                if (isConnectedTop && isConnectedBottom) part = 'cat-body';
                else if (isConnectedTop) part = 'cat-tail';
                else if (isConnectedBottom) part = 'cat-head';
                cell.classList.add(part);

                if (part === 'cat-head' || part === 'cat-single') {
                    const face = document.createElement('div');
                    face.className = 'face';
                    face.innerHTML = `
                        <div class="ear left"></div><div class="ear right"></div>
                        <div class="eye left"></div><div class="eye right"></div>
                        <div class="mouth"></div>`;
                    cell.appendChild(face);
                }
            }
        }
    }
}

gameBoard.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const col = parseInt(cell.dataset.col);

    if (selectedCol === null) {
        const topRow = findTopCatRow(col);
        if (topRow !== -1) {
            selectedCol = col;
            highlightCell(topRow, col, true);
        }
    } else {
        const fromCol = selectedCol;
        const toCol = col;
        const topFromRow = findTopCatRow(fromCol);
        highlightCell(topFromRow, fromCol, false);

        if (fromCol !== toCol) {
            const catColor = board[topFromRow][fromCol];
            const landingRow = findLandingRow(toCol);
            const topToRow = findTopCatRow(toCol);

            if (landingRow !== -1 && (topToRow === -1 || board[topToRow][toCol] === catColor)) {
                // Play a random meow sound on successful move
                const randomMeow = MEOW_SOUNDS[Math.floor(Math.random() * MEOW_SOUNDS.length)];
                playSound(randomMeow);
                moveCount++;
                moveCountElement.textContent = moveCount;
                board[topFromRow][fromCol] = null;
                board[landingRow][toCol] = catColor;
                renderBoard();
                checkWin();
            }
        }
        selectedCol = null;
    }
});

shuffleButton.addEventListener('click', initGame);

soundToggleButton.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundToggleButton.textContent = isSoundEnabled ? '🔊' : '🔇';
});

initGame();
