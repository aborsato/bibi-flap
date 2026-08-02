const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayButton = document.getElementById('overlayButton');
const overlaySecondaryButton = document.getElementById('overlaySecondaryButton');
const hudCharacter = document.getElementById('hudCharacter');
const hudLevel = document.getElementById('hudLevel');
const hudScore = document.getElementById('hudScore');
const startTutorialButton = document.getElementById('startTutorialButton');
const startGameButton = document.getElementById('startGameButton');
const characterButtons = Array.from(document.querySelectorAll('.character-card'));

const levels = [
  {
    name: 'Tutorial',
    description: 'Press Space to flap. Collect the donut and fly through the easy opening. Avoid the small obstacle and reach the next phase.',
    speed: 180,
    gapHeight: 250,
    spacing: 440,
    distance: 3200,
    donutCount: 3,
    background: '#7dd7f9',
  },
  {
    name: 'Level 1',
    description: 'Level 1: A gentle run with friendly obstacles. Catch donuts while staying airborne.',
    speed: 190,
    gapHeight: 230,
    spacing: 380,
    distance: 4800,
    donutCount: 4,
    background: '#98e4a0',
  },
  {
    name: 'Level 2',
    description: 'Level 2: The pace picks up and the gaps get narrower. Stay focused and collect the sweets.',
    speed: 215,
    gapHeight: 210,
    spacing: 340,
    distance: 5300,
    donutCount: 5,
    background: '#f7d86a',
  },
  {
    name: 'Level 3',
    description: 'Level 3: Faster obstacles. Time your flaps carefully to dodge the barriers.',
    speed: 245,
    gapHeight: 190,
    spacing: 300,
    distance: 6000,
    donutCount: 6,
    background: '#f6a27b',
  },
  {
    name: 'Level 4',
    description: 'Level 4: The final phase. Keep collecting donuts, avoid every obstacle, and finish strong.',
    speed: 280,
    gapHeight: 170,
    spacing: 270,
    distance: 6500,
    donutCount: 7,
    background: '#d387e1',
  },
];

const playerTemplate = {
  x: 140,
  y: 260,
  width: 48,
  height: 42,
  vy: 0,
  radius: 22,
};

const gameState = {
  running: false,
  levelIndex: 0,
  score: 0,
  distance: 0,
  lastTime: 0,
  obstacles: [],
  donuts: [],
  boosts: [],
  player: { ...playerTemplate },
  level: null,
  character: 'cat',
  gameOver: false,
  boostActive: false,
  boostTimer: 0,
};

let overlayAction = null;

function setCharacter(character) {
  gameState.character = character;
  characterButtons.forEach((button) => {
    button.classList.toggle('selected', button.dataset.character === character);
  });
  hudCharacter.textContent = character.charAt(0).toUpperCase() + character.slice(1);
}

function switchScreen(screenId) {
  [menuScreen, gameScreen].forEach((screen) => {
    screen.classList.toggle('hidden', screen.id !== screenId);
    screen.classList.toggle('active', screen.id === screenId);
  });
}

function showOverlay(title, text, primaryText, primaryAction, showBack = false) {
  console.log('showOverlay:', title, primaryText, 'showBack=', showBack);
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = primaryText;
  overlayAction = primaryAction;
  overlay.classList.remove('hidden');
  overlay.style.display = 'grid';
  overlaySecondaryButton.classList.toggle('hidden', !showBack);
}

function hideOverlay() {
  console.log('hideOverlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
}

function startLevel(levelIndex) {
  gameState.levelIndex = levelIndex;
  gameState.level = levels[levelIndex];
  gameState.score = gameState.score;
  gameState.distance = 0;
  gameState.player = { ...playerTemplate };
  gameState.player.y = canvas.height / 2 - 20;
  gameState.player.vy = 0;
  gameState.obstacles = [];
  gameState.donuts = [];
  gameState.boosts = [];
  gameState.gameOver = false;
  gameState.running = false;
  gameState.boostActive = false;
  gameState.boostTimer = 0;

  createLevelObjects(gameState.level);
  hudLevel.textContent = gameState.level.name;
  hudScore.textContent = gameState.score;

  switchScreen('gameScreen');
  if (levelIndex === 0) {
    showOverlay('Tutorial', gameState.level.description, 'Begin Tutorial', beginRun, true);
  } else {
    showOverlay(gameState.level.name, gameState.level.description, 'Start Level', beginRun, true);
  }
}

function backToMenu() {
  gameState.running = false;
  switchScreen('menuScreen');
  hideOverlay();
}

function beginRun() {
  hideOverlay();
  gameState.running = true;
  gameState.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function createLevelObjects(level) {
  const startX = canvas.width + 120;
  const endX = canvas.width + level.distance;
  let x = startX;

  while (x < endX) {
    const gapY = 130 + Math.random() * (canvas.height - 340 - level.gapHeight);
    gameState.obstacles.push({ x, gapY, width: 68, gapHeight: level.gapHeight, passed: false });
    x += level.spacing + Math.random() * 120;
  }

  const donutSpacing = level.distance / (level.donutCount + 1);
  for (let i = 1; i <= level.donutCount; i += 1) {
    const donutX = canvas.width + i * donutSpacing + 30;
    const donutY = 120 + Math.random() * (canvas.height - 260);
    gameState.donuts.push({ x: donutX, y: donutY, radius: 16, collected: false });
  }

  const boostX = canvas.width + Math.min(level.distance * 0.55, 4200) + 120;
  const boostY = 140 + Math.random() * (canvas.height - 320);
  gameState.boosts.push({ x: boostX, y: boostY, radius: 18, collected: false });

  if (level.name === 'Tutorial' && gameState.donuts.length > 0) {
    gameState.donuts[0].x = canvas.width + 360;
    gameState.donuts[0].y = canvas.height / 2 - 60;
  }
}

function gameLoop(timestamp) {
  if (!gameState.running) return;
  const delta = Math.min((timestamp - gameState.lastTime) / 1000, 0.05);
  gameState.lastTime = timestamp;

  updateGame(delta);
  drawGame();

  if (gameState.running) {
    requestAnimationFrame(gameLoop);
  }
}

function updateGame(delta) {
  const level = gameState.level;
  const gravity = 1120;
  const jumpStrength = -340;

  gameState.player.vy += gravity * delta;
  gameState.player.y += gameState.player.vy * delta;
  gameState.distance += level.speed * delta;

  if (gameState.boostActive) {
    gameState.boostTimer -= delta;
    if (gameState.boostTimer <= 0) {
      gameState.boostActive = false;
      gameState.boostTimer = 0;
    }
  }

  if (gameState.player.y < 18) {
    gameState.player.y = 18;
    gameState.player.vy = 0;
  }

  if (gameState.player.y + gameState.player.height > canvas.height - 14) {
    handleLoss('You hit the ground. Try again!');
    return;
  }

  gameState.obstacles.forEach((obstacle) => {
    obstacle.x -= level.speed * delta;
  });

  gameState.donuts.forEach((donut) => {
    donut.x -= level.speed * delta;
  });

  gameState.boosts.forEach((boost) => {
    boost.x -= level.speed * delta;
  });

  gameState.obstacles = gameState.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -40);
  gameState.donuts = gameState.donuts.filter((donut) => !donut.collected && donut.x > -40);
  gameState.boosts = gameState.boosts.filter((boost) => !boost.collected && boost.x > -40);

  checkCollisions();
  hudScore.textContent = gameState.score;

  if (gameState.distance >= level.distance && !gameState.gameOver) {
    handleWin();
  }
}

function checkCollisions() {
  const playerBox = {
    left: gameState.player.x,
    right: gameState.player.x + gameState.player.width,
    top: gameState.player.y,
    bottom: gameState.player.y + gameState.player.height,
  };

  for (const obstacle of gameState.obstacles) {
    const obstacleLeft = obstacle.x;
    const obstacleRight = obstacle.x + obstacle.width;
    const gapTop = obstacle.gapY;
    const gapBottom = obstacle.gapY + obstacle.gapHeight;

    if (gameState.boostActive) {
      continue;
    }

    if (playerBox.right > obstacleLeft && playerBox.left < obstacleRight) {
      if (playerBox.top < gapTop || playerBox.bottom > gapBottom) {
        handleLoss('You hit an obstacle. Give it another try!');
        return;
      }
    }
  }

  gameState.boosts.forEach((boost) => {
    if (boost.collected) {
      return;
    }

    const dx = gameState.player.x + gameState.player.width / 2 - boost.x;
    const dy = gameState.player.y + gameState.player.height / 2 - boost.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < boost.radius + gameState.player.radius - 4) {
      boost.collected = true;
      gameState.boostActive = true;
      gameState.boostTimer = 5;
    }
  });

  gameState.donuts.forEach((donut) => {
    const dx = gameState.player.x + gameState.player.width / 2 - donut.x;
    const dy = gameState.player.y + gameState.player.height / 2 - donut.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < donut.radius + gameState.player.radius - 4) {
      donut.collected = true;
      gameState.score += 50;
    }
  });
}

function handleLoss(message) {
  gameState.running = false;
  gameState.gameOver = true;
  showOverlay('Game Over', message, 'Try Again', () => startLevel(gameState.levelIndex), true);
}

function handleWin() {
  gameState.running = false;
  gameState.gameOver = false;

  if (gameState.levelIndex === levels.length - 1) {
    showOverlay(
      'You Win!',
      `All phases complete. Final score: ${gameState.score}. Great flying!`,
      'Play Again',
      () => {
        gameState.score = 0;
        startLevel(0);
      },
      true
    );
  } else {
    showOverlay(
      'Phase Complete',
      `Nice work! You finished ${gameState.level.name} and scored ${gameState.score} points.
Ready for the next level?`,
      'Next Level',
      () => startLevel(gameState.levelIndex + 1),
      true
    );
  }
}

function drawGame() {
  const level = gameState.level;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(level.background);
  drawGround();
  drawObstacles();
  drawBoosts();
  drawDonuts();
  drawPlayer();
  drawLevelInfo();
}

function drawBackground(color) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#92d9ff');
  gradient.addColorStop(0.5, color);
  gradient.addColorStop(1, '#082038');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloud(180, 90, 1.0);
  drawCloud(540, 120, 0.8);
  drawCloud(780, 70, 0.65);
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 32 * scale, y + 4 * scale, 28 * scale, 0, Math.PI * 2);
  ctx.arc(x + 58 * scale, y, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 38 * scale, y - 12 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = '#0f1e2f';
  ctx.fillRect(0, canvas.height - 14, canvas.width, 14);
  ctx.fillStyle = '#1f3d5a';
  ctx.fillRect(0, canvas.height - 22, canvas.width, 8);
}

function drawObstacles() {
  gameState.obstacles.forEach((obstacle) => {
    ctx.fillStyle = '#13273f';
    ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.gapY);
    ctx.fillRect(obstacle.x, obstacle.gapY + obstacle.gapHeight, obstacle.width, canvas.height - obstacle.gapY - obstacle.gapHeight - 14);
    ctx.fillStyle = '#72e0ff';
    ctx.fillRect(obstacle.x + 10, obstacle.gapY - 8, obstacle.width - 20, 10);
    ctx.fillRect(obstacle.x + 10, obstacle.gapY + obstacle.gapHeight, obstacle.width - 20, 10);
  });
}

function drawBoosts() {
  gameState.boosts.forEach((boost) => {
    if (boost.collected) {
      return;
    }

    ctx.save();
    ctx.translate(boost.x, boost.y);
    ctx.strokeStyle = '#7ceeff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, boost.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(124, 238, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(0, 0, boost.radius - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4feff';
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(8, -4);
    ctx.lineTo(2, -2);
    ctx.lineTo(6, 10);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

function drawDonuts() {
  gameState.donuts.forEach((donut) => {
    ctx.save();
    ctx.translate(donut.x, donut.y);
    ctx.fillStyle = '#f5d480';
    ctx.beginPath();
    ctx.arc(0, 0, donut.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d6b26c';
    ctx.lineWidth = 10;
    const innerStrokeRadius = Math.max(4, donut.radius - 10);
    ctx.beginPath();
    ctx.arc(0, 0, innerStrokeRadius, 0, Math.PI * 2);
    ctx.stroke();
    const innerFillRadius = Math.max(0, donut.radius - 20);
    if (innerFillRadius > 0) {
      ctx.fillStyle = '#fffee6';
      ctx.beginPath();
      ctx.arc(0, 0, innerFillRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawPlayer() {
  const player = gameState.player;
  const x = player.x;
  const y = player.y;
  const width = player.width;
  const height = player.height;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);

  if (gameState.character === 'cat') {
    ctx.fillStyle = '#e0a8ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6d4ff';
    ctx.beginPath();
    ctx.moveTo(-18, -18);
    ctx.lineTo(-8, -34);
    ctx.lineTo(-2, -18);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(8, -34);
    ctx.lineTo(2, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#11253e';
    ctx.beginPath();
    ctx.arc(-8, -2, 4, 0, Math.PI * 2);
    ctx.arc(8, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd8f1';
    ctx.fillRect(-8, 8, 16, 6);
  } else if (gameState.character === 'dog') {
    ctx.fillStyle = '#f2c28b';
    ctx.beginPath();
    ctx.arc(0, -2, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d99b6d';
    ctx.beginPath();
    ctx.ellipse(-15, 2, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, 2, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#11253e';
    ctx.beginPath();
    ctx.arc(-9, -4, 4, 0, Math.PI * 2);
    ctx.arc(9, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#daa06d';
    ctx.fillRect(-8, 10, 16, 6);
  } else if (gameState.character === 'bee') {
    ctx.fillStyle = '#f7d06f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#332c20';
    ctx.fillRect(-16, -10, 8, 22);
    ctx.fillRect(8, -10, 8, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath();
    ctx.ellipse(-16, -20, 12, 7, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, -20, 12, 7, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#11253e';
    ctx.beginPath();
    ctx.arc(-6, -3, 4, 0, Math.PI * 2);
    ctx.arc(8, -3, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#7aa4ff';
    ctx.fillRect(-22, -22, 44, 42);
    ctx.fillStyle = '#4a6cff';
    ctx.fillRect(-22, -6, 44, 6);
    ctx.fillStyle = '#f7f9ff';
    ctx.fillRect(-16, -14, 32, 8);
    ctx.fillRect(-16, 4, 32, 8);
  }

  ctx.restore();
}

function drawLevelInfo() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(18, 18, 250, 86);
  ctx.fillStyle = '#f4fbff';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  ctx.fillText(gameState.level.name, 26, 42);
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  ctx.fillText(`Donuts: ${gameState.score / 50}`, 26, 60);
  ctx.fillText(`Boost: ${gameState.boostActive ? `${gameState.boostTimer.toFixed(1)}s` : 'Ready'}`, 26, 80);
}

function flapPlayer() {
  if (!gameState.running || gameState.gameOver) {
    return;
  }

  gameState.player.vy = -340;
}

function handleKeyPress(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    flapPlayer();
  }
}

function handleScreenTap(event) {
  if (event.cancelable) {
    event.preventDefault();
  }

  if (gameState.running && !gameState.gameOver) {
    flapPlayer();
  }
}

overlayButton.addEventListener('click', (event) => {
  event.preventDefault();
  hideOverlay();
  console.log('Overlay button clicked', overlayAction);
  if (typeof overlayAction === 'function') {
    overlayAction();
  } else {
    console.warn('No valid overlay action to run:', overlayAction);
  }
});

overlaySecondaryButton.addEventListener('click', (event) => {
  event.preventDefault();
  hideOverlay();
  backToMenu();
});
startTutorialButton.addEventListener('click', (event) => {
  event.preventDefault();
  console.log('Start Tutorial clicked');
  startLevel(0);
});
startGameButton.addEventListener('click', (event) => {
  event.preventDefault();
  console.log('Skip to Level 1 clicked');
  gameState.score = 0;
  startLevel(1);
});
characterButtons.forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    setCharacter(button.dataset.character);
  });
});
window.addEventListener('keydown', handleKeyPress);
canvas.addEventListener('pointerdown', handleScreenTap);
canvas.addEventListener('touchstart', handleScreenTap, { passive: false });
canvas.addEventListener('mousedown', handleScreenTap);
gameScreen.addEventListener('touchstart', handleScreenTap, { passive: false });
gameScreen.addEventListener('pointerdown', handleScreenTap);

window.addEventListener('DOMContentLoaded', () => {
  setCharacter('cat');
  showOverlay(
    'Welcome to Bibi Flap',
    'Choose your character and begin the tutorial to learn how to fly. Tap the screen or press Space to flap, collect donuts, and grab the blue boost orb to pass through obstacles for 5 seconds.',
    'Start Tutorial',
    () => startLevel(0)
  );
});
