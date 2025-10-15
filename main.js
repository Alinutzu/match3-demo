const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;

// Emojis: 0-5 buline, 6 ingredient 🍎, 7 bombă linie 💥, 8 bombă coloană 💣, 9 bombă culoare 🌈,
// 10 ciocolată 🍫, 11 portal 🌀, 12 blocaj încuiat 🔒
const baseEmojis = ['🔵','🟠','🟢','🟣','🔴','🟡','🍎','💥','💣','🌈','🍫','🌀','🔒'];
let emojis = baseEmojis.slice(0,13);

// Sunete
const swapSound = document.getElementById('swapSound');
const matchSound = document.getElementById('matchSound');
const popSound = document.getElementById('popSound');
const explosionSound = document.getElementById('explosionSound');
const winSound = document.getElementById('winSound');
const failSound = document.getElementById('failSound');

function playSwap() { swapSound.currentTime = 0; swapSound.play(); }
function playMatch() { matchSound.currentTime = 0; matchSound.play(); }
function playPop() { popSound.currentTime = 0; popSound.play(); }
function playExplosion() { explosionSound.currentTime = 0; explosionSound.play(); }
function playWin() { winSound.currentTime = 0; winSound.play(); }
function playFail() { failSound.currentTime = 0; failSound.play(); }

// State
let level = 1;
let grid = [];
let selected = null;
let score = 0;
let moves = 15;
let gameOver = false;
let fadeMap = [];
let highscore = Number(localStorage.getItem("match3-highscore")) || 0;
let missionColor = 0; // bulină pentru misiune
let missionColorTarget = 10; // câte buline de eliminat
let missionColorProgress = 0;
let ingredientType = 6; // 🍎 index
let ingredientCount = 2;
let ingredientDelivered = 0;
let portalPairs = []; // perechi de portaluri
let lockPositions = []; // blocaje încuiate
let hintTimeout = null;
let hintMove = null;

function updateLevelParameters() {
  moves = 15 + 5 * (level - 1);
  ingredientCount = 2 + Math.floor(level/2);
  missionColor = Math.floor(Math.random()*6);
  missionColorTarget = 10 + level * 2;
  missionColorProgress = 0;
  ingredientType = 6; // 🍎, poți alterna cu 7 pentru 🍒
  ingredientDelivered = 0;
}

// Buline normale
function randomNormalPiece() {
  return Math.floor(Math.random() * 6); // 0...5 buline
}

// Inițializare grilă cu obstacole, ingrediente, portaluri și blocaje încuiate
function initGrid() {
  grid = Array(size).fill().map(() => Array(size).fill(0));
  fadeMap = Array(size).fill().map(() => Array(size).fill(1));
  portalPairs = [];
  lockPositions = [];
  // buline normale
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      grid[y][x] = randomNormalPiece();
  // ingrediente
  let placed = 0;
  while (placed < ingredientCount) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*Math.floor(size/2));
    if (grid[y][x] < 6) {
      grid[y][x] = ingredientType;
      placed++;
    }
  }
  // portaluri: mereu în pereche
  portalPairs = [
    [ [0,0], [size-1,size-1] ], 
    [ [0,size-1], [size-1,0] ]
  ];
  for (let i=0; i<portalPairs.length; i++) {
    let [a,b] = portalPairs[i];
    grid[a[0]][a[1]] = 11; // portal 🌀
    grid[b[0]][b[1]] = 11;
  }
  // blocaje încuiate
  for (let i=0;i<2+level;i++) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    if(grid[y][x]<6){
      grid[y][x]=12; // 🔒
      lockPositions.push([y,x]);
    }
  }
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if(grid[y][x]===11) ctx.fillStyle="#e0e0ff"; // portal
      else if(grid[y][x]===12) ctx.fillStyle="#f9ebea"; // lock
      else ctx.fillStyle="#fff";
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
  document.getElementById('score').innerText = "Scor: " + score;
  document.getElementById('moves').innerText = "Mutări rămase: " + moves;
  document.getElementById('highscore').innerText = "Highscore: " + highscore;
  document.getElementById('level').innerText = `Nivel: ${level}`;
  document.getElementById('mission').innerText = `Obiectiv: Adu ${ingredientCount} ${emojis[ingredientType]} jos & Elimină ${missionColorTarget} ${emojis[missionColor]}. Progres: ${ingredientDelivered}/${ingredientCount}, Buline: ${missionColorProgress}`;
  document.getElementById('stars').innerText = "Stele: " + getStars().map(s => "⭐").join("");

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 120, canvas.width, 80);
    ctx.font = "26px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (ingredientDelivered >= ingredientCount && missionColorProgress >= missionColorTarget) {
      ctx.fillText(`Nivel ${level} complet! (${getStars().length} stele)`, canvas.width/2, canvas.height/2 + 10);
      playWin();
      document.getElementById('okLevel').style.display = "inline-block";
    } else {
      ctx.fillText("Ai pierdut! 😢", canvas.width/2, canvas.height/2 + 10);
      playFail();
      document.getElementById('okLevel').style.display = "none";
    }
    ctx.textAlign = "start";
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("match3-highscore", highscore);
      document.getElementById('highscore').innerText = "Highscore: " + highscore;
    }
  } else {
    document.getElementById('okLevel').style.display = "none";
  }
}

function getStars() {
  if (ingredientDelivered >= ingredientCount && missionColorProgress >= missionColorTarget) {
    if (score >= (missionColorTarget + ingredientCount*30) * 2) return [1,2,3];
    if (score >= (missionColorTarget + ingredientCount*30) * 1.5) return [1,2];
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
  for (let y = 0; y < size; y++) {
    let count = 1;
    for (let x = 1; x < size; x++) {
      if (
        testGrid[y][x] !== -1 &&
        testGrid[y][x] < 6 &&
        testGrid[y][x] === testGrid[y][x - 1]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++)
            toRemove[y][x - k - 1] = true;
          if (count === 4) powerups.push({y, x: x-2, type: 7}); // 💥
          if (count === 5) powerups.push({y, x: x-3, type: 8}); // 💣
          if (count >= 6) powerups.push({y, x: x-4, type: 9}); // 🌈
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++)
        toRemove[y][size - k - 1] = true;
      if (count === 4) powerups.push({y, x: size-2, type: 7});
      if (count === 5) powerups.push({y, x: size-3, type: 8});
      if (count >=6) powerups.push({y, x: size-4, type: 9});
    }
  }
  for (let x = 0; x < size; x++) {
    let count = 1;
    for (let y = 1; y < size; y++) {
      if (
        testGrid[y][x] !== -1 &&
        testGrid[y][x] < 6 &&
        testGrid[y][x] === testGrid[y-1][x]
      ) {
        count++;
      } else {
        if (count >= 3) {
          for (let k = 0; k < count; k++)
            toRemove[y - k - 1][x] = true;
          if (count === 4) powerups.push({y: y-2, x, type: 7});
          if (count === 5) powerups.push({y: y-3, x, type: 8});
          if (count >=6) powerups.push({y: y-4, x, type: 9});
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let k = 0; k < count; k++)
        toRemove[size - k - 1][x] = true;
      if (count === 4) powerups.push({y: size-2, x, type: 7});
      if (count === 5) powerups.push({y: size-3, x, type: 8});
      if (count >=6) powerups.push({y: size-4, x, type: 9});
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
  let steps = 10, current = 0;
  function animStep() {
    current++;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (matches[y][x]) fadeMap[y][x] = Math.max(0, 1 - current/steps);
    drawGrid();
    if (current < steps) setTimeout(animStep, 20);
    else {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          fadeMap[y][x] = 1;
      callback();
    }
  }
  animStep();
}

function removeMatches(matches, powerups) {
  let removed = 0, colorRemoved = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (matches[y][x]) {
        if (grid[y][x] === missionColor) colorRemoved++;
        grid[y][x] = -1;
        removed++;
      }
  for (const p of powerups)
    grid[p.y][p.x] = p.type; // bombă linie/coloană/culoare
  score += removed * 10;
  missionColorProgress += colorRemoved;
  if (removed) playMatch();
  if (removed >= 10) playPop();
  if (powerups.length) playExplosion();
  return removed > 0;
}

function collapseGrid() {
  // teleportare: dacă piesa cade pe portal, apare în perechea portalului
  for (let x = 0; x < size; x++) {
    let pointer = size - 1;
    for (let y = size - 1; y >= 0; y--)
      if (grid[y][x] !== -1) grid[pointer][x] = grid[y][x], pointer--;
    for (let y = pointer; y >= 0; y--)
      grid[y][x] = -1;
  }
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      if (grid[y][x] === -1)
        grid[y][x] = randomNormalPiece();
  // teleportare
  for (let i=0; i<portalPairs.length; i++) {
    let [a,b]=portalPairs[i];
    // dacă pe portal a cade o piesă normală, mut-o pe portal b
    if (grid[a[0]][a[1]] < 6) {
      grid[b[0]][b[1]] = grid[a[0]][a[1]];
      grid[a[0]][a[1]] = 11;
      playSwap();
    }
    if (grid[b[0]][b[1]] < 6) {
      grid[a[0]][a[1]] = grid[b[0]][b[1]];
      grid[b[0]][b[1]] = 11;
      playSwap();
    }
  }
}

function checkIngredientsDelivered() {
  for (let x = 0; x < size; x++) {
    let y = size - 1;
    if (grid[y][x] === ingredientType) {
      ingredientDelivered++;
      grid[y][x] = randomNormalPiece();
      playExplosion();
      playPop();
    }
  }
}

// Blocaje încuiate: elimină dacă e match lângă ele
function unlockLocks(matches) {
  for(const [ly,lx] of lockPositions){
    let unlocked=false;
    // dacă e match pe o vecinătate
    for(const [dy,dx] of [[0,1],[1,0],[0,-1],[-1,0]]){
      let yy=ly+dy,xx=lx+dx;
      if(yy>=0&&yy<size&&xx>=0&&xx<size){
        if(matches[yy][xx]) unlocked=true;
      }
    }
    if(unlocked){
      grid[ly][lx]=randomNormalPiece();
      playExplosion();
    }
  }
}

// Combinații power-up-uri: swap între două power-up-uri
function tryPowerCombo(x1,y1,x2,y2){
  let p1=grid[y1][x1],p2=grid[y2][x2];
  // bombă linie + bombă coloană
  if((p1===7&&p2===8)||(p1===8&&p2===7)){
    for(let i=0;i<size;i++)
      grid[y1][i]=-1,grid[i][x2]=-1;
    playExplosion();
    playPop();
    return true;
  }
  // bombă culoare + orice bombă
  if((p1===9&&(p2===7||p2===8))||(p2===9&&(p1===7||p1===8))){
    for(let y=0;y<size;y++)
      for(let x=0;x<size;x++)
        grid[y][x]=-1;
    playExplosion();
    playPop();
    return true;
  }
  // bombă culoare + bombă culoare
  if(p1===9&&p2===9){
    for(let y=0;y<size;y++)
      for(let x=0;x<size;x++)
        grid[y][x]=-1;
    playExplosion();
    playPop();
    return true;
  }
  return false;
}

canvas.addEventListener('click', function(e) {
  if (gameOver) return;
  if (hintTimeout) clearTimeout(hintTimeout);
  hintMove = null;

  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;
  // portal și lock nu se mută
  if (grid[y][x] === 11 || grid[y][x] === 12) return;

  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      // nu se mută portal, lock
      if (grid[y][x] === 11 || grid[y][x] === 12 || grid[selected.y][selected.x] === 11 || grid[selected.y][selected.x] === 12) return;

      // combinație power-up-uri
      if(tryPowerCombo(selected.x,selected.y,x,y)){
        selected=null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(processMatches, 200);
        return;
      }

      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      playSwap();
      drawGrid();
      let testGrid = grid.map(row => row.slice());
      let {toRemove,powerups} = detectMatches(testGrid);
      if (hasAnyMatch(toRemove)) {
        selected = null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(processMatches, 200);
      } else {
        setTimeout(() => {
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
  if (!gameOver) hintTimeout = setTimeout(showHint, 3000);
});

function processMatches() {
  let {toRemove,powerups} = detectMatches();
  if (hasAnyMatch(toRemove)) {
    animateRemoval(toRemove, function() {
      removeMatches(toRemove,powerups);
      unlockLocks(toRemove);
      drawGrid();
      setTimeout(() => {
        collapseGrid();
        checkIngredientsDelivered();
        drawGrid();
        setTimeout(processMatches, 200);
      }, 200);
    });
  } else {
    // Reîmprospătare grilă dacă nu există mutări posibile
    if (!findAnyValidMove()) {
      alert("Nu există mutări posibile! Grila se reface.");
      playFail();
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
  document.getElementById('okLevel').style.display = "none";
  initGrid();
  drawGrid();
});

document.getElementById('okLevel').addEventListener('click', function() {
  level++;
  score = 0;
  updateLevelParameters();
  moves = moves;
  gameOver = false;
  selected = null;
  document.getElementById('okLevel').style.display = "none";
  initGrid();
  drawGrid();
});

function showHint() { hintMove = findAnyValidMove(); drawGrid(); }

function findAnyValidMove() {
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === 11 || grid[y][x] === 12) continue;
      // Dreapta
      if (x < size-1 && grid[y][x+1] >= 0 && grid[y][x+1] !== 11 && grid[y][x+1] !== 12) {
        swap(grid, x, y, x+1, y);
        let {toRemove} = detectMatches(grid);
        swap(grid, x, y, x+1, y);
        if (hasAnyMatch(toRemove)) return {x1:x, y1:y, x2:x+1, y2:y};
      }
      // Jos
      if (y < size-1 && grid[y+1][x] >= 0 && grid[y+1][x] !== 11 && grid[y+1][x] !== 12) {
        swap(grid, x, y, x, y+1);
        let {toRemove} = detectMatches(grid);
        swap(grid, x, y, x, y+1);
        if (hasAnyMatch(toRemove)) return {x1:x, y1:y, x2:x, y2:y+1};
      }
    }
  return null;
}
function swap(arr, x1, y1, x2, y2) {
  let temp = arr[y1][x1];
  arr[y1][x1] = arr[y2][x2];
  arr[y2][x2] = temp;
}

// Start joc
updateLevelParameters();
initGrid();
drawGrid();
