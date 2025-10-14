const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const baseEmojis = ['🔵','🟠','🟢','🟣','🔴','🟡','🟤'];
// 0-6 = piese normale, 7 = bombă linie, 8 = bombă coloană, 9 = bombă culoare, 10 = piatră, 11 = jeleu
let emojis = baseEmojis.slice(0,5).concat(['💥','💣','🌈','⬛','🍬']); // 🍬 = jeleu

let level = 1;
let grid = Array(size).fill().map(() => Array(size).fill(0));
let selected = null;
let score = 0;
let moves = 15;
let gameOver = false;
let fadeMap = Array(size).fill().map(() => Array(size).fill(1));
let highscore = Number(localStorage.getItem("match3-highscore")) || 0;
let colorMission = 0; // index culoare pentru misiune (ex: 0 - 🔵)
let colorMissionTarget = 10; // cât trebuie eliminat
let colorMissionProgress = 0;
let obstacles = 3;
let colors = 5;
let jeleuCount = 0;
let hintTimeout = null;
let hintMove = null;

const swapSound = document.getElementById('swapSound');
const matchSound = document.getElementById('matchSound');
const powerSound = document.getElementById('powerSound');
const okLevelBtn = document.getElementById('okLevel');

function updateLevelParameters() {
  moves = 15 + 5 * (level - 1);
  obstacles = 3 + 2 * (level - 1);
  colors = Math.min(5 + Math.floor((level-1)/2), baseEmojis.length);
  emojis = baseEmojis.slice(0,colors).concat(['💥','💣','🌈','⬛','🍬']);
  colorMission = Math.floor(Math.random()*colors);
  colorMissionTarget = 10 + level * 2;
  colorMissionProgress = 0;
  jeleuCount = 4 + level * 2;
}

function randomNormalPiece() {
  return Math.floor(Math.random() * colors); // 0...colors-1
}

// Inițializare grilă cu obstacole și jeleu
function initGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = randomNormalPiece();
      fadeMap[y][x] = 1;
    }
  }
  // Adaugă pietre random
  let placed = 0;
  while (placed < obstacles) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    if (grid[y][x] < colors) {
      grid[y][x] = emojis.length-2; // indexul pentru piatră
      placed++;
    }
  }
  // Adaugă jeleu random (🍬)
  placed = 0;
  while (placed < jeleuCount) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    if (grid[y][x] < colors) {
      grid[y][x] = emojis.length-1; // indexul pentru jeleu
      placed++;
    }
  }
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // fundal special pentru piatră și jeleu
      if (grid[y][x] === -1) {
        ctx.fillStyle = "#fff";
      } else if (grid[y][x] === emojis.length-2) { // piatră
        ctx.fillStyle = "#e0e0e0";
      } else if (grid[y][x] === emojis.length-1) { // jeleu
        ctx.fillStyle = "#ffe8e8";
      } else {
        ctx.fillStyle = "#fff";
      }
      ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);

      if (grid[y][x] !== -1) {
        ctx.globalAlpha = fadeMap[y][x];
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emojis[grid[y][x]], x * tileSize + tileSize/2, y * tileSize + tileSize/2);
        ctx.globalAlpha = 1;
      }

      // Hint/indiciu
      if (hintMove && hintMove.x1===x && hintMove.y1===y) {
        ctx.strokeStyle = "#ff0";
        ctx.lineWidth = 4;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 6, tileSize - 6);
      }
      if (hintMove && hintMove.x2===x && hintMove.y2===y) {
        ctx.strokeStyle = "#ff0";
        ctx.lineWidth = 4;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 6, tileSize - 6);
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
  document.getElementById('level').innerText = `Nivel: ${level}`;
  document.getElementById('mission').innerText = `Obiectiv: Elimină ${colorMissionTarget} ${emojis[colorMission]}. Progres: ${colorMissionProgress}`;
  document.getElementById('stars').innerText = "Stele: " + getStars().map(s => "⭐").join("");

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 120, canvas.width, 80);
    ctx.font = "26px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (colorMissionProgress >= colorMissionTarget) {
      ctx.fillText(`Nivel ${level} complet! (${getStars().length} stele)`, canvas.width/2, canvas.height/2 + 10);
      okLevelBtn.style.display = "inline-block";
    } else {
      ctx.fillText("Ai pierdut! 😢", canvas.width/2, canvas.height/2 + 10);
      okLevelBtn.style.display = "none";
    }
    ctx.textAlign = "start";
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("match3-highscore", highscore);
      document.getElementById('highscore').innerText = "Highscore: " + highscore;
    }
  } else {
    okLevelBtn.style.display = "none";
  }
}

function getStars() {
  // 3 stele = misiune completă + scor > misiune*15; 2 = misiune + scor > misiune*10; 1 = misiune doar
  if (colorMissionProgress >= colorMissionTarget) {
    if (score >= colorMissionTarget * 15) return [1,2,3];
    if (score >= colorMissionTarget * 10) return [1,2];
    return [1];
  }
  return [];
}

function isAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

function detectMatches(testGrid = grid) {
  let toRemove = Array(size).fill().map(() => Array(size).fill(false));
  let powerups = [];
  // Orizontal
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (
        testGrid[y][x] !== -1 &&
        testGrid[y][x] !== emojis.length-2 && // piatră
        testGrid[y][x] === testGrid[y][x - 1] &&
        testGrid[y][x-1] !== emojis.length-2
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y][x - k - 1] = true;
          }
          // Bombă de linie/coloană
          if (count === 4) powerups.push({y, x: x-2, type: emojis.length-5}); // 💥
          if (count === 5) powerups.push({y, x: x-3, type: emojis.length-4}); // 💣
          if (count >= 6) powerups.push({y, x: x-4, type: emojis.length-3}); // 🌈 - bombă de culoare
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[y][size - k - 1] = true;
      }
      if (count === 4) powerups.push({y, x: size-2, type: emojis.length-5});
      if (count === 5) powerups.push({y, x: size-3, type: emojis.length-4});
      if (count >=6) powerups.push({y, x: size-4, type: emojis.length-3});
    }
  }
  // Vertical
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (
        testGrid[y][x] !== -1 &&
        testGrid[y][x] !== emojis.length-2 &&
        testGrid[y][x] === testGrid[y-1][x] &&
        testGrid[y-1][x] !== emojis.length-2
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++) {
            toRemove[y - k - 1][x] = true;
          }
          if (count === 4) powerups.push({y: y-2, x, type: emojis.length-5});
          if (count === 5) powerups.push({y: y-3, x, type: emojis.length-4});
          if (count >=6) powerups.push({y: y-4, x, type: emojis.length-3});
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++) {
        toRemove[size - k - 1][x] = true;
      }
      if (count === 4) powerups.push({y: size-2, x, type: emojis.length-5});
      if (count === 5) powerups.push({y: size-3, x, type: emojis.length-4});
      if (count >=6) powerups.push({y: size-4, x, type: emojis.length-3});
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

// Eliminare piese și power-up-uri
function removeMatches(matches, powerups) {
  let removed = 0;
  let colorRemoved = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matches[y][x] && grid[y][x] !== emojis.length-2) { // nu piatră
        if (grid[y][x] === emojis.length-1) { // jeleu
          grid[y][x] = randomNormalPiece(); // jeleul devine o bulină normală
        } else {
          if (grid[y][x] === colorMission) colorRemoved++; // pentru misiune
          grid[y][x] = -1;
        }
        removed++;
      }
    }
  }
  for (const p of powerups) {
    grid[p.y][p.x] = p.type;
  }
  score += removed * 10;
  colorMissionProgress += colorRemoved;
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
      grid[y][x] = randomNormalPiece();
    }
  }
}

// Bombă de culoare (🌈) - click pe bombă, apoi alege o culoare de eliminat
function colorBombActivate(x, y) {
  let chosen = prompt("Alege culoarea de eliminat (ex: 0 pentru 🔵, 1 pentru 🟠...)\n" +
    baseEmojis.slice(0,colors).map((e,i)=>i+":"+e).join(" "));
  chosen = Number(chosen);
  if (isNaN(chosen) || chosen < 0 || chosen >= colors) return;
  for (let yy=0; yy<size; yy++) {
    for (let xx=0; xx<size; xx++) {
      if (grid[yy][xx] === chosen) grid[yy][xx] = -1;
    }
  }
  grid[y][x] = -1;
  powerSound.play();
  drawGrid();
  setTimeout(function() {
    collapseGrid();
    drawGrid();
    setTimeout(function() {
      processMatches();
    }, 200);
  }, 200);
}

// Bombă de linie/coloană
function lineBombActivate(y) {
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
}
function colBombActivate(x) {
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
}

canvas.addEventListener('click', function(e) {
  if (gameOver) return;
  if (hintTimeout) clearTimeout(hintTimeout);
  hintMove = null;

  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;
  if (grid[y][x] === emojis.length-2) return; // piatră

  // Power-ups
  if (grid[y][x] === emojis.length-5) { // bombă linie
    lineBombActivate(y);
    return;
  }
  if (grid[y][x] === emojis.length-4) { // bombă coloană
    colBombActivate(x);
    return;
  }
  if (grid[y][x] === emojis.length-3) { // bombă de culoare
    colorBombActivate(x, y);
    return;
  }

  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      if (grid[y][x] === emojis.length-2 || grid[selected.y][selected.x] === emojis.length-2) return;

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

  // Pornim timer pentru hint/indiciu
  if (!gameOver) hintTimeout = setTimeout(showHint, 3000);
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
  } else {
    // Reîmprospătare grilă dacă nu există mutări posibile
    if (!findAnyValidMove()) {
      alert("Nu există mutări posibile! Grila se reface.");
      initGrid();
      drawGrid();
    }
  }
}

document.getElementById('restart').addEventListener('click', function() {
  score = 0;
  updateLevelParameters();
  moves = moves;
  gameOver = false;
  selected = null;
  okLevelBtn.style.display = "none";
  initGrid();
  drawGrid();
});

okLevelBtn.addEventListener('click', function() {
  level++;
  score = 0;
  updateLevelParameters();
  moves = moves;
  gameOver = false;
  selected = null;
  okLevelBtn.style.display = "none";
  initGrid();
  drawGrid();
});

// Hint/indiciu – evidențiază automat o mutare validă
function showHint() {
  hintMove = findAnyValidMove();
  drawGrid();
}

// Caută primul swap valid din grilă
function findAnyValidMove() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] >= colors) continue; // skip powerup/obstacol
      // verificare swap dreapta
      if (x < size-1 && grid[y][x+1] >= 0 && grid[y][x+1] < colors) {
        swap(grid, x, y, x+1, y);
        let {toRemove} = detectMatches(grid);
        swap(grid, x, y, x+1, y); // undo
        if (hasAnyMatch(toRemove)) return {x1:x, y1:y, x2:x+1, y2:y};
      }
      // verificare swap jos
      if (y < size-1 && grid[y+1][x] >= 0 && grid[y+1][x] < colors) {
        swap(grid, x, y, x, y+1);
        let {toRemove} = detectMatches(grid);
        swap(grid, x, y, x, y+1); // undo
        if (hasAnyMatch(toRemove)) return {x1:x, y1:y, x2:x, y2:y+1};
      }
    }
  }
  return null;
}

// Swap utilitar
function swap(arr, x1, y1, x2, y2) {
  let temp = arr[y1][x1];
  arr[y1][x1] = arr[y2][x2];
  arr[y2][x2] = temp;
}

// Start joc
updateLevelParameters();
initGrid();
drawGrid();
