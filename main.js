// CONFIG
const NUM_LEVELS = 10;
const INITIAL_LIVES = 3;
const LIFE_REGEN_MINUTES = 10;
const LEVEL_TIME_LIMITS = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240];
const size = 8, tileSize = 40;
const baseEmojis = [
  '🔵','🟠','🟢','🟣','🔴','🟡','🍎','💥','💣','🌈','🍫','🌀','🔒'
];
let emojis = baseEmojis.slice(0,13);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
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

// MAP & PROGRESS
let levelData = [];
let mapProgress = JSON.parse(localStorage.getItem('match3_mapProgress')||'{}');
let leaderboardData = JSON.parse(localStorage.getItem('match3_leaderboard')||'[]');
let lives = Number(localStorage.getItem('match3_lives')) || INITIAL_LIVES;
let lastLifeLoss = Number(localStorage.getItem('match3_lastLifeLoss')) || Date.now();
let currentLevel = 1;
let timerInterval = null;
let lifeRegenTimer = null;

// GAME STATE
let grid = [];
let selected = null;
let score = 0;
let moves = 15;
let gameOver = false;
let fadeMap = [];
let highscore = Number(localStorage.getItem("match3-highscore")) || 0;
let missionColor = 0;
let missionColorTarget = 10;
let missionColorProgress = 0;
let ingredientType = 6;
let ingredientCount = 2;
let ingredientDelivered = 0;
let portalPairs = [];
let lockPositions = [];
let hintTimeout = null;
let hintMove = null;
let timer = 60;
let timeLeft = 60;
let objectives = [];
let bonusPowerups = 0;

// LEVEL OBJECTIVES
function setupLevels(){
  levelData = [];
  for(let i=1;i<=NUM_LEVELS;i++){
    let obj = [];
    obj.push({type:'score', target: 250+100*i});
    obj.push({type:'color', color: i%6, target: 8+2*i});
    if(i%2===0) obj.push({type:'ingredient', count: 2+Math.floor(i/2)});
    levelData.push(obj);
  }
}
setupLevels();

// MAP SCREEN
function renderMapScreen() {
  document.getElementById('mapScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('lives').innerHTML = `Vieți: ${'❤️'.repeat(lives)}${'🤍'.repeat(Math.max(0,INITIAL_LIVES-lives))} (reîncărcare: <span id="lifeTimer">00:00</span>)`;
  let html = '';
  for(let i=1;i<=NUM_LEVELS;i++){
    let ok = mapProgress[i]?.win;
    html+=`<button onclick="startLevel(${i})" style="margin:3px;${ok?'background:#b2ffb2':''}" ${lives>0?'':'disabled'}>Nivel ${i}${ok?' ⭐':''}</button>`;
  }
  document.getElementById('levelButtons').innerHTML=html;
  let tb = '<tr><th>Level</th><th>Score</th><th>Stars</th></tr>';
  leaderboardData.slice(0,10).forEach(row=>tb+=`<tr><td>${row.level}</td><td>${row.score}</td><td>${'⭐'.repeat(row.stars)}</td></tr>`);
  document.getElementById('leaderboard').innerHTML=tb;
  updateLifeTimer();
}
function updateLifeTimer() {
  if(lives>=INITIAL_LIVES){
    document.getElementById('lifeTimer').innerText='--:--';
    return;
  }
  let nextLife = lastLifeLoss+LIFE_REGEN_MINUTES*60000;
  let ms = Math.max(0, nextLife-Date.now());
  let mm = Math.floor(ms/60000), ss = Math.floor((ms%60000)/1000);
  document.getElementById('lifeTimer').innerText = `${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  if(ms===0){
    lives++;
    localStorage.setItem('match3_lives',lives);
    lastLifeLoss = Date.now();
    localStorage.setItem('match3_lastLifeLoss',lastLifeLoss);
    renderMapScreen();
  }else{
    lifeRegenTimer = setTimeout(updateLifeTimer, 1000);
  }
}

// LEVEL START
function startLevel(lvl){
  currentLevel = lvl;
  document.getElementById('mapScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  lives--;
  localStorage.setItem('match3_lives',lives);
  lastLifeLoss = Date.now();
  localStorage.setItem('match3_lastLifeLoss',lastLifeLoss);
  objectives = levelData[lvl-1];
  missionColor = objectives[1]?.color ?? 0;
  missionColorTarget = objectives[1]?.target ?? 10;
  ingredientCount = objectives[2]?.count ?? 0;
  ingredientType = 6;
  ingredientDelivered = 0;
  missionColorProgress = 0;
  score = 0;
  moves = 20 + Math.floor(lvl*1.5);
  timer = LEVEL_TIME_LIMITS[lvl-1] ?? 60;
  timeLeft = timer;
  bonusPowerups = 1 + Math.floor(Math.random()*2);
  gameOver = false;
  selected = null;
  document.getElementById('okLevel').style.display = "none";
  document.getElementById('levelTitle').innerText = `Nivel ${lvl}`;
  let objtxt = '';
  objectives.forEach(o=>{
    if(o.type==='score') objtxt+=`Scor: ${o.target} `;
    if(o.type==='color') objtxt+=`Elimină ${o.target} ${emojis[o.color]} `;
    if(o.type==='ingredient') objtxt+=`Adu ${o.count} ${emojis[ingredientType]} jos `;
  });
  document.getElementById('objectives').innerText = objtxt.trim();
  updateLevelParameters();
  initGrid();
  drawGrid();
  document.getElementById('timer').style.display = 'block';
  document.getElementById('timeLeft').innerText = `${timeLeft}s`;
  timerInterval && clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    timeLeft--;
    document.getElementById('timeLeft').innerText = `${timeLeft}s`;
    if(timeLeft<=0 && !gameOver){
      gameOver = true;
      drawGrid();
    }
  },1000);
}

// INIT GRID + BONUS
function updateLevelParameters() {
  moves = 15 + 5 * (currentLevel - 1);
  ingredientCount = objectives[2]?.count ?? 0;
  missionColor = objectives[1]?.color ?? 0;
  missionColorTarget = objectives[1]?.target ?? 10;
  missionColorProgress = 0;
  ingredientType = 6;
  ingredientDelivered = 0;
}

function randomNormalPiece() {
  return Math.floor(Math.random() * 6);
}

function initGrid() {
  grid = Array(size).fill().map(() => Array(size).fill(0));
  fadeMap = Array(size).fill().map(() => Array(size).fill(1));
  portalPairs = [
    [ [0,0], [size-1,size-1] ], 
    [ [0,size-1], [size-1,0] ]
  ];
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
  for (let i=0; i<portalPairs.length; i++) {
    let [a,b] = portalPairs[i];
    grid[a[0]][a[1]] = 11;
    grid[b[0]][b[1]] = 11;
  }
  // blocaje încuiate
  for (let i=0;i<2+currentLevel;i++) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    if(grid[y][x]<6){
      grid[y][x]=12;
      lockPositions.push([y,x]);
    }
  }
  // power-up random bonus la început
  for (let i=0;i<bonusPowerups;i++) {
    let x = Math.floor(Math.random()*size);
    let y = Math.floor(Math.random()*size);
    if(grid[y][x]<6){
      grid[y][x]=7+Math.floor(Math.random()*3);
    }
  }
}

// DRAW & UI
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if(grid[y][x]===11) ctx.fillStyle="#e0e0ff";
      else if(grid[y][x]===12) ctx.fillStyle="#f9ebea";
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
  document.getElementById('levelTitle').innerText = `Nivel ${currentLevel}`;
  let objtxt = '';
  objectives.forEach(o=>{
    if(o.type==='score') objtxt+=`Scor: ${o.target} `;
    if(o.type==='color') objtxt+=`Elimină ${o.target} ${emojis[o.color]} `;
    if(o.type==='ingredient') objtxt+=`Adu ${o.count} ${emojis[ingredientType]} jos `;
  });
  document.getElementById('objectives').innerText = objtxt.trim();
  document.getElementById('stars').innerText = "Stele: " + getStars().map(s => "⭐").join("");

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 120, canvas.width, 80);
    ctx.font = "26px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (ingredientDelivered >= ingredientCount && missionColorProgress >= missionColorTarget && score >= objectives[0].target) {
      ctx.fillText(`Nivel ${currentLevel} complet! (${getStars().length} stele)`, canvas.width/2, canvas.height/2 + 10);
      playWin();
      document.getElementById('okLevel').style.display = "inline-block";
      leaderboardData.unshift({level:currentLevel,score:score,stars:getStars().length});
      leaderboardData=leaderboardData.slice(0,20);
      localStorage.setItem('match3_leaderboard',JSON.stringify(leaderboardData));
      mapProgress[currentLevel]={win:true,stars:getStars().length};
      localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
    } else {
      ctx.fillText("Ai pierdut! 😢", canvas.width/2, canvas.height/2 + 10);
      playFail();
      document.getElementById('okLevel').style.display = "none";
      mapProgress[currentLevel]={win:false,stars:0};
      localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
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
  let ok = [];
  if (score >= objectives[0].target) ok.push(1);
  if (missionColorProgress >= missionColorTarget) ok.push(2);
  if (ingredientDelivered >= ingredientCount && ingredientCount>0) ok.push(3);
  return ok;
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
          if (count === 4) powerups.push({y, x: x-2, type: 7});
          if (count === 5) powerups.push({y, x: x-3, type: 8});
          if (count >= 6) powerups.push({y, x: x-4, type: 9});
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
    grid[p.y][p.x] = p.type;
  score += removed * 10;
  missionColorProgress += colorRemoved;
  if (removed) playMatch();
  if (removed >= 10) playPop();
  if (powerups.length) playExplosion();
  return removed > 0;
}

// Cascade automatic
function processCascade() {
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
        setTimeout(processCascade, 200);
      }, 200);
    });
    return true;
  } else {
    if (!findAnyValidMove()) {
      alert("Nu există mutări posibile! Grila se reface.");
      playFail();
      initGrid();
      drawGrid();
    }
    return false;
  }
}

function collapseGrid() {
  for (let x = 0; x < size; x++) {
    let pointer = size - 1;
    // Mută DOAR bulinele normale/ingredientul (0-6) în jos
    for (let y = size - 1; y >= 0; y--) {
      if (grid[y][x] >= 0 && grid[y][x] <= 6) {
        grid[pointer][x] = grid[y][x];
        if (pointer !== y) grid[y][x] = -1;
        pointer--;
      }
    }
    // Umple golurile de sus cu buline noi, dar nu suprascrie piesele speciale
    for (let y = pointer; y >= 0; y--) {
      // Daca pe pozitia respectiva era o piesa speciala, nu o suprascrie!
      if (grid[y][x] === -1) grid[y][x] = randomNormalPiece();
    }
  }
  // Portalurile, locks, bombs etc. rămân pe poziții (nu se mută)
  // Teleportare portaluri
  for (let i = 0; i < portalPairs.length; i++) {
    let [a, b] = portalPairs[i];
    if (grid[a[0]][a[1]] >= 0 && grid[a[0]][a[1]] <= 6) {
      grid[b[0]][b[1]] = grid[a[0]][a[1]];
      grid[a[0]][a[1]] = 11;
      playSwap();
    }
    if (grid[b[0]][b[1]] >= 0 && grid[b[0]][b[1]] <= 6) {
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

function unlockLocks(matches) {
  for(const [ly,lx] of lockPositions){
    let unlocked=false;
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

function tryPowerCombo(x1,y1,x2,y2){
  let p1=grid[y1][x1],p2=grid[y2][x2];
  if((p1===7&&p2===8)||(p1===8&&p2===7)){
    for(let i=0;i<size;i++)
      grid[y1][i]=-1,grid[i][x2]=-1;
    playExplosion();
    playPop();
    score += size*size*10;
    return true;
  }
  if((p1===9&&(p2===7||p2===8))||(p2===9&&(p1===7||p1===8))){
    for(let y=0;y<size;y++)
      for(let x=0;x<size;x++)
        grid[y][x]=-1;
    playExplosion();
    playPop();
    score += size*size*20;
    return true;
  }
  if(p1===9&&p2===9){
    for(let y=0;y<size;y++)
      for(let x=0;x<size;x++)
        grid[y][x]=-1;
    playExplosion();
    playPop();
    score += size*size*25;
    return true;
  }
  return false;
}

function activatePowerUp(x, y) {
  let p = grid[y][x];
  if (p === 7) {
    for (let i=0;i<size;i++) grid[y][i] = -1;
    playExplosion();
    playPop();
    score += size*10;
  }
  else if (p === 8) {
    for (let i=0;i<size;i++) grid[i][x] = -1;
    playExplosion();
    playPop();
    score += size*10;
  }
  else if (p === 9) {
    let chosen = prompt("Alege culoarea pentru eliminare (0-5):\n" +
      baseEmojis.slice(0,6).map((e,i)=>i+":"+e).join(" "));
    chosen = Number(chosen);
    if (isNaN(chosen) || chosen < 0 || chosen > 5) return;
    for (let yy=0;yy<size;yy++)
      for (let xx=0;xx<size;xx++)
        if (grid[yy][xx] === chosen) grid[yy][xx] = -1;
    playExplosion();
    playPop();
    score += size*size*5;
  }
  grid[y][x] = randomNormalPiece();
  drawGrid();
  setTimeout(() => {
    collapseGrid();
    drawGrid();
    setTimeout(processCascade, 200);
  }, 200);
}

canvas.addEventListener('click', function(e) {
  if (gameOver || timeLeft <= 0) return;
  if (hintTimeout) clearTimeout(hintTimeout);
  hintMove = null;

  const x = Math.floor(e.offsetX / tileSize);
  const y = Math.floor(e.offsetY / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;
  if (grid[y][x] === 7 || grid[y][x] === 8 || grid[y][x] === 9) {
    activatePowerUp(x, y);
    moves--;
    if (moves <= 0) gameOver = true;
    return;
  }
  if (grid[y][x] === 11 || grid[y][x] === 12) return;
  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      if (grid[y][x] === 11 || grid[y][x] === 12 || grid[selected.y][selected.x] === 11 || grid[selected.y][selected.x] === 12) return;
      if(tryPowerCombo(selected.x,selected.y,x,y)){
        selected=null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(processCascade, 200);
        return;
      }
      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      playSwap();
      drawGrid();
      setTimeout(processCascade, 200);
      selected=null;
      moves--;
      if (moves <= 0) gameOver = true;
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

// Restart / OK
document.getElementById('restart').addEventListener('click', function() {
  startLevel(currentLevel);
});
document.getElementById('okLevel').addEventListener('click', function() {
  renderMapScreen();
});

// INIT
renderMapScreen();
