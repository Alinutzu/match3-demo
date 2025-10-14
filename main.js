const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const colors = ['#48f', '#f84', '#4f8', '#f48', '#ff4'];

let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null; // {x, y}

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
      ctx.fillStyle = colors[grid[y][x]];
      ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);

      // Highlight piesa selectată
      if (selected && selected.x === x && selected.y === y) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 6, tileSize - 6);
      }
    }
  }
}

// Verifică dacă două piese sunt adiacente
function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

// Handler click pe canvas
canvas.addEventListener('mousedown', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const x = Math.floor(mx / tileSize);
  const y = Math.floor(my / tileSize);

  // Verifică dacă click-ul este pe grilă
  if (x < 0 || x >= size || y < 0 || y >= size) return;

  if (selected) {
    // Dacă ai selectat deja o piesă, încearcă swap
    if (isAdjacent(selected.x, selected.y, x, y)) {
      // Swap piesele
      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      selected = null;
      drawGrid();
      // Urmează detectare match-uri!
    } else {
      // Selectează altă piesă
      selected = {x, y};
      drawGrid();
    }
  } else {
    // Prima selecție
    selected = {x, y};
    drawGrid();
  }
});

initGrid();
drawGrid();
