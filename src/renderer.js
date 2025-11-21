import './style.css'
import { Game } from './game.js'

const game = new Game();
const gridEl = document.getElementById('grid');
const candidatesEl = document.getElementById('candidates');
const scoreEl = document.getElementById('score');

let draggingShape = null;
let dragElement = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let cellSize = 34; // Default, will be updated

function init() {
    calculateCellSize();
    game.init(render);

    // Global event listeners for drag and drop
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    window.addEventListener('resize', () => {
        calculateCellSize();
        render(game); // Re-render to update shape sizes if needed, though simple resize might not trigger full re-render of existing DOM elements properly without clearing. 
        // For simplicity, we'll just update the variable. Ideally we should re-render candidates.
        // Let's force a re-render of candidates if they exist.
        if (game.candidates) renderCandidates(game.candidates);
    });
}

function calculateCellSize() {
    const rect = gridEl.getBoundingClientRect();
    const padding = 10;
    const gap = 4;
    const availableWidth = rect.width - (padding * 2) - (gap * 7);
    cellSize = availableWidth / 8;
}

function getGridCoordinates(clientX, clientY) {
    if (!dragElement) return null;

    const rect = gridEl.getBoundingClientRect();
    const padding = 10;
    const gap = 4;
    const pitch = cellSize + gap;

    const shapeRect = dragElement.getBoundingClientRect();

    // Check if shape is roughly inside grid (with some tolerance)
    if (shapeRect.left < rect.left - cellSize || shapeRect.right > rect.right + cellSize ||
        shapeRect.top < rect.top - cellSize || shapeRect.bottom > rect.bottom + cellSize) {
        return null;
    }

    const gridOriginX = rect.left + padding;
    const gridOriginY = rect.top + padding;

    const relativeX = shapeRect.left - gridOriginX;
    const relativeY = shapeRect.top - gridOriginY;

    // Use Math.round to snap to the nearest cell
    const c = Math.round(relativeX / pitch);
    const r = Math.round(relativeY / pitch);

    return { r, c };
}

function showGameOver(score) {
    const overlay = document.createElement('div');
    overlay.className = 'game-over-overlay';
    overlay.innerHTML = `
    <div class="game-over-content">
      <h2>Game Over</h2>
      <p class="final-score">Score: 0</p>
      <button onclick="location.reload()">Play Again</button>
    </div>
  `;
    document.body.appendChild(overlay);

    // Animate score
    const scoreDisplay = overlay.querySelector('.final-score');
    const duration = 3000;
    const start = 0;
    const end = score;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentScore = Math.floor(start + (end - start) * ease);
        scoreDisplay.textContent = `Score: ${currentScore}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    // Make draggable
    const content = overlay.querySelector('.game-over-content');
    makeDraggable(content);

    requestAnimationFrame(update);
}

function makeDraggable(element) {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    element.addEventListener("mousedown", dragStart);
    document.addEventListener("mouseup", dragEnd);
    document.addEventListener("mousemove", drag);

    element.addEventListener("touchstart", dragStart, { passive: false });
    document.addEventListener("touchend", dragEnd);
    document.addEventListener("touchmove", drag, { passive: false });

    function dragStart(e) {
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        initialX = clientX - xOffset;
        initialY = clientY - yOffset;

        if (e.target === element || element.contains(e.target)) {
            // Don't drag if clicking button
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            currentX = clientX - initialX;
            currentY = clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, element);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

const comboContainer = document.getElementById('combo-container');
let lastCombo = 0;

function render(state) {
    renderGrid(state.grid, state.gridColors);
    renderCandidates(state.candidates);
    // scoreEl.textContent = state.score; // Replaced by animation
    animateScore(state.score);

    if (state.combo > 0 && state.combo > lastCombo) {
        if (state.combo === 1) {
            showGreat();
        } else {
            showCombo(state.combo);
        }
    }
    lastCombo = state.combo;

    if (state.isAllCleared) {
        showUnbelievable();
    }

    if (state.isGameOver) {
        // Check if overlay already exists
        if (!document.querySelector('.game-over-overlay')) {
            showGameOver(state.score);
        }
    }
}

let currentDisplayedScore = 0;
let scoreAnimationId = null;

function animateScore(targetScore) {
    if (currentDisplayedScore === targetScore) return;

    const startScore = currentDisplayedScore;
    const duration = 2000;
    const startTime = performance.now();

    scoreEl.classList.add('score-animating');

    if (scoreAnimationId) cancelAnimationFrame(scoreAnimationId);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        currentDisplayedScore = Math.floor(startScore + (targetScore - startScore) * ease);
        scoreEl.textContent = currentDisplayedScore;

        if (progress < 1) {
            scoreAnimationId = requestAnimationFrame(update);
        } else {
            scoreEl.classList.remove('score-animating');
            currentDisplayedScore = targetScore; // Ensure exact final value
            scoreEl.textContent = currentDisplayedScore;
            scoreAnimationId = null;
        }
    }

    scoreAnimationId = requestAnimationFrame(update);
}

function showCombo(count) {
    const comboEl = document.createElement('div');
    comboEl.className = 'combo-popup';
    comboEl.textContent = `Combo x${count}`;

    // Remove old combo if exists
    comboContainer.innerHTML = '';
    comboContainer.appendChild(comboEl);

    // Remove after animation
    setTimeout(() => {
        comboEl.remove();
    }, 2000);
}

function showGreat() {
    const el = document.createElement('div');
    el.className = 'great-popup';
    el.textContent = 'GREAT!';

    comboContainer.innerHTML = '';
    comboContainer.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 2000);
}

function showUnbelievable() {
    const el = document.createElement('div');
    el.className = 'unbelievable-popup';
    el.textContent = 'UNBELIEVABLE!';
    document.body.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 3000);
}

let gridCells = [];

function renderGrid(gridData, gridColors) {
    gridEl.innerHTML = '';
    gridCells = []; // Reset cache

    gridData.forEach((row, r) => {
        const rowCells = [];
        row.forEach((cell, c) => {
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.dataset.r = r;
            cellEl.dataset.c = c;
            if (cell === 1) {
                cellEl.classList.add('filled');
                if (gridColors && gridColors[r][c]) {
                    cellEl.style.backgroundColor = gridColors[r][c];
                }
            } else if (cell === 2) {
                cellEl.classList.add('filled');
                cellEl.classList.add('clearing');
                if (gridColors && gridColors[r][c]) {
                    cellEl.style.backgroundColor = gridColors[r][c];
                }
            }
            gridEl.appendChild(cellEl);
            rowCells.push(cellEl);
        });
        gridCells.push(rowCells);
    });
}

function renderCandidates(candidates) {
    candidatesEl.innerHTML = '';
    candidates.forEach((candidate, index) => {
        if (candidate.used) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('candidate-wrapper');

        // Use smaller size for candidates (e.g., 20px)
        const shapeEl = createShapeElement(candidate.matrix, 20, candidate.color);
        shapeEl.classList.add('candidate-shape');
        // Prevent pointer events on shape so wrapper catches them
        shapeEl.style.pointerEvents = 'none';

        // Mouse events on wrapper
        wrapper.addEventListener('mousedown', (e) => handleInputDown(e, candidate, index));
        // Touch events on wrapper
        wrapper.addEventListener('touchstart', (e) => handleInputDown(e, candidate, index), { passive: false });

        wrapper.appendChild(shapeEl);
        candidatesEl.appendChild(wrapper);
    });
}

function createShapeElement(matrix, sizePx, color) {
    const container = document.createElement('div');
    container.style.display = 'grid';
    const size = `${sizePx}px`;
    container.style.gridTemplateRows = `repeat(${matrix.length}, ${size})`;
    container.style.gridTemplateColumns = `repeat(${matrix[0].length}, ${size})`;
    container.style.gap = '2px'; // Smaller gap for smaller shapes

    matrix.forEach(row => {
        row.forEach(cell => {
            const block = document.createElement('div');
            block.style.width = size;
            block.style.height = size;
            block.style.borderRadius = '2px';
            if (cell === 1) {
                block.classList.add('filled');
                if (color) {
                    block.style.backgroundColor = color;
                }
                // block.style.backgroundColor = '#e94560'; // Moved to CSS
            } else {
                block.style.backgroundColor = 'transparent';
            }
            container.appendChild(block);
        });
    });
    return container;
}

let dragSourceElement = null;

let potentialDrag = null;

function handleInputDown(e, candidate, index) {
    e.preventDefault(); // Prevent default touch behavior if needed, though passive: false on listener handles it
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    potentialDrag = {
        candidate,
        index,
        startX: clientX,
        startY: clientY,
        target: e.currentTarget
    };
}

function initiateDrag(e) {
    if (!potentialDrag) return;

    const { candidate, index, target } = potentialDrag;
    draggingShape = { candidate, index };

    // Hide original element
    dragSourceElement = target;
    if (dragSourceElement) {
        dragSourceElement.style.opacity = '0';
    }

    // Create drag element clone
    dragElement = createShapeElement(candidate.matrix, cellSize, candidate.color);
    dragElement.style.gap = '4px';
    Array.from(dragElement.children).forEach(child => {
        child.style.borderRadius = '4px';
    });

    dragElement.classList.add('dragging');
    dragElement.style.position = 'absolute';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.zIndex = '1000';
    dragElement.style.opacity = '0.8';

    document.body.appendChild(dragElement);

    const dragRect = dragElement.getBoundingClientRect();
    dragOffsetX = dragRect.width / 2;

    // Add offset for touch events
    const isTouch = e.type.startsWith('touch');
    const touchOffset = isTouch ? 100 : 0;

    dragOffsetY = (dragRect.height / 2) + touchOffset;

    // Initial update
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    updateDragPosition(clientX, clientY);

    potentialDrag = null; // Consumed
}

function onMouseMove(e) {
    if (draggingShape) {
        updateDragPosition(e.clientX, e.clientY);
    } else if (potentialDrag) {
        const dist = Math.hypot(e.clientX - potentialDrag.startX, e.clientY - potentialDrag.startY);
        if (dist > 5) {
            initiateDrag(e);
        }
    }
}

function onTouchMove(e) {
    if (draggingShape || potentialDrag) {
        e.preventDefault(); // Prevent scrolling
    }

    if (draggingShape) {
        updateDragPosition(e.touches[0].clientX, e.touches[0].clientY);
    } else if (potentialDrag) {
        const touch = e.touches[0];
        const dist = Math.hypot(touch.clientX - potentialDrag.startX, touch.clientY - potentialDrag.startY);
        if (dist > 5) {
            initiateDrag(e);
        }
    }
}

function onMouseUp(e) {
    if (draggingShape) {
        attemptPlace(e.clientX, e.clientY);
        endDrag();
    } else if (potentialDrag) {
        // It was a click!
        game.rotateCandidate(potentialDrag.index);
        potentialDrag = null;
    }
}

function onTouchEnd(e) {
    if (draggingShape) {
        const touch = e.changedTouches[0];
        attemptPlace(touch.clientX, touch.clientY);
        endDrag();
    } else if (potentialDrag) {
        // It was a tap!
        game.rotateCandidate(potentialDrag.index);
        potentialDrag = null;
    }
}

function endDrag() {
    if (dragElement) {
        dragElement.remove();
        dragElement = null;
    }

    if (dragSourceElement) {
        dragSourceElement.style.opacity = '1';
        dragSourceElement = null;
    }

    draggingShape = null;
    clearHighlight();
}

function highlightGrid(clientX, clientY) {
    clearHighlight();
    const coords = getGridCoordinates(clientX, clientY);
    if (!coords) return;

    const { r, c } = coords;
    const matrix = draggingShape.candidate.matrix;

    if (game.canPlace(matrix, r, c)) {
        // Draw shadow
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[0].length; j++) {
                if (matrix[i][j] === 1) {
                    if (gridCells[r + i] && gridCells[r + i][c + j]) {
                        gridCells[r + i][c + j].classList.add('highlight');
                    }
                }
            }
        }

        // Highlight potential clears
        const { rows, cols } = game.getPotentialClears(matrix, r, c);

        rows.forEach(rowIndex => {
            if (gridCells[rowIndex]) {
                gridCells[rowIndex].forEach(cell => {
                    cell.classList.add('highlight-clear');
                });
            }
        });

        cols.forEach(colIndex => {
            for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
                if (gridCells[rowIndex] && gridCells[rowIndex][colIndex]) {
                    gridCells[rowIndex][colIndex].classList.add('highlight-clear');
                }
            }
        });
    }
}

function clearHighlight() {
    const highlighted = gridEl.querySelectorAll('.highlight, .highlight-clear');
    highlighted.forEach(cell => {
        cell.classList.remove('highlight');
        cell.classList.remove('highlight-clear');

        const r = parseInt(cell.dataset.r);
        const c = parseInt(cell.dataset.c);

        // Restore original color if filled
        if (game.grid[r][c] === 1 || game.grid[r][c] === 2) {
            if (game.gridColors[r][c]) {
                cell.style.backgroundColor = game.gridColors[r][c];
            } else {
                cell.style.backgroundColor = ''; // Fallback to CSS
            }
        } else {
            cell.style.backgroundColor = ''; // Reset to CSS default for empty cells
        }
    });
}

function attemptPlace(clientX, clientY) {
    const coords = getGridCoordinates(clientX, clientY);
    if (coords) {
        const { r, c } = coords;
        game.placeShape(draggingShape.index, r, c);
    }
}

init();
