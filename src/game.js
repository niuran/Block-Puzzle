const REGULAR_SHAPES = [
    // 2x2 Square
    [[1, 1], [1, 1]],
    // 3x3 Square
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    // 2x1 (Need to add back some smaller regular shapes for balance if allowed, but user said min 4 blocks... wait, user said "cancel < 4 blocks". So 2x1 is 2 blocks. 3x1 is 3. 
    // User said "cancel < 4 blocks". So 2x2 is 4. 
    // Are there other regular shapes >= 4 blocks?
    // 4x1 Line
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    // 2x3 Rect (6 blocks) - Let's add this for "Regular" variety
    [[1, 1, 1], [1, 1, 1]],
    [[1, 1], [1, 1], [1, 1]],
];

const IRREGULAR_SHAPES = [
    // T shapes
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [0, 1]],

    // L shapes
    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1], [0, 1], [0, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],

    // Z/S shapes
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1], [1, 1], [1, 0]],

    // Big L shapes
    [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [0, 0, 1], [1, 1, 1]],
    [[1, 1, 1], [1, 0, 0], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1], [0, 0, 1]],

    // Plus shape
    [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
];

const COLORS = [
    '#FF0000', // Red
    '#FF4500', // Orange Red (Big Red/Orangeish)
    '#FFA500', // Orange
    '#FFD700', // Gold (Orange Yellow)
    '#00FF00', // Green
    '#0000FF', // Blue
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#800080', // Purple
    '#008080', // Teal
    // Removed Pink
];

export class Game {
    constructor() {
        this.grid = Array(8).fill().map(() => Array(8).fill(0));
        this.gridColors = Array(8).fill().map(() => Array(8).fill(null)); // Store colors
        this.score = 0;
        this.candidates = [];
        this.isGameOver = false;
        this.combo = 0;
        this.roundCount = 0; // Track rounds
        this.isClearing = false; // Track clearing state
        this.onStateChange = null; // Callback for UI updates
    }

    init(callback) {
        this.onStateChange = callback;
        this.roundCount = 0;
        this.isClearing = false;
        this.generateCandidates();
        this.notify();
    }

    // ... (generateCandidates)



    generateCandidates() {
        this.candidates = [];
        this.roundCount++;

        // Difficulty Logic
        // Round 1-5: Mostly Regular
        // Round 6-10: Mix, but ensure 1-2 regular
        // Round 10+: More irregular/large

        let regularCount = 0;
        let irregularCount = 0;

        if (this.roundCount <= 5) {
            // High chance of regular: 2-3 regular
            regularCount = Math.random() > 0.2 ? 3 : 2;
            irregularCount = 3 - regularCount;
        } else if (this.roundCount <= 10) {
            // Balanced: 1-2 regular
            regularCount = Math.random() > 0.5 ? 2 : 1;
            irregularCount = 3 - regularCount;
        } else {
            // Harder: 1 regular guaranteed, rest irregular
            regularCount = 1;
            irregularCount = 2;
            // Small chance for 0 regular? User said "at least 1 to 2 regular shapes".
            // So keep min 1.
        }

        const shapes = [];

        for (let i = 0; i < regularCount; i++) {
            shapes.push(REGULAR_SHAPES[Math.floor(Math.random() * REGULAR_SHAPES.length)]);
        }
        for (let i = 0; i < irregularCount; i++) {
            shapes.push(IRREGULAR_SHAPES[Math.floor(Math.random() * IRREGULAR_SHAPES.length)]);
        }

        // Shuffle shapes so regular ones aren't always first
        for (let i = shapes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
        }

        shapes.forEach((shape, i) => {
            this.candidates.push({
                matrix: shape,
                id: Date.now() + i,
                used: false,
                color: COLORS[Math.floor(Math.random() * COLORS.length)] // Assign random color
            });
        });

        // Only check game over if NOT clearing.
        // If clearing, the timeout will check it after grid is cleared.
        if (!this.isClearing) {
            if (this.checkGameOver()) {
                this.isGameOver = true;
            }
        }
    }

    // Check if a shape can be placed at (x, y) on the grid
    // x, y are grid coordinates (0-7)
    canPlace(shapeMatrix, startX, startY) {
        const rows = shapeMatrix.length;
        const cols = shapeMatrix[0].length;

        if (startX + rows > 8 || startY + cols > 8) return false;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shapeMatrix[r][c] === 1) {
                    if (this.grid[startX + r][startY + c] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    getPotentialClears(shapeMatrix, startX, startY) {
        const rowsToClear = [];
        const colsToClear = [];

        // Get cells occupied by the shape
        const shapeCells = [];
        for (let r = 0; r < shapeMatrix.length; r++) {
            for (let c = 0; c < shapeMatrix[0].length; c++) {
                if (shapeMatrix[r][c] === 1) {
                    shapeCells.push({ r: startX + r, c: startY + c });
                }
            }
        }

        // Check rows
        for (let r = 0; r < 8; r++) {
            let isFull = true;
            for (let c = 0; c < 8; c++) {
                const cellValue = this.grid[r][c];
                // Cell is filled if it's already 1/2 OR if it's part of the shape being placed
                const isShapeCell = shapeCells.some(sc => sc.r === r && sc.c === c);
                if (cellValue !== 1 && cellValue !== 2 && !isShapeCell) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) rowsToClear.push(r);
        }

        // Check cols
        for (let c = 0; c < 8; c++) {
            let isFull = true;
            for (let r = 0; r < 8; r++) {
                const cellValue = this.grid[r][c];
                const isShapeCell = shapeCells.some(sc => sc.r === r && sc.c === c);
                if (cellValue !== 1 && cellValue !== 2 && !isShapeCell) {
                    isFull = false;
                    break;
                }
            }
            if (isFull) colsToClear.push(c);
        }

        return { rows: rowsToClear, cols: colsToClear };
    }

    placeShape(candidateIndex, startX, startY) {
        const candidate = this.candidates[candidateIndex];
        if (!candidate || candidate.used) return false;

        if (!this.canPlace(candidate.matrix, startX, startY)) return false;

        // Place the shape
        const matrix = candidate.matrix;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
                if (matrix[r][c] === 1) {
                    this.grid[startX + r][startY + c] = 1;
                    this.gridColors[startX + r][startY + c] = candidate.color;
                }
            }
        }

        candidate.used = true;
        this.score += this.calculatePlacementScore(matrix);

        const linesCleared = this.checkLines();

        // Check if all candidates are used
        if (this.candidates.every(c => c.used)) {
            this.generateCandidates();
        } else {
            // Check game over after placement (if remaining shapes can't be placed)
            // ONLY if no lines were cleared. If lines were cleared, the check happens in the timeout.
            if (!linesCleared) {
                if (this.checkGameOver()) {
                    this.isGameOver = true;
                }
            }
        }

        this.notify();
        return true;
    }

    calculatePlacementScore(matrix) {
        let count = 0;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[0].length; c++) {
                if (matrix[r][c] === 1) count++;
            }
        }
        return count;
    }

    checkLines() {
        let linesCleared = 0;
        const rowsToClear = [];
        const colsToClear = [];

        // Check rows
        for (let r = 0; r < 8; r++) {
            if (this.grid[r].every(cell => cell === 1 || cell === 2)) { // 2 is clearing state
                rowsToClear.push(r);
            }
        }

        // Check cols
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) {
                if (this.grid[r][c] !== 1 && this.grid[r][c] !== 2) {
                    full = false;
                    break;
                }
            }
            if (full) colsToClear.push(c);
        }

        linesCleared = rowsToClear.length + colsToClear.length;

        if (linesCleared > 0) {
            this.combo++;
            this.isClearing = true; // Set clearing flag

            // Mark as clearing (2)
            rowsToClear.forEach(r => {
                this.grid[r].fill(2);
            });
            colsToClear.forEach(c => {
                for (let r = 0; r < 8; r++) {
                    this.grid[r][c] = 2;
                }
            });

            // Score: Base line score * Combo multiplier
            // Example: 1 line = 10, Combo 1 = 10. Combo 2 = 20.
            // 2 lines = 40 (2*10*2), Combo 2 = 80.
            this.score += (linesCleared * 10 * linesCleared) * this.combo;

            // Check if board will be empty (no 1s left)
            let remainingBlocks = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (this.grid[r][c] === 1) remainingBlocks++;
                }
            }

            const isAllCleared = remainingBlocks === 0;

            this.notify(isAllCleared); // Notify renderer

            // Clear after animation
            setTimeout(() => {
                rowsToClear.forEach(r => {
                    this.grid[r].fill(0);
                    this.gridColors[r].fill(null); // Clear colors
                });
                colsToClear.forEach(c => {
                    for (let r = 0; r < 8; r++) {
                        this.grid[r][c] = 0;
                        this.gridColors[r][c] = null; // Clear colors
                    }
                });

                this.isClearing = false; // Clear flag

                // Check game over AFTER clearing
                if (this.checkGameOver()) {
                    this.isGameOver = true;
                }

                this.notify(); // Notify renderer to show empty and potential game over
            }, 300); // 300ms animation duration

            return true; // Lines were cleared
        } else {
            this.combo = 0;
            return false; // No lines cleared
        }
    }

    checkGameOver() {
        // For each unused candidate, check if it can be placed ANYWHERE
        const unused = this.candidates.filter(c => !c.used);
        if (unused.length === 0) return false; // Should generate new ones if all used

        for (const candidate of unused) {
            let canFit = false;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (this.canPlace(candidate.matrix, r, c)) {
                        canFit = true;
                        break;
                    }
                }
                if (canFit) break;
            }
            if (canFit) return false; // At least one shape fits
        }
        return true; // No shapes fit
    }

    notify(isAllCleared = false) {
        if (this.onStateChange) {
            this.onStateChange({
                grid: this.grid,
                gridColors: this.gridColors,
                candidates: this.candidates,
                score: this.score,
                isGameOver: this.isGameOver,
                combo: this.combo,
                isAllCleared: isAllCleared
            });
        }
    }
}
