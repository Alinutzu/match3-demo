// --- CONFIG ---
const NUM_LEVELS = 10;
const INITIAL_LIVES = 3;
const LIFE_REGEN_MINUTES = 10;
const LEVEL_TIME_LIMITS = [60, 80, 100, 120, 140, 160, 180, 200, 220, 240]; // secunde per nivel
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8, tileSize = 40;

// Emojis: ca înainte (0-5 buline, 6 ingredient 🍎, 7 bombă linie 💥, 8 bombă coloană 💣, 9 bombă culoare 🌈,
// 10 ciocolată 🍫, 11 portal 🌀, 12 blocaj încuiat 🔒)
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

// --- GLOBAL GAME STATE ---
let levelData = []; // array cu obiective pe nivel
let mapProgress = JSON.parse(localStorage.getItem('match3_mapProgress')||'{}');
let leaderboardData = JSON.parse(localStorage.getItem('match3_leaderboard')||'[]');
let currentLevel = 0;

// --- SCREEN STATE ---
let gameState = {};
let timerInterval = null;
let lives = Number(localStorage.getItem('match3_lives')) || INITIAL_LIVES;
let lastLifeLoss = Number(localStorage.getItem('match3_lastLifeLoss')) || Date.now();
let lifeRegenTimer = null;

// --- UI MAP SCREEN ---
function renderMapScreen() {
  document.getElementById('mapScreen').style.display = 'block';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('lives').innerHTML = `Vieți: ${'❤️'.repeat(lives)}${'🤍'.repeat(Math.max(0,INITIAL_LIVES-lives))} (reîncărcare: <span id="lifeTimer">00:00</span>)`;
  // buttons for levels
  let html = '';
  for(let i=0;i<NUM_LEVELS;i++){
    let ok = mapProgress[i]?.win;
    html+=`<button onclick="startLevel(${i})" style="margin:3px;${ok?'background:#b2ffb2':''}" ${lives>0?'':'disabled'}>Nivel ${i+1}${ok?' ⭐':''}</button>`;
  }
  document.getElementById('levelButtons').innerHTML=html;
  // leaderboard
  let tb = '<tr><th>Level</th><th>Score</th><th>Stars</th></tr>';
  leaderboardData.slice(0,10).forEach(row=>tb+=`<tr><td>${row.level+1}</td><td>${row.score}</td><td>${'⭐'.repeat(row.stars)}</td></tr>`);
  document.getElementById('leaderboard').innerHTML=tb;
  updateLifeTimer();
}

// --- LIFE REGEN ---
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

// --- LEVEL OBJECTIVES & SETUP ---
function setupLevels(){
  levelData = [];
  for(let i=0;i<NUM_LEVELS;i++){
    let obj = [];
    obj.push({type:'score', target: 300+100*i});
    obj.push({type:'color', color: i%6, target: 8+2*i});
    if(i%2===0) obj.push({type:'ingredient', count: 2+Math.floor(i/2)});
    levelData.push(obj);
  }
}
setupLevels();

// --- GAME STATE INIT ---
function startLevel(levelIdx){
  currentLevel = levelIdx;
  document.getElementById('mapScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.getElementById('levelTitle').innerText = 'Nivel ' + (levelIdx+1);
  // set objectives
  let objtxt = '';
  levelData[levelIdx].forEach(o=>{
    if(o.type==='score') objtxt+=`Scor: ${o.target} `;
    if(o.type==='color') objtxt+=`Elimină ${o.target} ${emojis[o.color]} `;
    if(o.type==='ingredient') objtxt+=`Adu ${o.count} ${emojis[6]} jos `;
  });
  document.getElementById('objectives').innerText = objtxt.trim();
  // timer
  document.getElementById('timer').style.display = 'block';
  document.getElementById('timeLeft').innerText = `${LEVEL_TIME_LIMITS[levelIdx]}s`;
  // lives
  lives--;
  localStorage.setItem('match3_lives',lives);
  lastLifeLoss = Date.now();
  localStorage.setItem('match3_lastLifeLoss',lastLifeLoss);
  // initialize game
  gameState = {
    level: levelIdx, score: 0, moves: 20, stars:0,
    colorProgress: 0, ingredientProgress: 0, timer: LEVEL_TIME_LIMITS[levelIdx], timeLeft: LEVEL_TIME_LIMITS[levelIdx],
    objective: {...levelData[levelIdx]}, grid:[], selected:null, fadeMap:[]
  };
  initGameGrid(levelIdx);
  drawGrid();
  timerInterval && clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    gameState.timeLeft--;
    document.getElementById('timeLeft').innerText=gameState.timeLeft+'s';
    if(gameState.timeLeft<=0){
      endLevel(false);
    }
  },1000);
}

function initGameGrid(levelIdx){
  let grid = Array(size).fill().map(()=>Array(size).fill(0));
  let fadeMap = Array(size).fill().map(()=>Array(size).fill(1));
  // buline
  for(let y=0;y<size;y++)
    for(let x=0;x<size;x++) grid[y][x]=randomNormalPiece();
  // ingrediente
  let obj = levelData[levelIdx].find(o=>o.type==='ingredient');
  if(obj){
    let placed = 0;
    while(placed<obj.count){
      let x = Math.floor(Math.random()*size), y = Math.floor(Math.random()*Math.floor(size/2));
      if(grid[y][x]<6){ grid[y][x]=6; placed++; }
    }
  }
  // bonus random: adaugă 1-2 power-up-uri
  let bonusCount = 1+Math.floor(Math.random()*2);
  for(let i=0;i<bonusCount;i++){
    let x = Math.floor(Math.random()*size), y = Math.floor(Math.random()*size);
    if(grid[y][x]<6) grid[y][x]=7+Math.floor(Math.random()*3);
  }
  gameState.grid = grid;
  gameState.fadeMap = fadeMap;
}

function randomNormalPiece(){ return Math.floor(Math.random()*6); }

// --- GRID DRAW & LOGIC ---
function drawGrid() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  let grid = gameState.grid, fadeMap = gameState.fadeMap;
  for(let y=0;y<size;y++)
    for(let x=0;x<size;x++){
      ctx.fillStyle = "#fff";
      ctx.fillRect(x*tileSize,y*tileSize,tileSize-2,tileSize-2);
      if(grid[y][x]!==-1){
        ctx.globalAlpha = fadeMap[y][x];
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emojis[grid[y][x]],x*tileSize+tileSize/2,y*tileSize+tileSize/2);
        ctx.globalAlpha = 1;
      }
      if(gameState.selected&&gameState.selected.x===x&&gameState.selected.y===y){
        ctx.strokeStyle="#000";
        ctx.lineWidth=3;
        ctx.strokeRect(x*tileSize+2,y*tileSize+2,tileSize-6,tileSize-6);
      }
    }
  document.getElementById('score').innerText = "Scor: " + gameState.score;
  document.getElementById('moves').innerText = "Mutări rămase: " + gameState.moves;
  document.getElementById('stars').innerText = "Stele: " + ('⭐'.repeat(getStars()));
}

// --- OBJECTIVE & STARS ---
function getStars(){
  let lvl = gameState.level;
  let obj = levelData[lvl];
  let ok = 0;
  if(gameState.score>=obj[0].target) ok++;
  if(gameState.colorProgress>=obj[1].target) ok++;
  if(obj[2]&&(gameState.ingredientProgress>=obj[2].count)) ok++;
  return ok;
}

// --- GAMEPLAY ---
canvas.addEventListener('click',function(e){
  if(gameState.timeLeft<=0) return;
  let x = Math.floor(e.offsetX/tileSize), y = Math.floor(e.offsetY/tileSize);
  if(gameState.selected){
    if(isAdjacent(gameState.selected.x,gameState.selected.y,x,y)){
      let temp=gameState.grid[gameState.selected.y][gameState.selected.x];
      gameState.grid[gameState.selected.y][gameState.selected.x]=gameState.grid[y][x];
      gameState.grid[y][x]=temp;
      playSwap();
      drawGrid();
      processMatches();
      gameState.selected=null;
      gameState.moves--;
      if(gameState.moves<=0) endLevel(false);
    }else{
      gameState.selected={x,y};
      drawGrid();
    }
  }else{
    gameState.selected={x,y};
    drawGrid();
  }
});

// --- MATCH DETECT & REMOVE ---
function processMatches(){
  let matches = Array(size).fill().map(()=>Array(size).fill(false));
  let grid = gameState.grid;
  // detect horizontal
  for(let y=0;y<size;y++){
    let count=1;
    for(let x=1;x<size;x++){
      if(grid[y][x]!==-1&&grid[y][x]<6&&grid[y][x]===grid[y][x-1]) count++;
      else{
        if(count>=3) for(let k=0;k<count;k++) matches[y][x-k-1]=true;
        count=1;
      }
    }
    if(count>=3) for(let k=0;k<count;k++) matches[y][size-k-1]=true;
  }
  // detect vertical
  for(let x=0;x<size;x++){
    let count=1;
    for(let y=1;y<size;y++){
      if(grid[y][x]!==-1&&grid[y][x]<6&&grid[y][x]===grid[y-1][x]) count++;
      else{
        if(count>=3) for(let k=0;k<count;k++) matches[y-k-1][x]=true;
        count=1;
      }
    }
    if(count>=3) for(let k=0;k<count;k++) matches[size-k-1][x]=true;
  }
  // remove
  let removed=0,colRemoved=0;
  for(let y=0;y<size;y++)
    for(let x=0;x<size;x++)
      if(matches[y][x]){
        if(grid[y][x]===levelData[currentLevel][1].color) colRemoved++;
        grid[y][x]=-1;
        removed++;
      }
  gameState.score+=removed*10;
  gameState.colorProgress+=colRemoved;
  playMatch();
  collapseGrid();
  checkIngredientsDelivered();
  drawGrid();
  if(getStars()===levelData[currentLevel].length) endLevel(true);
}

// --- COLLAPSE & INGREDIENT ---
function collapseGrid(){
  for(let x=0;x<size;x++){
    let pointer=size-1;
    for(let y=size-1;y>=0;y--) if(gameState.grid[y][x]!==-1) gameState.grid[pointer][x]=gameState.grid[y][x],pointer--;
    for(let y=pointer;y>=0;y--) gameState.grid[y][x]=-1;
  }
  for(let x=0;x<size;x++)
    for(let y=0;y<size;y++)
      if(gameState.grid[y][x]===-1) gameState.grid[y][x]=randomNormalPiece();
}
function checkIngredientsDelivered(){
  for(let x=0;x<size;x++){
    let y=size-1;
    if(gameState.grid[y][x]===6){
      gameState.ingredientProgress++;
      gameState.grid[y][x]=randomNormalPiece();
      playExplosion();
      playPop();
    }
  }
}

// --- END LEVEL & LEADERBOARD ---
function endLevel(win){
  timerInterval && clearInterval(timerInterval);
  document.getElementById('okLevel').style.display = "inline-block";
  if(win){
    playWin();
    leaderboardData.unshift({level:currentLevel,score:gameState.score,stars:getStars()});
    leaderboardData=leaderboardData.slice(0,20);
    localStorage.setItem('match3_leaderboard',JSON.stringify(leaderboardData));
    mapProgress[currentLevel]={win:true,stars:getStars()};
    localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
  }else{
    playFail();
    mapProgress[currentLevel]={win:false,stars:0};
    localStorage.setItem('match3_mapProgress',JSON.stringify(mapProgress));
  }
  document.getElementById('okLevel').onclick=()=>{renderMapScreen();};
}

// --- ADJACENT ---
function isAdjacent(x1,y1,x2,y2){
  return (Math.abs(x1-x2)===1&&y1===y2)||(Math.abs(y1-y2)===1&&x1===x2);
}

// --- RESTART BUTTON ---
document.getElementById('restart').onclick=function(){
  startLevel(currentLevel);
};

// --- INIT ---
renderMapScreen();
