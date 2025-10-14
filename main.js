const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const colors = ['#48f', '#f84', '#4f8', '#f48', '#ff4'];

let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null;

function initGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = Math.floor(Math.random() * colors.length);
    }
  }
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === -1) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);
      } else {
        ctx.fillStyle = colors[grid[y][x]];
        ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);
      }
      if (selected && selected.x === x && selected.y === y) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 6, tileSize - 6);
      }
    }
  }
}

function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

// Detectează match-uri și returnează coordonate de eliminat
function detectMatches() {
  let toRemove = Array(size).fill().map(() => Array(size).fill(false));

  // Orizontal
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (grid[y][x] !== -1 && grid[y][x] === grid[y][x - 1]) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y][x - k - 1] = true;
          }
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[y][size - k - 1] = true;
      }
    }
  }

  // Vertical
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (grid[y][x] !== -1 && grid[y][x] === grid[y - 1][x]) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y - k - 1][x] = true;
          }
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[size - k - 1][x] = true;
      }
    }
  }

  return toRemove;
}

function removeMatches(matches) {
  let removed = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matches[y][x]) {
        grid[y][x] = -1;
        removed++;
      }
    }
  }
  return removed;
}

function collapseGrid() {
  for (let x = 0; x < size; x++) {
    let pointer = size - 1;
    for (let y = size - 1; y >= 0; y--) {
      if (grid[y][x] !== -1) {
        grid[pointer][x] = grid[y][x];
        pointer--;
      }
    }
    for (let y = pointer; y >= 0; y--) {
      grid[y][x] = Math.floor(Math.random() * colors.length);
    }
  }
}

canvas.addEventListener('click', function(e) {
  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;

  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      selected = null;
      drawGrid();

      setTimeout(function() {
        processMatches();
      }, 200);
    } else {
      selected = {x, y};
      drawGrid();
    }
  } else {
    selected = {x, y};
    drawGrid();
  }
});

function processMatches() {
  let matches = detectMatches();
  let found = false;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matches[y][x]) found = true;
    }
  }
  if (found) {
    removeMatches(matches);
    drawGrid();
    setTimeout(function() {
      collapseGrid();
      drawGrid();
      setTimeout(function() {
        processMatches();
      }, 200);
    }, 200);
  }
}

initGrid();
drawGrid();
