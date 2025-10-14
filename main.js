const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
// 0-4 = piese normale, 5 = bombă linie, 6 = bombă coloană, 7 = piatră
const emojis = ['🔵','🟠','🟢','🟣','🔴','💥','💣','🧱'];
let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null;
let score = 0;
let moves = 20;
let gameOver = false;
const obiectiv = 500;
let highscore = Number(localStorage.getItem("match3-highscore")) || 0;
let fadeMap = Array(size).fill().map(() => Array(size).fill(1));

const swapSound = document.getElementById('swapSound');
const matchSound = document.getElementById('matchSound');
const powerSound = document.getElementById('powerSound');

function randomNormalPiece() {
  return Math.floor(Math.random() * 5); // 0-4
}

// Inițializează grila cu piese și câteva pietre
function initGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = randomNormalPiece();
      fadeMap[y][x] = 1;
    }
  }
  // Adaugă 5 pietre random
  for (let i=0; i<5; i++) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    grid[y][x] = 7; // piatră
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

// detectMatches returnează: matrice de piese de eliminat + posibile power-up-uri
function detectMatches(testGrid = grid) {
  let toRemove = Array(size).fill().map(() => Array(size).fill(false));
  let powerups = [];
  // Orizontal
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (
        testGrid[y][x] !== -1 && testGrid[y][x] !== 7 && // să nu fie piatră
        testGrid[y][x] === testGrid[y][x - 1]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y][x - k - 1] = true;
          }
          // Power-up: bombă de linie (match de 4 sau 5)
          if (count === 4) powerups.push({y, x: x-2, type: 5});
          if (count >=5) powerups.push({y, x: x-3, type: 6});
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[y][size - k - 1] = true;
      }
      if (count === 4) powerups.push({y, x: size-2, type: 5});
      if (count >=5) powerups.push({y, x: size-3, type: 6});
    }
  }
  // Vertical
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (
        testGrid[y][x] !== -1 && testGrid[y][x] !== 7 &&
        testGrid[y][x] === testGrid[y-1][x]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y - k - 1][x] = true;
          }
          // Power-up: bombă de linie/coloană
          if (count === 4) powerups.push({y: y-2, x, type: 5});
          if (count >= 5) powerups.push({y: y-3, x, type: 6});
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[size - k - 1][x] = true;
      }
      if (count === 4) powerups.push({y: size-2, x, type: 5});
      if (count >= 5) powerups.push({y: size-3, x, type: 6});
    }
  }
  return {toRemove, powerups};
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

// Eliminare piese și generare power-up-uri (bombă)
function removeMatches(matches, powerups) {
  let removed = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matches[y][x]) {
        grid[y][x] = -1;
        removed++;
      }
    }
  }
  // Generează power-up-uri pe locul potrivit
  for (const p of powerups) {
    grid[p.y][p.x] = p.type;
  }
  score += removed * 10;
  return removed > 0;
}

// Cădere piese + generare piese noi
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
      grid[y][x] = randomNormalPiece();
    }
  }
}

canvas.addEventListener('click', function(e) {
  if (gameOver) return;

  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;

  // Obstacol/piatră nu se poate selecta
  if (grid[y][x] === 7) return;

  // Power-up: click pe bombă
  if (grid[y][x] === 5) { // bombă linie
    grid[y].fill(-1);
    score += size * 10;
    powerSound.play();
    drawGrid();
    setTimeout(function() {
      collapseGrid();
      drawGrid();
      setTimeout(function() {
        processMatches();
      }, 200);
    }, 200);
    return;
  }
  if (grid[y][x] === 6) { // bombă coloană
    for (let yy=0; yy<size; yy++) grid[yy][x] = -1;
    score += size * 10;
    powerSound.play();
    drawGrid();
    setTimeout(function() {
      collapseGrid();
      drawGrid();
      setTimeout(function() {
        processMatches();
      }, 200);
    }, 200);
    return;
  }

  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      // Swap temporar și verificăm dacă rezultă match
      if (grid[x][y] === 7 || grid[selected.y][selected.x] === 7) return; // nu poți muta pietre

      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      drawGrid();

      swapSound.play();

      let testGrid = grid.map(row => row.slice());
      let {toRemove, powerups} = detectMatches(testGrid);

      if (hasAnyMatch(toRemove)) {
        selected = null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(function() {
          processMatches();
        }, 200);
      } else {
        // Nu e match, swap-ul se anulează
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
  let {toRemove, powerups} = detectMatches();
  if (hasAnyMatch(toRemove)) {
    matchSound.play();
    animateRemoval(toRemove, function() {
      removeMatches(toRemove, powerups);
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
