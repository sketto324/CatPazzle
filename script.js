const gameBoard = document.getElementById('game-board');
const message = document.getElementById('message');
const shuffleButton = document.getElementById('shuffle-button');

const ROWS = 5;
const COLS = 6;
const CAT_COLORS = ['white', 'black', 'brown', 'gray'];
const CATS_PER_COLUMN = 5; // This should match ROWS

let board = [];
let selectedCol = null;

function initGame() {
    gameBoard.innerHTML = '';
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    let attempts = 0;
    let validBoard = false;

    while (!validBoard && attempts < 100) { // Try up to 100 times to generate a valid board
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
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
                board[r][c] = catBag.pop();
            }
        }

        // Check for more than 2 consecutive cats of the same color
        validBoard = true;
        for (let c = 0; c < COLS; c++) {
            let consecutiveCount = 0;
            let lastColor = null;
            for (let r = ROWS - 1; r >= 0; r--) { // Check from bottom up
                const currentColor = board[r][c];
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

function checkWin() {
    for (let c = 0; c < COLS; c++) {
        const firstCat = board[0][c];
        if (firstCat && board.every(row => row[c] === firstCat)) {
            message.textContent = `Cat ${firstCat} is complete!`;
            setTimeout(() => {
                for (let r = 0; r < ROWS; r++) board[r][c] = null;
                message.textContent = "";
                renderBoard();
                checkGameClear();
            }, 1000);
        }
    }
}

function checkGameClear() {
    if (board.flat().every(cell => cell === null)) {
        message.textContent = 'Game Clear!';
    }
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

initGame();
