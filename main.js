// Referințe sunete
const swapSound = document.getElementById('swapSound');
const matchSound = document.getElementById('matchSound');
const popSound = document.getElementById('popSound');
const explosionSound = document.getElementById('explosionSound');
const winSound = document.getElementById('winSound');
const failSound = document.getElementById('failSound');

// ... restul codului tău ...

// Exemplu integrare în evenimente din joc:

// La swap valid (mutare cu match):
function playSwap() {
  swapSound.currentTime = 0;
  swapSound.play();
}

// La eliminare simplă de buline (match normal):
function playMatch() {
  matchSound.currentTime = 0;
  matchSound.play();
}

// La pop (de ex. la eliminare rapidă sau “pop” special):
function playPop() {
  popSound.currentTime = 0;
  popSound.play();
}

// La power-up (explosion, bombă, bombă de culoare):
function playExplosion() {
  explosionSound.currentTime = 0;
  explosionSound.play();
}

// La câștig nivel:
function playWin() {
  winSound.currentTime = 0;
  winSound.play();
}

// La pierdere nivel:
function playFail() {
  failSound.currentTime = 0;
  failSound.play();
}

// --- Exemplu de utilizare în codul existent ---
// La swap valid:
function onSwap() {
  playSwap();
  // ... restul codului pentru swap ...
}

// La match:
function onMatch() {
  playMatch();
  // ... restul codului pentru match ...
}

// La pop (dacă folosești):
function onPop() {
  playPop();
  // ... restul codului pop ...
}

// La explosion:
function onExplosion() {
  playExplosion();
  // ... restul codului power-up ...
}

// La win/fail:
function onWin() {
  playWin();
  // ... restul codului win ...
}
function onFail() {
  playFail();
  // ... restul codului fail ...
}

// --- Exemplu de integrare în flow-ul principal ---
// În loc de: swapSound.play(); folosește playSwap(); etc.
// De exemplu:
canvas.addEventListener('click', function(e) {
  // ... codul existent ...
  // la swap valid:
  playSwap();
  // la match:
  playMatch();
  // la power-up:
  playExplosion();
  // la pop:
  playPop();
  // la win:
  playWin();
  // la fail:
  playFail();
  // ... restul codului ...
});
