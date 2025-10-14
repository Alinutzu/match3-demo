const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const emojis = ['🔵','🟠','🟢','🟣','🔴'];
let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null;
let score = 0;
let moves = 20;
let gameOver = false;
const obiectiv = 500;
let highscore = Number(localStorage.getItem("match3-highscore")) || 0;
let fadeMap = Array(size).fill().map(() => Array(size).fill(1)); // pentru animație

function initGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = Math.floor(Math.random() * emojis.length);
      fadeMap[y][x] = 1;
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
        ctx.globalAlpha = fadeMap[y][x];
        ctx.fillStyle = "#fff";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emojis[grid[y][x]], x * tileSize + tileSize/2, y * tileSize + tileSize/2);
        ctx.globalAlpha = 1;
      }
      if (selected && selected.x === x && selected.y === y) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 6, tileSize - 6);
      }
    }
  }
  document.getElementById('score').innerText = "Scor: " + score;
  document.getElementById('moves').innerText = "Mutări rămase: " + moves;
  document.getElementById('highscore').innerText = "Highscore: " + highscore;
  document.getElementById('target').innerText = `Obiectiv: ${obiectiv} puncte`;

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 120, canvas.width, 80);
    ctx.font = "26px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (score >= obiectiv) {
      ctx.fillText("Ai câștigat! 🎉", canvas.width/2, canvas.height/2 + 10);
    } else {
      ctx.fillText("Ai pierdut! 😢", canvas.width/2, canvas.height/2 + 10);
    }
    ctx.textAlign = "start";
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("match3-highscore", highscore);
      document.getElementById('highscore').innerText = "Highscore: " + highscore;
    }
  }
}

function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

function detectMatches(testGrid = grid) {
  let toRemove = Array(size).fill().map(() => Array(size).fill(false));
  // Orizontal
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (testGrid[y][x] !== -1 && testGrid[y][x] === testGrid[y][x - 1]) {
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
      if (testGrid[y][x] !== -1 && testGrid[y][x] === testGrid[y - 1][x]) {
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

function hasAnyMatch(matches) {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (matches[y][x]) return true;
  return false;
}

function animateRemoval(matches, callback) {
  let steps = 10;
  let current = 0;
  function animStep() {
    current++;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (matches[y][x]) {
          fadeMap[y][x] = Math.max(0, 1 - current/steps);
        }
      }
    }
    drawGrid();
    if (current < steps) {
      setTimeout(animStep, 20);
    } else {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          fadeMap[y][x] = 1;
      callback();
    }
  }
  animStep();
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
  score += removed * 10;
  return removed > 0;
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
      grid[y][x] = Math.floor(Math.random() * emojis.length);
    }
  }
}

canvas.addEventListener('click', function(e) {
  if (gameOver) return;

  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;

  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      // Swap temporar
      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      drawGrid();

      // Verificăm dacă swap-ul a creat match
      let testMatches = detectMatches();
      if (hasAnyMatch(testMatches)) {
        selected = null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(function() {
          processMatches();
        }, 200);
      } else {
        // Nu este match, undo swap
        setTimeout(function() {
          let temp2 = grid[selected.y][selected.x];
          grid[selected.y][selected.x] = grid[y][x];
          grid[y][x] = temp2;
          drawGrid();
          selected = null;
        }, 300);
      }
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
  if (hasAnyMatch(matches)) {
    animateRemoval(matches, function() {
      removeMatches(matches);
      drawGrid();
      setTimeout(function() {
        collapseGrid();
        drawGrid();
        setTimeout(function() {
          processMatches();
        }, 200);
      }, 200);
    });
  }
}

document.getElementById('restart').addEventListener('click', function() {
  score = 0;
  moves = 20;
  gameOver = false;
  selected = null;
  initGrid();
  drawGrid();
});

initGrid();
drawGrid();
