const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const colors = ['#48f', '#f84', '#4f8', '#f48', '#ff4'];

let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null;

// 0,1,2,3,4 = culori; -1 = piesă goală (eliminată)

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

// Detectează match-uri (returnează o listă cu coordonate de eliminat)
function detectMatches() {
  let toRemove = Array(size)
    .fill()
    .map(() => Array(size).fill(false));

  // Orizontal (linii)
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (
        grid[y][x] !== -1 &&
        grid[y][x] === grid[y][x - 1]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++)
            toRemove[y][x - 1 - k] = true;
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++)
        toRemove[y][size - 1 - k] = true;
    }
  }

  // Vertical (coloane)
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (
        grid[y][x] !== -1 &&
        grid[y][x] === grid[y - 1][x]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++)
            toRemove[y - 1 - k][x] = true;
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++)
        toRemove[size - 1 - k][x] = true;
    }
  }

  // Returnăm lista de coordonate de eliminat
  return toRemove;
}

// Elimină piesele marcate și returnează câte au fost eliminate
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

// Fă piesele să cadă și adaugă piese noi
function collapseGrid() {
  for (let x = 0; x < size; x++) {
    let pointer = size - 1;
    for (let y = size - 1; y >= 0; y--) {
      if (grid[y][x] !== -1) {
        grid[pointer][x] = grid[y][x];
        pointer--;
      }
    }
    // Completează cu piese noi
    for (let y = pointer; y >= 0; y--) {
      grid[y][x] = Math.floor(Math.random() * colors.length);
    }
  }
}

// Handler click pe canvas
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

      // Detectăm și eliminăm match-uri
      setTimeout(function() {
        processMatches();
      }, 200); // scurt delay pentru vizualizare swap
    } else {
      selected = {x, y};
      drawGrid();
    }
  } else {
    selected = {x, y};
    drawGrid();
  }
});

function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

// Procesează eliminarea și căderea pieselor
function processMatches() {
  let matches = detectMatches();
  let found = false;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (matches[y][x]) found = true;

  if (found) {
    removeMatches(matches);
    drawGrid();
    setTimeout(function() {
      collapseGrid();
      drawGrid();
      setTimeout(function() {
        processMatches(); // recursiv, în caz că apar match-uri noi!
      }, 200);
    }, 200);
  }
}

initGrid();
drawGrid();
