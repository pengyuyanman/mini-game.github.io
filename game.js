const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const MAX_HEALTH = 200;
const ROCK_DAMAGE = 10;
const DASHER_DAMAGE = 25;
const STAR_HEAL = 20;
const LASER_DAMAGE = 8;
const LASER_DAMAGE_STEP = 2;
const LASER_TICK = 0.22;
const COMBO_STEP_SECONDS = 5;
const COMBO_STEP_VALUE = 0.25;
const MAX_COMBO = 3;
const AMMO_MAX = 2;
const AMMO_FIRE_DURATION = 2;
const AMMO_SHOT_INTERVAL = 0.09;
const AMMO_PROJECTILE_SPEED = 840;
const AMMO_PROMPT_DURATION = 1.7;
const AMMO_SPINNER_DISABLE = 1.6;
const AMMO_BOSS_DISABLE = 1.1;
const BOSS_WARNING_DURATION = 2;
const BOSS_DURATION = 12;
const BOSS_INTERVAL_LEVELS = 5;
const BOSS_LASER_COUNT = 6;
const BOSS_LASER_SPEED = 1;
const BOSS_LASER_DAMAGE = 12;

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const healthFillEl = document.getElementById("healthFill");
const bestEl = document.getElementById("best");
const comboEl = document.getElementById("combo");
const overlay = document.getElementById("overlay");
const panelTag = document.getElementById("panelTag");
const loseBanner = document.getElementById("loseBanner");
const panelTitle = document.getElementById("panelTitle");
const loseVideo = document.getElementById("loseVideo");
const panelText = document.getElementById("panelText");
const actionButton = document.getElementById("actionButton");
const retryButton = document.getElementById("retryButton");
const burstButton = document.getElementById("burstButton");
const touchControls = document.querySelector(".touch-controls");
const playerImage = new Image();
const rockImage = new Image();
const dasherImage = new Image();
const spinnerImage = new Image();
const bossImage = new Image();
const rockHitAudio = new Audio("assets/rock-hit.mp3");
const dashHitAudio = new Audio("assets/dash-hit.mp3");
const bgmAudio = new Audio("assets/bgm.mp3");
const burstFireAudio = new Audio("assets/burst-fire.mp3");

let playerImageReady = false;
let rockImageReady = false;
let dasherImageReady = false;
let spinnerImageReady = false;
let bossImageReady = false;
playerImage.addEventListener("load", () => {
  playerImageReady = true;
});
rockImage.addEventListener("load", () => {
  rockImageReady = true;
});
dasherImage.addEventListener("load", () => {
  dasherImageReady = true;
});
spinnerImage.addEventListener("load", () => {
  spinnerImageReady = true;
});
bossImage.addEventListener("load", () => {
  bossImageReady = true;
});
playerImage.src = "assets/player.jpg";
rockImage.src = "assets/rock.jpg";
dasherImage.src = "assets/dasher.jpg";
spinnerImage.src = "assets/spinner.jpg";
bossImage.src = "assets/boss.jpg";

rockHitAudio.preload = "auto";
rockHitAudio.volume = 0.9;
dashHitAudio.preload = "auto";
dashHitAudio.volume = 0.9;
bgmAudio.preload = "auto";
bgmAudio.loop = true;
bgmAudio.volume = 0.55;
burstFireAudio.preload = "metadata";
burstFireAudio.loop = true;
burstFireAudio.volume = 0.88;

let bgmUnlocked = false;
let assetsReady = false;
const startPanelText = "用方向键或 WASD 控制飞船，拾取紫色子弹后按 E 连续发射。障碍 1 扣 10 血，障碍 2 扣 25 血，爱心回复 20 血。";

const state = {
  running: false,
  gameOver: false,
  lastTime: 0,
  elapsed: 0,
  spawnTimer: 0,
  starTimer: 0,
  ammoDropTimer: 0,
  dashTimer: 0,
  flashTimer: 0,
  difficultyStep: 0,
  best: Number(localStorage.getItem("starport-best") || 0),
  score: 0,
  health: MAX_HEALTH,
  comboTimer: 0,
  comboMultiplier: 1,
  ammoCount: 0,
  ammoPromptTimer: 0,
  firingTimer: 0,
  fireShotTimer: 0,
  laserDamageCooldown: 0,
  boss: {
    mode: "idle",
    timer: 0,
    nextLevel: BOSS_INTERVAL_LEVELS,
    banner: 0,
    x: canvas.width / 2,
    y: canvas.height / 2,
    angle: -Math.PI / 2,
    speed: BOSS_LASER_SPEED,
    vx: 0,
    vy: 0,
    mobile: false,
    disabled: 0,
    radius: 72,
    dasherTimer: 0,
    dasherTarget: 0,
    dasherLevel: 0
  },
  input: {
    left: false,
    right: false,
    up: false,
    down: false
  },
  player: {
    x: canvas.width / 2,
    y: canvas.height - 80,
    radius: 24,
    speed: 310,
    invincible: 0
  },
  rocks: [],
  stars: [],
  ammoDrops: [],
  dashers: [],
  playerBullets: [],
  spinner: {
    active: false,
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 44,
    angle: -Math.PI / 2,
    speed: 1.1,
    disabled: 0
  },
  sky: createStars(72)
};

bestEl.textContent = state.best;
showOverlay("Survival Run", "准备起飞", startPanelText, "加载中...");
actionButton.disabled = true;
preloadAssets().then(() => {
  assetsReady = true;
  if (!state.running) {
    actionButton.disabled = false;
    actionButton.textContent = "开始游戏";
    panelText.textContent = startPanelText;
  }
});

function preloadAssets() {
  const imageLoads = [playerImage, rockImage, dasherImage, spinnerImage, bossImage].map(waitForImageLoad);
  const audioLoads = [rockHitAudio, dashHitAudio].map(waitForAudioLoad);
  return Promise.all([...imageLoads, ...audioLoads]);
}

function waitForImageLoad(image) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => resolve();
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function waitForAudioLoad(audio) {
  if (audio.readyState >= 3) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => resolve();
    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("loadeddata", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    setTimeout(done, 8000);
  });
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.3 + 0.5,
    drift: Math.random() * 10 + 12
  }));
}

function showOverlay(tag, title, text, buttonText) {
  panelTag.textContent = tag;
  panelTitle.textContent = title;
  panelText.textContent = text;
  actionButton.textContent = buttonText;
  actionButton.classList.remove("hidden");
  retryButton.classList.add("hidden");
  loseBanner.classList.add("hidden");
  loseVideo.classList.add("hidden");
  loseVideo.pause();
  loseVideo.currentTime = 0;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  loseVideo.pause();
  loseVideo.currentTime = 0;
  overlay.classList.add("hidden");
}

function resetGame() {
  if (!assetsReady) {
    return;
  }

  bgmUnlocked = false;
  playBackgroundMusic();

  state.running = true;
  state.gameOver = false;
  state.lastTime = 0;
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.starTimer = 0;
  state.ammoDropTimer = 0;
  state.dashTimer = 0;
  state.flashTimer = 0;
  state.difficultyStep = 0;
  state.score = 0;
  state.health = MAX_HEALTH;
  state.comboTimer = 0;
  state.comboMultiplier = 1;
  state.ammoCount = 0;
  state.ammoPromptTimer = 0;
  state.firingTimer = 0;
  state.fireShotTimer = 0;
  state.laserDamageCooldown = 0;
  state.boss.mode = "idle";
  state.boss.timer = 0;
  state.boss.nextLevel = BOSS_INTERVAL_LEVELS;
  state.boss.banner = 0;
  state.boss.x = canvas.width / 2;
  state.boss.y = canvas.height / 2;
  state.boss.angle = -Math.PI / 2;
  state.boss.vx = 0;
  state.boss.vy = 0;
  state.boss.mobile = false;
  state.boss.disabled = 0;
  state.boss.dasherTimer = 0;
  state.boss.dasherTarget = 0;
  state.boss.dasherLevel = 0;
  state.rocks = [];
  state.stars = [];
  state.ammoDrops = [];
  state.dashers = [];
  state.playerBullets = [];
  state.spinner.active = false;
  state.spinner.angle = -Math.PI / 2;
  state.spinner.speed = 1.1;
  state.spinner.disabled = 0;
  state.player.x = canvas.width / 2;
  state.player.y = canvas.height - 80;
  state.player.invincible = 0;
  rockHitAudio.pause();
  rockHitAudio.currentTime = 0;
  dashHitAudio.pause();
  dashHitAudio.currentTime = 0;
  stopBurstFireAudio();
  playBackgroundMusic();
  updateHud();
  hideOverlay();
}

function playBackgroundMusic() {
  if (bgmUnlocked && !bgmAudio.paused) {
    return;
  }

  bgmAudio.load();
  const playPromise = bgmAudio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.then(() => {
      bgmUnlocked = true;
    }).catch(() => {});
  } else {
    bgmUnlocked = true;
  }
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  healthEl.textContent = Math.max(0, Math.floor(state.health));
  bestEl.textContent = state.best;
  comboEl.textContent = formatMultiplier(state.comboMultiplier);
  if (burstButton) {
    const canBurst = state.running && state.ammoCount > 0 && state.firingTimer <= 0;
    burstButton.disabled = !canBurst;
    burstButton.classList.toggle("ready", canBurst);
    burstButton.textContent = state.firingTimer > 0 ? "E 技能发动中" : `E 技能 ${state.ammoCount}/${AMMO_MAX}`;
  }
  const healthPercent = clamp(state.health / MAX_HEALTH, 0, 1);
  healthFillEl.style.width = `${healthPercent * 100}%`;
  if (healthPercent > 0.55) {
    healthFillEl.style.background = "linear-gradient(90deg, #44d17a, #b7ff7a)";
  } else if (healthPercent > 0.25) {
    healthFillEl.style.background = "linear-gradient(90deg, #ffc857, #ff8c42)";
  } else {
    healthFillEl.style.background = "linear-gradient(90deg, #ff5f6d, #ff2e63)";
  }
}

function spawnRock() {
  const size = Math.random() * 18 + 16;
  const speed = Math.random() * 120 + 160 + state.difficultyStep * 18;
  state.rocks.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size - 10,
    radius: size,
    speed,
    spin: (Math.random() - 0.5) * 0.06,
    angle: Math.random() * Math.PI * 2
  });
}

function spawnStar() {
  state.stars.push({
    x: Math.random() * (canvas.width - 80) + 40,
    y: -20,
    radius: 10,
    speed: 150 + Math.random() * 60 + state.difficultyStep * 6,
    pulse: Math.random() * Math.PI * 2
  });
}

function spawnAmmoDrop() {
  state.ammoDrops.push({
    x: Math.random() * (canvas.width - 90) + 45,
    y: -22,
    radius: 13,
    speed: 165 + Math.random() * 45 + state.difficultyStep * 5,
    pulse: Math.random() * Math.PI * 2,
    rotation: Math.random() * Math.PI * 2
  });
}

function updateBurstFire(delta) {
  if (state.firingTimer <= 0) {
    return;
  }

  state.firingTimer = Math.max(0, state.firingTimer - delta);
  state.fireShotTimer -= delta;
  while (state.fireShotTimer <= 0 && state.firingTimer > 0) {
    spawnPlayerBullet();
    state.fireShotTimer += AMMO_SHOT_INTERVAL;
  }

  if (state.firingTimer <= 0) {
    state.fireShotTimer = 0;
    stopBurstFireAudio();
  }
}

function spawnPlayerBullet() {
  state.playerBullets.push({
    x: state.player.x,
    y: state.player.y - state.player.radius - 8,
    vx: 0,
    vy: -AMMO_PROJECTILE_SPEED,
    radius: 7
  });
}

function spawnDasher() {
  const radius = 42;
  const laneWidth = 88;
  const displayDifficulty = state.difficultyStep + 1;
  const warningDuration = 1;
  const dashSpeed = Math.min(660, 420 + Math.max(0, displayDifficulty - 3) * 32);
  const travelAxis = Math.random() > 0.5 ? "vertical" : "horizontal";
  let x = canvas.width / 2;
  let y = canvas.height / 2;

  if (travelAxis === "vertical") {
    const occupiedXs = state.dashers
      .filter((dasher) => dasher.travelAxis === "vertical")
      .map((dasher) => dasher.x);
    x = Math.random() * (canvas.width - laneWidth - 40) + laneWidth / 2 + 20;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = Math.random() * (canvas.width - laneWidth - 40) + laneWidth / 2 + 20;
      const overlaps = occupiedXs.some((occupiedX) => Math.abs(occupiedX - candidate) < laneWidth * 0.82);
      if (!overlaps) {
        x = candidate;
        break;
      }
    }
  } else {
    const occupiedYs = state.dashers
      .filter((dasher) => dasher.travelAxis === "horizontal")
      .map((dasher) => dasher.y);
    y = Math.random() * (canvas.height - laneWidth - 90) + laneWidth / 2 + 45;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = Math.random() * (canvas.height - laneWidth - 90) + laneWidth / 2 + 45;
      const overlaps = occupiedYs.some((occupiedY) => Math.abs(occupiedY - candidate) < laneWidth * 0.82);
      if (!overlaps) {
        y = candidate;
        break;
      }
    }
  }

  state.dashers.push({
    x,
    y,
    radius,
    laneWidth,
    timer: warningDuration,
    phase: "warning",
    travelAxis,
    speed: dashSpeed,
    hitPlayed: false
  });
}

function getMaxDasherCount() {
  const displayDifficulty = state.difficultyStep + 1;
  if (displayDifficulty < 3) {
    return 0;
  }
  return Math.min(3, 1 + Math.floor((displayDifficulty - 3) / 3));
}

function update(delta) {
  if (!state.running) {
    return;
  }

  state.elapsed += delta;
  state.difficultyStep = Math.floor(state.elapsed / 12);
  state.flashTimer = Math.max(0, state.flashTimer - delta);
  state.ammoPromptTimer = Math.max(0, state.ammoPromptTimer - delta);
  state.laserDamageCooldown = Math.max(0, state.laserDamageCooldown - delta);
  state.boss.banner = Math.max(0, state.boss.banner - delta);
  updateBurstFire(delta);
  updateBoss(delta);
  state.comboTimer += delta;
  state.comboMultiplier = calculateComboMultiplier();
  state.score += delta * 8 * state.comboMultiplier * (state.boss.mode === "active" ? 1.15 : 1);

  const moveX = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
  const moveY = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);
  state.player.x += moveX * state.player.speed * delta;
  state.player.y += moveY * state.player.speed * delta;
  state.player.x = clamp(state.player.x, state.player.radius + 8, canvas.width - state.player.radius - 8);
  state.player.y = clamp(state.player.y, state.player.radius + 8, canvas.height - state.player.radius - 8);
  state.player.invincible = Math.max(0, state.player.invincible - delta);

  state.spawnTimer += delta;
  state.starTimer += delta;
  state.ammoDropTimer += delta;
  state.dashTimer += delta;

  const bossBusy = state.boss.mode !== "idle";
  const rockInterval = Math.max(0.28, 0.82 - state.difficultyStep * 0.05);
  if (!bossBusy && state.spawnTimer >= rockInterval) {
    state.spawnTimer = 0;
    const rockBurst = 1 + (Math.random() > 0.72 ? 1 : 0);
    for (let i = 0; i < rockBurst; i += 1) {
      spawnRock();
    }
  }

  const starInterval = Math.max(1.8, 3.4 - state.difficultyStep * 0.12);
  if (!bossBusy && state.starTimer >= starInterval) {
    state.starTimer = 0;
    spawnStar();
  }

  const ammoInterval = Math.max(6.2, 9.4 - state.difficultyStep * 0.12);
  if (!bossBusy && state.ammoCount + state.ammoDrops.length < AMMO_MAX && state.ammoDropTimer >= ammoInterval) {
    state.ammoDropTimer = 0;
    spawnAmmoDrop();
  }

  const maxDashers = getMaxDasherCount();
  if (!bossBusy && maxDashers > 0 && state.dashers.length < maxDashers) {
    const dashInterval = Math.max(3.3, 6.2 - state.difficultyStep * 0.2);
    if (state.dashTimer >= dashInterval) {
      state.dashTimer = 0;
      const missingDashers = maxDashers - state.dashers.length;
      for (let i = 0; i < missingDashers; i += 1) {
        spawnDasher();
      }
    }
  }

  updateSpinner(delta);

  for (const dot of state.sky) {
    dot.y += dot.drift * delta;
    if (dot.y > canvas.height) {
      dot.y = -4;
      dot.x = Math.random() * canvas.width;
    }
  }

  state.rocks = state.rocks.filter((rock) => {
    rock.y += rock.speed * delta;
    rock.angle += rock.spin;

    if (circleHit(rock, state.player) && state.player.invincible <= 0) {
      playRockHitAudio();
      damagePlayer(ROCK_DAMAGE);
      return false;
    }

    return rock.y - rock.radius < canvas.height + 30;
  });

  state.stars = state.stars.filter((star) => {
    star.y += star.speed * delta;
    star.pulse += delta * 5;

    if (circleHit(star, state.player)) {
      state.score += 120 * state.comboMultiplier;
      state.health = Math.min(MAX_HEALTH, state.health + STAR_HEAL);
      return false;
    }

    return star.y - star.radius < canvas.height + 20;
  });

  state.ammoDrops = state.ammoDrops.filter((drop) => {
    drop.y += drop.speed * delta;
    drop.pulse += delta * 5.4;
    drop.rotation += delta * 1.8;

    if (circleHit(drop, state.player)) {
      state.ammoCount = Math.min(AMMO_MAX, state.ammoCount + 1);
      state.ammoPromptTimer = AMMO_PROMPT_DURATION;
      state.score += 90 * state.comboMultiplier;
      return false;
    }

    return drop.y - drop.radius < canvas.height + 24;
  });

  state.dashers = state.dashers.filter((dasher) => {
    if (dasher.phase === "warning") {
      dasher.timer -= delta;
      if (dasher.timer <= 0) {
        dasher.phase = "dash";
        if (dasher.travelAxis === "horizontal") {
          dasher.x = -dasher.radius - 16;
        } else {
          dasher.y = -dasher.radius - 16;
        }
      }
      return true;
    }

    if (dasher.travelAxis === "horizontal") {
      dasher.x += dasher.speed * delta;
    } else {
      dasher.y += dasher.speed * delta;
    }

    if (circleHit(dasher, state.player) && state.player.invincible <= 0) {
      if (!dasher.hitPlayed) {
        playDashHitAudio();
        dasher.hitPlayed = true;
      }
      damagePlayer(DASHER_DAMAGE);
      return false;
    }

    if (dasher.travelAxis === "horizontal") {
      return dasher.x - dasher.radius < canvas.width + 40;
    }
    return dasher.y - dasher.radius < canvas.height + 40;
  });

  state.playerBullets = state.playerBullets.filter((bullet) => {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;

    if (
      bullet.x < -40
      || bullet.x > canvas.width + 40
      || bullet.y < -40
      || bullet.y > canvas.height + 40
    ) {
      return false;
    }

    const rockIndex = state.rocks.findIndex((rock) => distanceBetween(bullet, rock) <= bullet.radius + rock.radius);
    if (rockIndex >= 0) {
      state.rocks.splice(rockIndex, 1);
      state.score += 45 * state.comboMultiplier;
      return false;
    }

    const dasherIndex = state.dashers.findIndex(
      (dasher) => dasher.phase === "dash" && distanceBetween(bullet, dasher) <= bullet.radius + dasher.radius
    );
    if (dasherIndex >= 0) {
      state.dashers.splice(dasherIndex, 1);
      state.score += 70 * state.comboMultiplier;
      return false;
    }

    if (
      state.spinner.active
      && distanceBetween(bullet, state.spinner) <= bullet.radius + state.spinner.radius + 4
    ) {
      state.spinner.disabled = Math.max(state.spinner.disabled, AMMO_SPINNER_DISABLE);
      state.score += 55 * state.comboMultiplier;
      return false;
    }

    if (state.boss.mode === "active") {
      const bossCore = {
        x: state.boss.x,
        y: state.boss.y,
        radius: state.boss.radius
      };
      if (distanceBetween(bullet, bossCore) <= bullet.radius + bossCore.radius + 4) {
        state.boss.disabled = Math.max(state.boss.disabled, AMMO_BOSS_DISABLE);
        state.score += 60 * state.comboMultiplier;
        return false;
      }
    }

    return true;
  });

  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem("starport-best", String(state.best));
  }

  updateHud();
}

function damagePlayer(amount) {
  damagePlayerWithConfig(amount, 1.2, 0.28);
}

function damagePlayerWithConfig(amount, invincibleDuration, flashDuration) {
  state.health -= amount;
  state.comboTimer = 0;
  state.comboMultiplier = 1;
  state.player.invincible = Math.max(state.player.invincible, invincibleDuration);
  state.flashTimer = Math.max(state.flashTimer, flashDuration);

  if (state.health <= 0) {
    state.health = 0;
    endGame();
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  stopBurstFireAudio();
  panelTag.textContent = "Mission Failed";
  loseBanner.classList.remove("hidden");
  panelTitle.textContent = "生命耗尽";
  loseVideo.classList.remove("hidden");
  panelText.textContent = `本次得分 ${Math.floor(state.score)}，最高纪录 ${state.best}。再来一局，看看你能撑多久。`;
  actionButton.classList.add("hidden");
  retryButton.classList.remove("hidden");
  overlay.classList.remove("hidden");
  loseVideo.currentTime = 0;
  const playPromise = loseVideo.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawDasherWarnings();
  drawSpinnerWarning();
  if (state.flashTimer > 0) {
    ctx.fillStyle = "rgba(255, 88, 88, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawStars();
  drawAmmoDrops();
  drawRocks();
  drawDashers();
  drawSpinner();
  drawBoss();
  drawPlayerBullets();
  drawPlayerFireEffect();
  drawPlayer();
  drawStatusLine();
  drawBossBanner();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#07111d");
  gradient.addColorStop(0.6, "#081827");
  gradient.addColorStop(1, "#102942");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const dot of state.sky) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(124, 231, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let y = 48; y < canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(state.player.x, state.player.y);

  const blinking = state.player.invincible > 0 && Math.floor(state.player.invincible * 10) % 2 === 0;
  ctx.globalAlpha = blinking ? 0.45 : 1;

  ctx.fillStyle = "#ffc857";
  ctx.beginPath();
  ctx.moveTo(-9, 20);
  ctx.lineTo(0, 42 + Math.sin(state.elapsed * 18) * 4);
  ctx.lineTo(9, 20);
  ctx.closePath();
  ctx.fill();

  if (playerImageReady) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, state.player.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const size = state.player.radius * 2.35;
    drawImageCover(playerImage, -size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#7ce7ff";
    ctx.beginPath();
    ctx.arc(0, 0, state.player.radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.arc(0, 0, state.player.radius - 8, Math.PI * 0.15, Math.PI * 0.88);
    ctx.stroke();
  } else {
    const bodyGradient = ctx.createLinearGradient(-18, -12, 22, 18);
    bodyGradient.addColorStop(0, "#c6fbff");
    bodyGradient.addColorStop(1, "#7ce7ff");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(18, 18);
    ctx.lineTo(0, 10);
    ctx.lineTo(-18, 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, 14);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRocks() {
  for (const rock of state.rocks) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle);

    if (rockImageReady) {
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const size = rock.radius * 2.45;
      drawImageCover(rockImage, -size / 2, -size / 2, size, size);

      ctx.restore();
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.rotate(rock.angle);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 150, 190, 0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius + 1.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#6d798a";
      ctx.beginPath();
      for (let i = 0; i < 7; i += 1) {
        const angle = (Math.PI * 2 * i) / 7;
        const bump = rock.radius + Math.sin(angle * 3.2) * 4;
        const px = Math.cos(angle) * bump;
        const py = Math.sin(angle) * bump;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawDasherWarnings() {
  for (const dasher of state.dashers) {
    if (dasher.phase !== "warning") {
      continue;
    }

    const flash = 0.42 + (Math.sin((1 - dasher.timer) * 20) + 1) * 0.18;

    ctx.save();
    ctx.fillStyle = `rgba(255, 40, 40, ${0.08 + flash * 0.14})`;
    ctx.fillStyle = `rgba(255, 245, 245, ${0.72 + flash * 0.2})`;
    ctx.font = "bold 18px Trebuchet MS";
    ctx.textAlign = "center";

    if (dasher.travelAxis === "horizontal") {
      const top = dasher.y - dasher.laneWidth / 2;
      ctx.fillRect(0, top, canvas.width, dasher.laneWidth);

      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(255, 90, 90, ${0.35 + flash * 0.5})`;
      ctx.strokeRect(3, top + 3, canvas.width - 6, dasher.laneWidth - 6);

      ctx.setLineDash([14, 12]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255, 220, 220, ${0.45 + flash * 0.45})`;
      ctx.strokeRect(10, top + 10, canvas.width - 20, dasher.laneWidth - 20);
      ctx.setLineDash([]);
      ctx.fillText("WARNING", 92, dasher.y + 6);
    } else {
      const left = dasher.x - dasher.laneWidth / 2;
      ctx.fillRect(left, 0, dasher.laneWidth, canvas.height);

      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(255, 90, 90, ${0.35 + flash * 0.5})`;
      ctx.strokeRect(left + 3, 3, dasher.laneWidth - 6, canvas.height - 6);

      ctx.setLineDash([14, 12]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255, 220, 220, ${0.45 + flash * 0.45})`;
      ctx.strokeRect(left + 10, 10, dasher.laneWidth - 20, canvas.height - 20);
      ctx.setLineDash([]);
      ctx.fillText("WARNING", dasher.x, 34);
    }
    ctx.restore();
  }
}

function drawDashers() {
  for (const dasher of state.dashers) {
    if (dasher.phase !== "dash") {
      continue;
    }

    ctx.save();
    ctx.translate(dasher.x, dasher.y);
    if (dasher.travelAxis === "horizontal") {
      ctx.rotate(Math.PI / 2);
    }

    const trail = ctx.createLinearGradient(0, -dasher.radius * 2.6, 0, dasher.radius * 1.4);
    trail.addColorStop(0, "rgba(255, 70, 70, 0)");
    trail.addColorStop(1, "rgba(255, 70, 70, 0.42)");
    ctx.fillStyle = trail;
    ctx.fillRect(-dasher.radius * 0.66, -dasher.radius * 2.8, dasher.radius * 1.32, dasher.radius * 2.6);

    if (dasherImageReady) {
      ctx.beginPath();
      ctx.arc(0, 0, dasher.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const size = dasher.radius * 2.5;
      drawImageCover(dasherImage, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#ff7a7a";
      ctx.beginPath();
      ctx.arc(0, 0, dasher.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.save();
    ctx.translate(dasher.x, dasher.y);
    if (dasher.travelAxis === "horizontal") {
      ctx.rotate(Math.PI / 2);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255, 86, 86, 0.82)";
    ctx.beginPath();
    ctx.arc(0, 0, dasher.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function updateSpinner(delta) {
  const spinnerUnlocked = state.boss.mode === "idle" && state.difficultyStep >= 10;
  state.spinner.active = spinnerUnlocked;
  state.spinner.disabled = Math.max(0, state.spinner.disabled - delta);

  if (!spinnerUnlocked) {
    state.spinner.radius = 44;
    return;
  }

  state.spinner.speed = 1.1;
  state.spinner.radius = 44;
  state.spinner.angle += state.spinner.speed * delta;

  if (
    state.spinner.disabled <= 0
    && state.laserDamageCooldown <= 0
    && playerTouchesLaser(state.spinner, state.player)
  ) {
    state.laserDamageCooldown = LASER_TICK;
    const laserDamage =
      LASER_DAMAGE
      + Math.max(0, state.difficultyStep - 10) * LASER_DAMAGE_STEP;
    damagePlayerWithConfig(laserDamage, 0.16, 0.16);
  }
}

function drawSpinnerWarning() {
  if (!state.spinner.active) {
    return;
  }

  ctx.save();
  ctx.translate(state.spinner.x, state.spinner.y);
  const pulse = 0.3 + (Math.sin(state.elapsed * 5.5) + 1) * 0.08;
  ctx.strokeStyle = `rgba(255, 90, 90, ${pulse + 0.12})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, state.spinner.radius + 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSpinner() {
  if (!state.spinner.active) {
    return;
  }

  const spinner = state.spinner;
  const laserLength = Math.max(canvas.width, canvas.height) * 0.9;

  if (spinner.disabled <= 0) {
    ctx.save();
    ctx.translate(spinner.x, spinner.y);
    ctx.rotate(spinner.angle);

    const beam = ctx.createLinearGradient(0, 0, laserLength, 0);
    beam.addColorStop(0, "rgba(255, 220, 240, 0.95)");
    beam.addColorStop(0.08, "rgba(255, 94, 132, 0.92)");
    beam.addColorStop(1, "rgba(255, 40, 80, 0.22)");
    ctx.fillStyle = beam;
    ctx.fillRect(0, -7, laserLength, 14);

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(0, -2.5, laserLength, 5);

    ctx.restore();
  }

  ctx.save();
  ctx.translate(spinner.x, spinner.y);
  ctx.rotate(state.elapsed * 0.4);

  if (spinnerImageReady) {
    ctx.beginPath();
    ctx.arc(0, 0, spinner.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const size = spinner.radius * 2.5;
    drawImageCover(spinnerImage, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = "#ff9eb6";
    ctx.beginPath();
    ctx.arc(0, 0, spinner.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.save();
  ctx.translate(spinner.x, spinner.y);
  ctx.lineWidth = 4;
  ctx.strokeStyle = spinner.disabled > 0 ? "rgba(124, 231, 255, 0.92)" : "rgba(255, 210, 220, 0.9)";
  ctx.beginPath();
  ctx.arc(0, 0, spinner.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawStars() {
  for (const star of state.stars) {
    const pulse = 1 + Math.sin(star.pulse) * 0.18;
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ff6b87";
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.bezierCurveTo(12, 2, 17, -8, 10, -14);
    ctx.bezierCurveTo(4, -20, -5, -16, 0, -8);
    ctx.bezierCurveTo(-5, -16, -14, -20, -20, -14);
    ctx.bezierCurveTo(-27, -8, -22, 2, 0, 11);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 240, 245, 0.82)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawAmmoDrops() {
  for (const drop of state.ammoDrops) {
    const pulse = 1 + Math.sin(drop.pulse) * 0.12;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.rotation);
    ctx.scale(pulse, pulse);

    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    glow.addColorStop(0, "rgba(223, 120, 255, 0.85)");
    glow.addColorStop(1, "rgba(223, 120, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b64cff";
    ctx.beginPath();
    ctx.roundRect(-11, -15, 22, 30, 8);
    ctx.fill();

    ctx.fillStyle = "#f6d4ff";
    ctx.fillRect(-3.5, -8, 7, 16);
    ctx.fillRect(-8, -3.5, 16, 7);
    ctx.restore();
  }
}

function drawStatusLine() {
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(20, 20, 220, 12);

  ctx.fillStyle = "#7ce7ff";
  const progressWidth = Math.min(220, 220 * ((state.elapsed % 12) / 12));
  ctx.fillRect(20, 20, progressWidth, 12);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "14px Trebuchet MS";
  ctx.fillText(`难度 ${state.difficultyStep + 1}`, 20, 52);
  ctx.fillText(`HP ${Math.max(0, Math.floor(state.health))}/${MAX_HEALTH}`, 20, 74);
  ctx.fillText(`连击 ${formatMultiplier(state.comboMultiplier)}`, 20, 96);
  ctx.fillText(`E弹药 ${state.ammoCount}/${AMMO_MAX}`, 20, 118);
  if (state.boss.mode === "active") {
    ctx.fillStyle = "rgba(255, 120, 120, 0.95)";
    ctx.fillText(`BOSS ${state.boss.timer.toFixed(1)}s`, 20, 140);
  }

  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(15, 11, 33, 0.72)";
  ctx.beginPath();
  ctx.roundRect(canvas.width - 190, canvas.height - 74, 166, 48, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(190, 118, 255, 0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f0d8ff";
  ctx.font = "bold 16px Trebuchet MS";
  ctx.fillText(`储能子弹 ${state.ammoCount}`, canvas.width - 40, canvas.height - 46);
  ctx.font = "13px Trebuchet MS";
  ctx.fillStyle = state.firingTimer > 0 ? "#d98cff" : "rgba(255,255,255,0.72)";
  ctx.fillText(
    state.firingTimer > 0 ? `发射中 ${state.firingTimer.toFixed(1)}s` : "拾取紫色子弹后按 E",
    canvas.width - 40,
    canvas.height - 28
  );
  ctx.restore();

  if (state.ammoPromptTimer > 0) {
    const alpha = Math.min(1, state.ammoPromptTimer / 0.35);
    ctx.save();
    ctx.fillStyle = `rgba(234, 196, 255, ${0.9 * alpha})`;
    ctx.font = "bold 24px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("按E发射", canvas.width / 2, canvas.height - 34);
    ctx.restore();
  }
}

function drawPlayerFireEffect() {
  if (state.firingTimer <= 0) {
    return;
  }

  ctx.save();
  const flash = 0.55 + (Math.sin(state.elapsed * 22) + 1) * 0.12;
  ctx.strokeStyle = `rgba(208, 112, 255, ${flash})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.radius + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPlayerBullets() {
  for (const bullet of state.playerBullets) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);
    const beam = ctx.createLinearGradient(0, 12, 0, -18);
    beam.addColorStop(0, "rgba(229, 156, 255, 0)");
    beam.addColorStop(0.4, "rgba(229, 156, 255, 0.95)");
    beam.addColorStop(1, "rgba(170, 76, 255, 1)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(7, 10);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawBossBanner() {
  if (state.boss.mode === "warning") {
    const flash = 0.45 + (Math.sin(state.elapsed * 16) + 1) * 0.22;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 70, 70, ${flash})`;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    ctx.fillStyle = `rgba(255, 40, 40, ${0.14 + flash * 0.1})`;
    ctx.fillRect(0, canvas.height * 0.34, canvas.width, 108);
    ctx.fillStyle = "rgba(255, 242, 242, 0.96)";
    ctx.font = "bold 40px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("BOSS WARNING", canvas.width / 2, canvas.height * 0.34 + 48);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("2s 后开始", canvas.width / 2, canvas.height * 0.34 + 82);
    ctx.textAlign = "start";
    ctx.restore();
    return;
  }

  if (state.boss.banner <= 0 && state.boss.mode !== "active") {
    return;
  }

  const alpha = state.boss.banner > 0 ? Math.min(1, state.boss.banner / 1.2) : 0.34;
  ctx.save();
  ctx.fillStyle = `rgba(255, 70, 70, ${alpha * 0.18})`;
  ctx.fillRect(0, canvas.height * 0.38, canvas.width, 84);
  ctx.fillStyle = `rgba(255, 235, 235, ${Math.max(alpha, 0.48)})`;
  ctx.font = "bold 34px Georgia";
  ctx.textAlign = "center";
  ctx.fillText("BOSS WAVE", canvas.width / 2, canvas.height * 0.38 + 52);
  ctx.textAlign = "start";
  ctx.restore();
}

function drawBoss() {
  if (state.boss.mode !== "active") {
    return;
  }

  const boss = state.boss;
  const beamLength = Math.max(canvas.width, canvas.height);

  if (boss.disabled <= 0) {
    for (let i = 0; i < BOSS_LASER_COUNT; i += 1) {
      const angle = boss.angle + (Math.PI * 2 * i) / BOSS_LASER_COUNT;
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(angle);
      const beam = ctx.createLinearGradient(0, 0, beamLength, 0);
      beam.addColorStop(0, "rgba(255, 225, 240, 0.94)");
      beam.addColorStop(0.12, "rgba(255, 70, 120, 0.9)");
      beam.addColorStop(1, "rgba(255, 30, 80, 0.18)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, -8, beamLength, 16);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fillRect(0, -2.2, beamLength, 4.4);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(state.elapsed * 0.25);
  if (bossImageReady) {
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const size = boss.radius * 2.5;
    drawImageCover(bossImage, -size / 2, -size / 2, size, size);
  } else {
    ctx.fillStyle = "#ff8da3";
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = boss.disabled > 0 ? "rgba(124, 231, 255, 0.92)" : "rgba(255, 230, 235, 0.96)";
  ctx.beginPath();
  ctx.arc(0, 0, boss.radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const delta = Math.min((timestamp - state.lastTime) / 1000, 0.033);
  state.lastTime = timestamp;

  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.hypot(dx, dy);
  return distance < a.radius + b.radius;
}

function playerTouchesLaser(spinner, player) {
  const dx = player.x - spinner.x;
  const dy = player.y - spinner.y;
  const cos = Math.cos(-spinner.angle);
  const sin = Math.sin(-spinner.angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  const beamHalfWidth = 8;
  const maxReach = Math.max(canvas.width, canvas.height);

  if (localX < 0 || localX > maxReach) {
    return false;
  }

  return Math.abs(localY) <= beamHalfWidth + player.radius;
}

function playerTouchesBossLaser() {
  const beamOrigin = {
    x: state.boss.x,
    y: state.boss.y,
    angle: state.boss.angle
  };

  for (let i = 0; i < BOSS_LASER_COUNT; i += 1) {
    beamOrigin.angle = state.boss.angle + (Math.PI * 2 * i) / BOSS_LASER_COUNT;
    if (playerTouchesLaser(beamOrigin, state.player)) {
      return true;
    }
  }

  return false;
}

function drawImageCover(image, dx, dy, dWidth, dHeight) {
  const sourceRatio = image.width / image.height;
  const destRatio = dWidth / dHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = image.width;
  let sHeight = image.height;

  if (sourceRatio > destRatio) {
    sWidth = image.height * destRatio;
    sx = (image.width - sWidth) / 2;
  } else {
    sHeight = image.width / destRatio;
    sy = (image.height - sHeight) / 2;
  }

  ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

function calculateComboMultiplier() {
  const steps = Math.floor(state.comboTimer / COMBO_STEP_SECONDS);
  return clamp(1 + steps * COMBO_STEP_VALUE, 1, MAX_COMBO);
}

function formatMultiplier(multiplier) {
  return `x${multiplier.toFixed(multiplier % 1 === 0 ? 1 : 2)}`;
}

function updateBoss(delta) {
  const displayDifficulty = state.difficultyStep + 1;

  if (state.boss.mode === "idle" && displayDifficulty >= state.boss.nextLevel) {
    startBossWarning();
  }

  if (state.boss.mode === "idle") {
    return;
  }

  state.boss.disabled = Math.max(0, state.boss.disabled - delta);
  state.boss.timer -= delta;

  if (state.boss.mode === "warning") {
    if (state.boss.timer <= 0) {
      startBossWave();
    }
    return;
  }

  state.boss.angle += state.boss.speed * delta;
  if (state.boss.mobile) {
    const movePadding = state.boss.radius + 28;
    const minX = movePadding;
    const maxX = canvas.width - movePadding;
    const minY = movePadding;
    const maxY = canvas.height - movePadding;

    state.boss.x += state.boss.vx * delta;
    state.boss.y += state.boss.vy * delta;

    if (state.boss.x <= minX || state.boss.x >= maxX) {
      state.boss.x = clamp(state.boss.x, minX, maxX);
      state.boss.vx *= -1;
    }
    if (state.boss.y <= minY || state.boss.y >= maxY) {
      state.boss.y = clamp(state.boss.y, minY, maxY);
      state.boss.vy *= -1;
    }
  }

  if (state.boss.disabled <= 0 && state.laserDamageCooldown <= 0 && playerTouchesBossLaser()) {
    state.laserDamageCooldown = LASER_TICK;
    const bossDamage = BOSS_LASER_DAMAGE + Math.max(0, Math.floor((displayDifficulty - 5) / 5)) * 3;
    damagePlayerWithConfig(bossDamage, 0.16, 0.18);
  }

  if (state.boss.dasherLevel === 10 && state.boss.dasherTarget > 0) {
    state.boss.dasherTimer -= delta;
    if (state.boss.dasherTimer <= 0) {
      const missingDashers = Math.max(0, state.boss.dasherTarget - state.dashers.length);
      for (let i = 0; i < missingDashers; i += 1) {
        spawnDasher();
      }

      if (state.boss.dasherTarget < 2) {
        state.boss.dasherTarget += 1;
        state.boss.dasherTimer = 3.2;
      } else {
        state.boss.dasherTarget = 0;
      }
    }
  }

  if (state.boss.timer <= 0) {
    state.boss.mode = "idle";
    state.boss.timer = 0;
    state.boss.x = canvas.width / 2;
    state.boss.y = canvas.height / 2;
    state.boss.vx = 0;
    state.boss.vy = 0;
    state.boss.mobile = false;
    state.boss.dasherTimer = 0;
    state.boss.dasherTarget = 0;
    state.boss.dasherLevel = 0;
  }
}

function startBossWarning() {
  state.rocks = [];
  state.stars = [];
  state.dashers = [];
  state.spinner.active = false;
  state.spinner.disabled = 0;
  state.boss.mode = "warning";
  state.boss.timer = BOSS_WARNING_DURATION;
  state.boss.banner = BOSS_WARNING_DURATION;
  state.boss.x = canvas.width / 2;
  state.boss.y = canvas.height / 2;
  state.boss.disabled = 0;
  state.boss.angle = -Math.PI / 2;
  state.boss.vx = 0;
  state.boss.vy = 0;
  state.boss.mobile = false;
  state.boss.dasherTimer = 0;
  state.boss.dasherTarget = 0;
  state.boss.dasherLevel = 0;
}

function startBossWave() {
  const displayDifficulty = state.difficultyStep + 1;
  state.boss.mode = "active";
  state.boss.timer = BOSS_DURATION;
  state.boss.banner = 2.8;
  state.boss.nextLevel += BOSS_INTERVAL_LEVELS;
  state.boss.x = canvas.width / 2;
  state.boss.y = canvas.height / 2;
  state.boss.angle = -Math.PI / 2;
  state.boss.vx = 0;
  state.boss.vy = 0;
  state.boss.mobile = displayDifficulty >= 15;
  state.boss.disabled = 0;
  state.boss.dasherTimer = 0;
  state.boss.dasherTarget = 0;
  state.boss.dasherLevel = 0;

  if (state.boss.mobile) {
    const bossMoveSpeed = 110 + Math.max(0, displayDifficulty - 15) * 10;
    state.boss.vx = bossMoveSpeed;
    state.boss.vy = bossMoveSpeed * 0.72;
  }

  if (displayDifficulty === 10) {
    state.boss.dasherLevel = 10;
    state.boss.dasherTarget = 1;
    state.boss.dasherTimer = 0;
  }
}

function useAmmoBurst() {
  if (!state.running || state.ammoCount <= 0 || state.firingTimer > 0) {
    return;
  }

  state.ammoCount -= 1;
  state.firingTimer = AMMO_FIRE_DURATION;
  state.fireShotTimer = 0;
  state.ammoPromptTimer = 0;
  playBurstFireAudio();
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function playDashHitAudio() {
  playEffectAudio(dashHitAudio);
}

function playRockHitAudio() {
  playEffectAudio(rockHitAudio);
}

function playBurstFireAudio() {
  burstFireAudio.pause();
  burstFireAudio.currentTime = 0;
  const playPromise = burstFireAudio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function stopBurstFireAudio() {
  burstFireAudio.pause();
  burstFireAudio.currentTime = 0;
}

function playEffectAudio(audio) {
  const clone = audio.cloneNode(true);
  clone.volume = audio.volume;
  clone.preload = "auto";
  const playPromise = clone.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function setKey(event, pressed) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "a"].includes(key)) {
    state.input.left = pressed;
  } else if (["arrowright", "d"].includes(key)) {
    state.input.right = pressed;
  } else if (["arrowup", "w"].includes(key)) {
    state.input.up = pressed;
  } else if (["arrowdown", "s"].includes(key)) {
    state.input.down = pressed;
  }
}

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyE" && state.running) {
    event.preventDefault();
    useAmmoBurst();
    return;
  }

  if (event.code === "Space" && !state.running) {
    resetGame();
    return;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyE"].includes(event.code)) {
    event.preventDefault();
  }
  setKey(event, true);
});

document.addEventListener("keyup", (event) => {
  setKey(event, false);
});

actionButton.addEventListener("click", resetGame);
retryButton.addEventListener("click", resetGame);

if (touchControls) {
  const blockTouchDefault = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  touchControls.addEventListener("contextmenu", blockTouchDefault);
  touchControls.addEventListener("selectstart", blockTouchDefault);
  touchControls.addEventListener("touchstart", blockTouchDefault, { passive: false });
  touchControls.addEventListener("touchmove", blockTouchDefault, { passive: false });
  touchControls.addEventListener("touchend", blockTouchDefault, { passive: false });
}

for (const button of document.querySelectorAll(".touch-btn")) {
  button.addEventListener("contextmenu", (event) => event.preventDefault());
  button.addEventListener("dragstart", (event) => event.preventDefault());
  button.addEventListener("selectstart", (event) => event.preventDefault());
  const dir = button.dataset.dir;
  const action = button.dataset.action;

  if (action === "burst") {
    button.addEventListener("touchstart", (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      useAmmoBurst();
      updateHud();
    }, { passive: false });
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      useAmmoBurst();
      updateHud();
    });
    continue;
  }

  const press = (pressed) => {
    state.input[dir] = pressed;
  };

  button.addEventListener("touchstart", (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    press(true);
  }, { passive: false });
  button.addEventListener("touchend", (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
    press(false);
  }, { passive: false });
  button.addEventListener("touchcancel", () => press(false), { passive: false });
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    press(true);
  });
  button.addEventListener("pointerup", () => press(false));
  button.addEventListener("pointerleave", () => press(false));
  button.addEventListener("pointercancel", () => press(false));
}

document.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".touch-controls")) {
    event.preventDefault();
  }
});

document.addEventListener("selectstart", (event) => {
  if (event.target.closest(".touch-controls")) {
    event.preventDefault();
  }
});

const unlockBackgroundMusic = () => {
  playBackgroundMusic();
};

document.addEventListener("pointerdown", unlockBackgroundMusic, { once: true });
document.addEventListener("keydown", unlockBackgroundMusic, { once: true });

updateHud();

draw();
requestAnimationFrame(loop);
