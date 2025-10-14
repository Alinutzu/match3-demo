// Simplu joc Match-3 pe o grilă 8x8 cu 5 tipuri de piese
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 8;
const tileSize = 40;
const colors = ['#48f', '#f84', '#4f8', '#f48', '#ff4'];

let grid = Array(size).fill().map(() => Array(size).fill(0));

// Inițializează grila cu piese random
function initGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y][x] = Math.floor(Math.random() * colors.length);
    }
  }
}

function drawGrid() {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = colors[grid[y][x]];
      ctx.fillRect(x * tileSize, y * tileSize, tileSize - 2, tileSize - 2);
    }
  }
}

initGrid();
drawGrid();

// Nu are logică de match încă; doar desenare și randomizare
// Poți extinde cu swap, detectare linii, scor etc.
