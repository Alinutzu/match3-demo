// CONFIG
const MAX_LEVELS = 20;
const INITIAL_LIVES = 3;
const LIFE_REGEN_MINUTES = 1;
const LEVEL_TIME_LIMITS = Array.from({length: MAX_LEVELS}, (_, i) => 60 + i * 10);
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
function playSwap() { if(swapSound) {swapSound.currentTime = 0; swapSound.play();} }
function playMatch() { if(matchSound) {matchSound.currentTime = 0; matchSound.play();} }
function playPop() { if(popSound) {popSound.currentTime = 0; popSound.play();} }
function playExplosion() { if(explosionSound) {explosionSound.currentTime = 0; explosionSound.play();} }
function playWin() { if(winSound) {winSound.currentTime = 0; winSound.play();} }
function playFail() { if(failSound) {failSound.currentTime = 0; failSound.play();} }

// PROGRESS
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
let lastLevelWin = false;

// LEVEL GENERATION (dificultate progresivă)
function generateLevelData(level){
  return [
    {type:'score', target: 200 + level * 50},
    {type:'color', color: level % 6, target: 8 + level * 2},
    {type:'ingredient', count: Math.min(1 + Math.floor(level/2), 5)}
  ];
}
canvas.addEventListener('click', function(e) {
  if (gameOver || timeLeft <= 0) return;
  if (hintTimeout) clearTimeout(hintTimeout);
  hintMove = null;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize);
  const y = Math.floor((e.clientY - rect.top) / tileSize);

  if (x < 0 || x >= size || y < 0 || y >= size) return;
  if (grid[y][x] === 7 || grid[y][x] === 8 || grid[y][x] === 9) {
    activatePowerUp(x, y);
    moves--;
    if (moves <= 0) gameOver = true;
    drawGrid();
    return;
  }
  if (grid[y][x] === 11 || grid[y][x] === 12) return;
  if (selected) {
    if (isAdjacent(selected.x, selected.y, x, y)) {
      if (grid[y][x] === 11 || grid[y][x] === 12 || grid[selected.y][selected.x] === 11 || grid[selected.y][selected.x] === 12) return;
      if(tryPowerCombo(selected.x,selected.y,x,y)){
        selected = null;
        moves--;
        if (moves <= 0) gameOver = true;
        setTimeout(processCascade, 200);
        drawGrid();
        return;
      }
      let temp = grid[selected.y][selected.x];
      grid[selected.y][selected.x] = grid[y][x];
      grid[y][x] = temp;
      playSwap();
      drawGrid();
      setTimeout(processCascade, 200);
      selected = null;
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

// MAP SCREEN
function renderMapScreen() {
  document.getElementById('mapScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('endModal').style.display = 'none';
  document.getElementById('lives').innerHTML = `Vieți: ${'❤️'.repeat(Math.max(0, lives))}${'🤍'.repeat(Math.max(0, INITIAL_LIVES-lives))} (reîncărcare: <span id="lifeTimer">00:00</span>)`;
  let html = '';
  for(let i=1;i<=MAX_LEVELS;i++){
    let completed = mapProgress[i]?.win;
    let locked = !completed && (!mapProgress[i-1]?.win && i>1);
    html+=`<button onclick="startLevel(${i})" style="margin:3px;${completed?'background:#b2ffb2':''}" ${locked || lives<=0?'disabled':''}>Nivel ${i} ${locked?'🔒':''} ${completed?'⭐':''}</button>`;
  }
  document.getElementById('levelButtons').innerHTML=html;
  let tb = '<tr><th>Level</th><th>Score</th><th>Stars</th></tr>';
  leaderboardData.slice(0,10).forEach(row=>tb+=`<tr><td>${row.level}</td><td>${row.score}</td><td>${'⭐'.repeat(row.stars)}</td></tr>`);
  document.getElementById('leaderboard').innerHTML=tb;
  updateLifeTimer();
}

// LIFE TIMER
function updateLifeTimer() {
  if(lives>=INITIAL_LIVES){
    document.getElementById('lifeTimer').innerText='--:--';
    return;
  }
  let nextLife = lastLifeLoss+LIFE_REGEN_MINUTES*60000;
  let ms = Math.max(0, nextLife-Date.now());
  let mm = Math.floor(ms/60000), ss = Math.floor((ms%60000)/1000);
  document.getElementById('lifeTimer').innerText = `${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  if(lives < INITIAL_LIVES && ms === 0){
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
  if(lives <= 0) {
    alert("Nu mai ai vieți! Așteaptă să se regenereze.");
    renderMapScreen();
    return;
  }
  currentLevel = lvl;
  lives = Math.max(0, lives - 1);
  localStorage.setItem('match3_lives',lives);
  lastLifeLoss = Date.now();
  localStorage.setItem('match3_lastLifeLoss',lastLifeLoss);
  objectives = generateLevelData(currentLevel);
  missionColor = objectives[1].color;
  missionColorTarget = objectives[1].target;
  ingredientCount = objectives[2].count;
  ingredientType = 6;
  ingredientDelivered = 0;
  missionColorProgress = 0;
  score = 0;
  moves = 15 + 5 * (currentLevel - 1);
  timer = LEVEL_TIME_LIMITS[currentLevel-1] ?? 60;
  timeLeft = timer;
  bonusPowerups = 1 + Math.floor(Math.random()*2);
  gameOver = false;
  selected = null;
  document.getElementById('mapScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('endModal').style.display = 'none';
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
      clearInterval(timerInterval);
      drawGrid();
      showEndModal();
    }
  },1000);
  updateLifeTimer();
}

// INIT GRID + BONUS
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
  // portaluri
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
  let hsElement = document.getElementById('highscore');
  if (hsElement) hsElement.innerText = "Highscore: " + highscore;
  document.getElementById('score').innerText = "Scor: " + score;
  document.getElementById('moves').innerText = "Mutări rămase: " + moves;
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
    showEndModal();
  } else {
    document.getElementById('endModal').style.display = 'none';
  }
}

function getStars() {
  let ok = [];
  if (score >= objectives[0].target) ok.push(1);
  if (missionColorProgress >= missionColorTarget) ok.push(2);
  if (ingredientDelivered >= ingredientCount && ingredientCount>0) ok.push(3);
  return ok;
}

function showEndModal() {
  document.getElementById('endModal').style.display = 'block';
  let msg = '';
  if (ingredientDelivered >= ingredientCount && missionColorProgress >= missionColorTarget && score >= objectives[0].target) {
    lastLevelWin = true;
    msg = `<div style="font-size:22px;margin-bottom:8px;">✅ Nivel ${currentLevel} complet!</div>`;
    msg += `<div style="margin-bottom:6px;">Scor: <b>${score}</b> | Stele: <b>${getStars().length}</b></div>`;
    msg += `<button id="okBtn" style="font-size:20px;padding:8px 32px;">OK</button>`;
    playWin();
    leaderboardData.unshift({level:currentLevel,score:score,stars:getStars().length});
    leaderboardData=leaderboardData.slice(0,50);
    localStorage.setItem('match3_leaderboard',JSON.stringify(leaderboardData));
    mapProgress[currentLevel]={win:true,stars:getStars().length};
    localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
  } else {
    lastLevelWin = false;
    msg = `<div style="font-size:22px;margin-bottom:8px;">❌ Ai pierdut!</div>`;
    msg += `<div style="margin-bottom:6px;">Scor: <b>${score}</b> | Stele: <b>${getStars().length}</b></div>`;
    msg += `<button id="okBtn" style="font-size:20px;padding:8px 32px;">OK</button>`;
    playFail();
    mapProgress[currentLevel]={win:false,stars:0};
    localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
  }
  document.getElementById('endModal').innerHTML = msg;
  setTimeout(() => {
    document.getElementById('okBtn').onclick = function() {
      document.getElementById('endModal').style.display = 'none';
      if (lastLevelWin && currentLevel < MAX_LEVELS) {
        startLevel(currentLevel + 1);
      } else {
        startLevel(currentLevel);
      }
    };
  }, 100);
  if (score > highscore) {
    highscore = score;
    localStorage.setItem("match3-highscore", highscore);
    let hsElement = document.getElementById('highscore');
    if (hsElement) hsElement.innerText = "Highscore: " + highscore;
  }
}

// restul funcțiilor (detectMatches, collapseGrid, etc) rămân la fel ca varianta actuală din repo
// ... [as in your repo, unchanged]

// Event listeners
canvas.addEventListener('click', function(e) {
  console.log("Canvas click", gameOver, timeLeft);
  if (gameOver || timeLeft <= 0) return;
document.getElementById('restart').addEventListener('click', function() {
  startLevel(currentLevel);
});
document.getElementById('goMap').addEventListener('click', function() {
  renderMapScreen();
});

// INIT
renderMapScreen();
