import { createAudioPlayer } from "./engine/audio/audio-player.js";
import { music } from "./engine/audio/music-data.js";
import { sideScrollerCameraTargetX, smoothCameraX, snapCameraX } from "./engine/core/camera.js";
import { clamp, rectsOverlap } from "./engine/core/geometry.js";
import { saveKeys } from "./engine/core/save-keys.js";
import { readSave, writeSave } from "./engine/core/storage.js";
import { editorPresets } from "./engine/editor/editor-presets.js";
import { levels } from "./games/kaninkapina/content/levels.js";
import { rabbitStyles } from "./games/kaninkapina/content/rabbits.js";
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const levelNameEl = document.getElementById("levelName");
const scoreEl = document.getElementById("score");
const carrotsEl = document.getElementById("carrots");
const livesEl = document.getElementById("lives");
const bestScoreEl = document.getElementById("bestScore");
const levelProgressFill = document.getElementById("levelProgressFill");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const soundBtn = document.getElementById("soundBtn");
const levelSelect = document.getElementById("levelSelect");
const startLevelBtn = document.getElementById("startLevelBtn");
const unlockLevelsBtn = document.getElementById("unlockLevelsBtn");
const characterButtons = document.querySelectorAll("[data-rabbit]");
const editorType = document.getElementById("editorType");
const editorWidth = document.getElementById("editorWidth");
const editorHeight = document.getElementById("editorHeight");
const editorToggleBtn = document.getElementById("editorToggleBtn");
const editorUndoBtn = document.getElementById("editorUndoBtn");
const editorCopyBtn = document.getElementById("editorCopyBtn");
const editorOutput = document.getElementById("editorOutput");
const startMenu = document.getElementById("startMenu");
const menuStartBtn = document.getElementById("menuStartBtn");
const menuTestBtn = document.getElementById("menuTestBtn");
const menuProgress = document.getElementById("menuProgress");

ctx.imageSmoothingEnabled = false;

const TILE = 30;
const GRAVITY = 0.82;
const MAX_FALL = 18;
const APEX_GRAVITY_SCALE = 0.72;
const APEX_VELOCITY_WINDOW = 2.6;
const MOVE_SPEED = 3.45;
const TURBO_SPEED = 5.6;
const TURBO_TIME = 20 * 60;
const GOAL_SPRINT_TIME = 4 * 60;
const TURBO_END_WARNING_TIME = 3 * 60;
const TURBO_SPEED_RAMP_TIME = 45;
const JUMP_FORCE = 15.2;
const JUMP_RELEASE_CUT = 0.52;
const TRAMPOLINE_HOLD_BONUS = 2.8;
const TRAMPOLINE_HINT_DISTANCE = 92;
const COYOTE_TIME = 9;
const JUMP_BUFFER_TIME = 9;
const ENEMY_STOMP_GRACE = 18;
const HEDGEHOG_STOMP_BOUNCE = 10;
const SEAGULL_STOMP_BOUNCE = 12.5;
const BOSS_STOMP_BOUNCE = 13.5;
const STOMP_INVINCIBLE_TIME = 28;
const CHECKPOINT_INVINCIBLE_TIME = 90;
const CHECKPOINT_SCORE_BONUS = 150;
const CHECKPOINT_HINT_DISTANCE = 120;
const BONUS_CARROT_INVINCIBLE_TIME = 75;
const WATER_HAZARD_INSET = 8;
const CURRENT_WATER_DEFAULT_FORCE_X = 0.32;
const CURRENT_WATER_MAX_PUSH = 2.6;
const SPIKE_HAZARD_INSET = 6;
const PLAYER_DEATH_TIME = 72;
const RESPAWN_INVINCIBLE_TIME = 120;
const ENEMY_DEATH_TIME = 34;
const SHOT_COOLDOWN = 28;
const SHOTGUN_KICKBACK = 2.2;
const SHOTGUN_GROUNDED_KICKBACK_SCALE = 0.45;
const SHOTGUN_DRY_FIRE_COOLDOWN = 22;
const SHOTGUN_READY_COOLDOWN = 0;
const BOSS_ATTACK_WARNING_TIME = 34;
const BOSS_HIT_STAGGER_TIME = 16;
const BOSS_MAX_STAGGERED_ATTACK_TIMER = 110;
const CARROT_COMBO_TIME = 90;
const CARROT_COMBO_BONUS = 25;
const CAMERA_LOOKAHEAD = 76;
const CAMERA_SMOOTHING = 0.18;
const MAX_SCORE_POPUPS = 10;
const CRUMBLE_PLATFORM_BREAK_TIME = 42;
const CRUMBLE_PLATFORM_RESPAWN_TIME = 150;
const WIND_ZONE_DEFAULT_FORCE_X = 0.18;
const WIND_ZONE_MAX_PUSH = 2.2;
const PENDULUM_DEFAULT_LENGTH = 112;
const PENDULUM_DEFAULT_RADIUS = 18;
const PENDULUM_DEFAULT_SWING = 0.82;
const PENDULUM_DEFAULT_SPEED = 0.025;
const TARGET_FRAME_MS = 1000 / 60;
const MAX_LOGIC_STEPS = 4;

const keys = {
  left: false,
  right: false,
  jump: false,
  shoot: false,
};

let player;
let level = levels[0];
let currentLevelIndex = 0;
let cameraX = 0;
let score = 0;
let carrotsCollected = 0;
let lives = 3;
let shots = [];
let bossAttacks = [];
let scorePopups = [];
let gameFrame = 0;
let message = "";
let messageTimer = 0;
let gameOver = false;
let won = false;
let selectedRabbit = "classic";
let editorEnabled = false;
let editorPreview = null;
let editorHistory = [];
let menuOpen = true;
let paused = false;
let bestScore = 0;
let runStartingBestScore = 0;
let bestScoreAnnounced = false;
let highestUnlockedLevel = 0;
let soundOn = true;
let carrotComboTimer = 0;
let carrotComboCount = 0;
let lastLoopTick = 0;
let logicAccumulator = 0;
const audio = createAudioPlayer(music);



function placePlayerAtStart() {
  player = {
    x: level.startX,
    y: level.startY,
    w: 34,
    h: 42,
    vx: 0,
    vy: 0,
    grounded: false,
    coyoteTimer: 0,
    jumpBuffer: 0,
    jumpHeld: false,
    facing: 1,
    invincible: 0,
    deathTimer: 0,
    finalDeath: false,
    hasShotgun: false,
    shootCooldown: 0,
    lastShootCooldown: SHOTGUN_READY_COOLDOWN,
    dryFireCooldown: 0,
    turboTimer: 0,
    turboWarningGiven: false,
    rabbit: selectedRabbit,
  };
  carrotsCollected = 0;
  player.respawnX = level.startX;
  player.respawnY = level.startY;
  player.respawnFacing = 1;
  snapCameraToPlayer();
}

function resetLevelState() {
  shots = [];
  bossAttacks = [];
  scorePopups = [];
  gameFrame = 0;
  carrotComboTimer = 0;
  carrotComboCount = 0;
  level.goalAnnounced = false;
  level.carrots.forEach((carrot) => {
    carrot.got = false;
  });
  (level.bonusCarrots || []).forEach((carrot) => {
    carrot.got = false;
  });
  (level.starCarrots || []).forEach((carrot) => {
    carrot.got = false;
  });
  (level.keys || []).forEach((key) => {
    key.got = false;
  });
  (level.pressureButtons || []).forEach((button) => {
    button.active = false;
  });
  if (level.weapon) {
    level.weapon.got = false;
  }
  if (level.turbo) {
    level.turbo.got = false;
  }
  (level.movingPlatforms || []).forEach((platform) => {
    if (platform.startX === undefined) platform.startX = platform.x;
    if (platform.startY === undefined) platform.startY = platform.y;
    platform.x = platform.startX;
    platform.y = platform.startY;
    platform.prevX = platform.x;
    platform.prevY = platform.y;
    platform.dx = 0;
    platform.dy = 0;
    if (platform.points && platform.points.length > 1) {
      platform.x = platform.points[0].x;
      platform.y = platform.points[0].y;
      platform.pointIndex = 1;
    }
  });
  (level.crumblePlatforms || []).forEach((platform) => {
    platform.breakTimer = 0;
    platform.respawnTimer = 0;
  });
  (level.breakableWalls || []).forEach((wall) => {
    wall.hp = wall.maxHp || wall.hp || 2;
    wall.destroyed = false;
    wall.hitTimer = 0;
  });
  (level.trampolines || []).forEach((trampoline) => {
    trampoline.springTimer = 0;
  });
  (level.checkpoints || []).forEach((checkpoint) => {
    checkpoint.active = false;
  });
  if (level.boss) {
    if (level.boss.startAttackTimer === undefined) level.boss.startAttackTimer = level.boss.attackTimer;
    if (level.boss.startAttackType === undefined) level.boss.startAttackType = level.boss.attackType;
    level.boss.hp = level.boss.maxHp;
    level.boss.y = level.boss.baseY;
    level.boss.phase = 0;
    level.boss.hitTimer = 0;
    level.boss.attackTimer = level.boss.startAttackTimer;
    level.boss.attackType = level.boss.startAttackType;
    level.boss.enraged = false;
    level.boss.defeated = false;
  }
  level.enemies.forEach((enemy) => {
    if (enemy.startX === undefined) enemy.startX = enemy.x;
    if (enemy.startY === undefined) enemy.startY = enemy.y;
    if (enemy.startPhase === undefined) enemy.startPhase = enemy.phase || 0;
    enemy.x = enemy.startX;
    enemy.y = enemy.startY;
    enemy.phase = enemy.startPhase;
    enemy.dead = false;
    enemy.deathTimer = 0;
  });
}

function startLevel(index) {
  currentLevelIndex = index;
  level = levels[currentLevelIndex];
  editorHistory = [];
  placePlayerAtStart();
  resetLevelState();
  message = level.intro;
  messageTimer = 170;
  updateHud();
  if (levelSelect) levelSelect.value = String(currentLevelIndex);
  if (editorOutput) editorExport();
  setMusicMode();
}

function resetGame() {
  score = 0;
  runStartingBestScore = bestScore;
  bestScoreAnnounced = false;
  lives = 3;
  gameOver = false;
  won = false;
  paused = false;
  updatePauseButton();
  startLevel(0);
}

function startTestLevel(index) {
  score = 0;
  runStartingBestScore = bestScore;
  bestScoreAnnounced = false;
  lives = 3;
  gameOver = false;
  won = false;
  paused = false;
  updatePauseButton();
  startLevel(index);
  say(`Testataan tasoa ${index + 1}: ${level.name}`, 150);
}

function testSpawnAt(worldX, worldY) {
  if (!editorEnabled) return;
  gameOver = false;
  won = false;
  paused = false;
  closeStartMenu();
  resetLevelState();
  player.x = clamp(snapToGrid(worldX), 0, level.width - player.w);
  player.y = clamp(snapToGrid(worldY) - player.h, 0, canvas.height - player.h);
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  player.deathTimer = 0;
  player.finalDeath = false;
  player.invincible = RESPAWN_INVINCIBLE_TIME;
  player.respawnX = player.x;
  player.respawnY = player.y;
  player.respawnFacing = player.facing;
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  keys.shoot = false;
  snapCameraToPlayer();
  updateHud();
  say("Editor: testispawn asetettu", 90);
}

function populateLevelSelect() {
  const previousValue = levelSelect.value;
  levelSelect.innerHTML = "";
  levels.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    const status = index <= highestUnlockedLevel ? "avattu" : "testi";
    option.textContent = `Taso ${index + 1}: ${entry.name} (${status})`;
    levelSelect.appendChild(option);
  });
  if (previousValue && Number(previousValue) < levels.length) {
    levelSelect.value = previousValue;
  }
  updateMenuProgress();
}

function updateMenuProgress() {
  if (!menuProgress) return;
  menuProgress.textContent = `Avattu taso ${highestUnlockedLevel + 1}/${levels.length}`;
}

function openStartMenu() {
  menuOpen = true;
  startMenu.classList.remove("is-hidden");
}

function closeStartMenu() {
  menuOpen = false;
  startMenu.classList.add("is-hidden");
}

function releaseAllControls() {
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  keys.shoot = false;
  releaseJump();
  document.querySelectorAll(".touch-control.is-pressed").forEach((button) => {
    button.classList.remove("is-pressed");
  });
}

function updatePauseButton() {
  if (!pauseBtn) return;
  pauseBtn.textContent = paused ? "Jatka" : "Tauko";
  pauseBtn.classList.toggle("is-pressed", paused);
}

function setPaused(nextPaused) {
  if (menuOpen) return;
  paused = nextPaused;
  if (paused) releaseAllControls();
  updatePauseButton();
  say(paused ? "Tauko" : "Jatketaan!", 70);
}

function togglePause() {
  setPaused(!paused);
}

function selectRabbit(rabbit) {
  selectedRabbit = rabbitStyles[rabbit] ? rabbit : "classic";
  if (player) player.rabbit = selectedRabbit;
  writeSave(saveKeys.rabbit, selectedRabbit);
  characterButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.rabbit === selectedRabbit);
  });
  say(`Valittu kani: ${rabbitStyles[selectedRabbit].name}`, 90);
}

function snapToGrid(value, size = 10) {
  return Math.round(value / size) * size;
}

function editorCollections() {
  return {
    platforms: level.platforms,
    movingPlatforms: level.movingPlatforms || (level.movingPlatforms = []),
    crumblePlatforms: level.crumblePlatforms || (level.crumblePlatforms = []),
    oneWayPlatforms: level.oneWayPlatforms || (level.oneWayPlatforms = []),
    breakableWalls: level.breakableWalls || (level.breakableWalls = []),
    water: level.water || (level.water = []),
    currentWater: level.currentWater || (level.currentWater = []),
    windZones: level.windZones || (level.windZones = []),
    spikes: level.spikes || (level.spikes = []),
    pendulums: level.pendulums || (level.pendulums = []),
    trampolines: level.trampolines || (level.trampolines = []),
    keys: level.keys || (level.keys = []),
    lockedGates: level.lockedGates || (level.lockedGates = []),
    pressureButtons: level.pressureButtons || (level.pressureButtons = []),
    buttonGates: level.buttonGates || (level.buttonGates = []),
    cameraHints: level.cameraHints || (level.cameraHints = []),
    carrots: level.carrots,
    bonusCarrots: level.bonusCarrots || (level.bonusCarrots = []),
    starCarrots: level.starCarrots || (level.starCarrots = []),
    enemies: level.enemies,
    checkpoints: level.checkpoints || (level.checkpoints = []),
  };
}


function applyEditorPreset() {
  const preset = editorPresets[editorType.value];
  if (!preset) return;
  editorWidth.value = String(preset.w);
  editorHeight.value = String(preset.h);
  editorExport();
}

function editorExport() {
  const data = {};
  const collections = editorCollections();
  for (const [key, value] of Object.entries(collections)) {
    if (value.length > 0) data[key] = value.map((entry) => {
      const copy = { ...entry };
      delete copy.got;
      delete copy.dead;
      delete copy.deathTimer;
      delete copy.destroyed;
      delete copy.hitTimer;
      delete copy.active;
      delete copy.oneWay;
      delete copy.startX;
      delete copy.startY;
      delete copy.startPhase;
      delete copy.prevX;
      delete copy.prevY;
      delete copy.dx;
      delete copy.dy;
      delete copy.pointIndex;
      delete copy.springTimer;
      delete copy.breakTimer;
      delete copy.respawnTimer;
      return copy;
    });
  }
  editorOutput.value = JSON.stringify(data, null, 2);
}

function editorAdd(collectionName, item) {
  const collection = editorCollections()[collectionName];
  collection.push(item);
  editorHistory.push({ collectionName, index: collection.length - 1 });
  if (editorHistory.length > 60) editorHistory.shift();
}

function editorCollectionNameForType(type) {
  const map = {
    platform: "platforms",
    movingPlatform: "movingPlatforms",
    routePlatform: "movingPlatforms",
    crumblePlatform: "crumblePlatforms",
    oneWayPlatform: "oneWayPlatforms",
    breakableWall: "breakableWalls",
    water: "water",
    currentWater: "currentWater",
    windZone: "windZones",
    spikes: "spikes",
    pendulum: "pendulums",
    trampoline: "trampolines",
    key: "keys",
    lockedGate: "lockedGates",
    pressureButton: "pressureButtons",
    buttonGate: "buttonGates",
    cameraHint: "cameraHints",
    carrot: "carrots",
    bonusCarrot: "bonusCarrots",
    starCarrot: "starCarrots",
    hedgehog: "enemies",
    seagull: "enemies",
    checkpoint: "checkpoints",
  };
  return map[type] || null;
}

function editorEntryMatchesType(entry, type) {
  if (type === "movingPlatform") return !entry.points;
  if (type === "routePlatform") return Array.isArray(entry.points);
  if (type === "hedgehog" || type === "seagull") return entry.type === type;
  return true;
}

function resetEditorRuntimeFields(copy) {
  delete copy.dead;
  delete copy.deathTimer;
  delete copy.destroyed;
  delete copy.oneWay;
  delete copy.startX;
  delete copy.startY;
  delete copy.startPhase;
  delete copy.prevX;
  delete copy.prevY;
  delete copy.dx;
  delete copy.dy;
  delete copy.pointIndex;
  copy.got = false;
  copy.active = false;
  if (copy.breakTimer !== undefined) copy.breakTimer = 0;
  if (copy.respawnTimer !== undefined) copy.respawnTimer = 0;
  if (copy.springTimer !== undefined) copy.springTimer = 0;
  if (copy.maxHp !== undefined) copy.hp = copy.maxHp;
  if (copy.hitTimer !== undefined) copy.hitTimer = 0;
  if (copy.points) {
    const dx = copy.x - copy.points[0].x;
    const dy = copy.y - copy.points[0].y;
    copy.points = copy.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
  }
}

function nearestEditorEntry(type, worldX, worldY) {
  const collectionName = editorCollectionNameForType(type);
  if (!collectionName) return null;
  const collection = editorCollections()[collectionName];
  let best = null;
  let bestDistance = Infinity;
  for (const entry of collection) {
    if (!editorEntryMatchesType(entry, type)) continue;
    const centerX = entry.x + (entry.w || 0) / 2;
    const centerY = entry.y + (entry.h || 0) / 2;
    const distance = (centerX - worldX) ** 2 + (centerY - worldY) ** 2;
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best ? { collectionName, entry: best } : null;
}

function undoEditorObject() {
  const last = editorHistory.pop();
  if (!last) {
    say("Editor: ei peruttavaa", 55);
    return;
  }
  const collection = editorCollections()[last.collectionName];
  if (collection && last.index === collection.length - 1) {
    collection.pop();
    editorExport();
    say("Editor: viimeisin lisäys peruttu", 70);
  } else {
    editorExport();
    say("Editor: peruutushistoria vanheni", 80);
  }
}

async function copyEditorJson() {
  editorExport();
  const text = editorOutput.value;
  if (!text) {
    say("Editor: ei kopioitavaa", 60);
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      say("Editor: JSON kopioitu", 70);
      return;
    }
  } catch (error) {
    // Fall back to selecting the text area below.
  }

  editorOutput.focus();
  editorOutput.select();
  say("Editor: JSON valittu kopiointia varten", 95);
}

function addEditorObject(worldX, worldY) {
  const type = editorType.value;
  const w = Number(editorWidth.value) || 120;
  const h = Number(editorHeight.value) || 24;
  const x = snapToGrid(worldX);
  const y = snapToGrid(worldY);

  if (type === "platform") {
    editorAdd("platforms", { x, y, w, h, type: "grass" });
  } else if (type === "movingPlatform") {
    editorAdd("movingPlatforms", { x, y, w, h, axis: "x", distance: 220, speed: 1.3, dir: 1 });
  } else if (type === "routePlatform") {
    editorAdd("movingPlatforms", {
      x,
      y,
      w,
      h,
      speed: 1.5,
      points: [
        { x, y },
        { x: x + 220, y },
        { x: x + 220, y: y - 90 },
        { x, y: y - 90 },
      ],
      pointIndex: 1,
    });
  } else if (type === "crumblePlatform") {
    editorAdd("crumblePlatforms", { x, y, w, h, breakTimer: 0, respawnTimer: 0 });
  } else if (type === "oneWayPlatform") {
    editorAdd("oneWayPlatforms", { x, y, w, h });
  } else if (type === "breakableWall") {
    editorAdd("breakableWalls", { x, y, w, h, hp: 2, maxHp: 2, destroyed: false, hitTimer: 0 });
  } else if (type === "water") {
    editorAdd("water", { x, y, w, h });
  } else if (type === "currentWater") {
    editorAdd("currentWater", { x, y, w, h, forceX: CURRENT_WATER_DEFAULT_FORCE_X, forceY: 0 });
  } else if (type === "windZone") {
    editorAdd("windZones", { x, y, w, h, forceX: WIND_ZONE_DEFAULT_FORCE_X, forceY: 0 });
  } else if (type === "spikes") {
    editorAdd("spikes", { x, y, w, h });
  } else if (type === "pendulum") {
    editorAdd("pendulums", {
      x,
      y,
      length: PENDULUM_DEFAULT_LENGTH,
      radius: PENDULUM_DEFAULT_RADIUS,
      swing: PENDULUM_DEFAULT_SWING,
      speed: PENDULUM_DEFAULT_SPEED,
      phase: 0,
    });
  } else if (type === "trampoline") {
    editorAdd("trampolines", { x, y, w: 54, h: 18, bounce: 21, springTimer: 0 });
  } else if (type === "key") {
    editorAdd("keys", { x, y, channel: "A", got: false });
  } else if (type === "lockedGate") {
    editorAdd("lockedGates", { x, y, w, h, channel: "A" });
  } else if (type === "pressureButton") {
    editorAdd("pressureButtons", { x, y, w, h, channel: "A", active: false });
  } else if (type === "buttonGate") {
    editorAdd("buttonGates", { x, y, w, h, channel: "A" });
  } else if (type === "cameraHint") {
    editorAdd("cameraHints", { x, y, w, h, lookX: 180, lookY: 0 });
  } else if (type === "carrot") {
    editorAdd("carrots", { x, y, got: false });
  } else if (type === "bonusCarrot") {
    editorAdd("bonusCarrots", { x, y, got: false });
  } else if (type === "starCarrot") {
    editorAdd("starCarrots", { x, y, got: false });
  } else if (type === "hedgehog") {
    editorAdd("enemies", { type: "hedgehog", x, y, min: x - 120, max: x + 120, dir: 1, speed: 1.6 });
  } else if (type === "seagull") {
    editorAdd("enemies", { type: "seagull", x, y, min: x - 180, max: x + 180, dir: 1, speed: 2.3, phase: 0, amp: 48 });
  } else if (type === "checkpoint") {
    editorAdd("checkpoints", { x, y, active: false });
  }

  editorExport();
  say(`Editor: lisätty ${type}`, 55);
}

function cloneEditorObject(worldX, worldY) {
  const type = editorType.value;
  const x = snapToGrid(worldX);
  const y = snapToGrid(worldY);
  const nearest = nearestEditorEntry(type, worldX, worldY);
  if (!nearest) {
    say("Editor: ei kloonattavaa objektia", 65);
    return;
  }

  const copy = { ...nearest.entry };
  const dx = x - copy.x;
  const dy = y - copy.y;
  copy.x = x;
  copy.y = y;
  if (copy.min !== undefined) copy.min += dx;
  if (copy.max !== undefined) copy.max += dx;
  if (copy.baseY !== undefined) copy.baseY += dy;
  resetEditorRuntimeFields(copy);
  editorAdd(nearest.collectionName, copy);
  editorExport();
  say(`Editor: kloonattu ${type}`, 55);
}

function drawEditorPreview() {
  if (!editorEnabled || !editorPreview) return;
  const w = Number(editorWidth.value) || 80;
  const h = Number(editorHeight.value) || 24;
  const x = snapToGrid(editorPreview.x) - cameraX;
  const y = snapToGrid(editorPreview.y);
  drawPixelRect(x, y, w, h, "#111018");
  drawPixelRect(x + 4, y + 4, Math.max(4, w - 8), Math.max(4, h - 8), "rgba(255, 207, 63, 0.6)");
}

function drawEditorGrid() {
  if (!editorEnabled) return;
  const minor = 10;
  const major = 40;
  const startX = -((cameraX % major) + major) % major;

  for (let x = startX; x < canvas.width; x += major) {
    drawPixelRect(x, 0, 2, canvas.height, "rgba(255, 207, 63, 0.22)");
  }
  for (let y = 0; y < canvas.height; y += major) {
    drawPixelRect(0, y, canvas.width, 2, "rgba(255, 207, 63, 0.18)");
  }
  for (let x = -((cameraX % minor) + minor) % minor; x < canvas.width; x += minor) {
    drawPixelRect(x, 0, 1, canvas.height, "rgba(249, 244, 220, 0.06)");
  }
  for (let y = 0; y < canvas.height; y += minor) {
    drawPixelRect(0, y, canvas.width, 1, "rgba(249, 244, 220, 0.05)");
  }
}

function toggleEditor() {
  editorEnabled = !editorEnabled;
  editorToggleBtn.classList.toggle("is-active", editorEnabled);
  editorToggleBtn.textContent = editorEnabled ? "Editor päällä" : "Editor päälle";
}

function advanceLevel() {
  if (currentLevelIndex < levels.length - 1) {
    score += 500;
    playSfx("win");
    unlockLevel(currentLevelIndex + 1);
    startLevel(currentLevelIndex + 1);
    spawnScorePopup("+500 TASO", player.x + player.w / 2, player.y - 18, "#f9f4dc");
    return;
  }
  won = true;
  unlockLevel(currentLevelIndex);
  score += 800;
  spawnScorePopup("+800 VOITTO", player.x + player.w / 2, player.y - 18, "#f9f4dc");
  message = "Voitto! Kani perusti koko porkkanavaltakunnan";
  messageTimer = Infinity;
  playSfx("win");
  updateHud();
}

function updateHud() {
  syncBestScore();
  levelNameEl.textContent = `Taso ${currentLevelIndex + 1}: ${level.name}`;
  scoreEl.textContent = String(score);
  if (level.boss) {
    const ammoStatus = player.hasShotgun
      ? player.shootCooldown > 0
        ? ` Lataa ${Math.ceil(player.shootCooldown / 60)}s`
        : " PAM valmis"
      : "";
    carrotsEl.textContent = `T${currentLevelIndex + 1} Pomo ${Math.max(0, level.boss.hp)}/${level.boss.maxHp}${ammoStatus}`;
  } else if (player.turboTimer > 0) {
    carrotsEl.textContent = `T${currentLevelIndex + 1} Turbo ${Math.ceil(player.turboTimer / 60)}s`;
  } else {
    carrotsEl.textContent = `T${currentLevelIndex + 1} ${carrotsCollected}/${level.carrots.length}`;
  }
  livesEl.textContent = String(lives);
  livesEl.classList.toggle("is-low", lives === 1);
  bestScoreEl.textContent = String(bestScore);
  updateLevelProgress();
}

function updateLevelProgress() {
  const progressMin = Math.max(0, level.startX || 0);
  const progressMax = Math.max(progressMin + 1, level.width - player.w);
  const progress = clamp(((player.x - progressMin) / (progressMax - progressMin)) * 100, 0, 100);
  levelProgressFill.style.width = `${progress}%`;
}

function enemyBox(enemy) {
  if (enemy.type === "seagull") {
    return { x: enemy.x, y: enemy.y, w: 48, h: 30 };
  }
  return { x: enemy.x, y: enemy.y, w: 42, h: 34 };
}

function bossBox() {
  if (!level.boss || level.boss.defeated) return null;
  return { x: level.boss.x, y: level.boss.y, w: level.boss.w, h: level.boss.h };
}

function solidPlatforms() {
  const crumblePlatforms = (level.crumblePlatforms || []).filter((platform) => (platform.respawnTimer || 0) <= 0);
  const oneWayPlatforms = (level.oneWayPlatforms || []).map((platform) => ({ ...platform, oneWay: true }));
  const breakableWalls = (level.breakableWalls || []).filter((wall) => !wall.destroyed);
  const lockedGates = (level.lockedGates || []).filter((gate) => !hasGateKey(gateChannel(gate)));
  const buttonGates = (level.buttonGates || []).filter((gate) => !hasActivePressureButton(gateChannel(gate)));
  return level.platforms.concat(level.movingPlatforms || [], crumblePlatforms, oneWayPlatforms, breakableWalls, lockedGates, buttonGates);
}

function gateChannel(item) {
  return item.channel || item.id || "A";
}

function channelColor(item) {
  const channel = gateChannel(item);
  const palette = ["#76c9d1", "#ffcf3f", "#e85b52", "#69b84f", "#c9d4d6"];
  const index = String(channel).charCodeAt(0) % palette.length;
  return palette[index];
}

function hasGateKey(channel = "A") {
  return (level.keys || []).some((key) => key.got && gateChannel(key) === channel);
}

function hasActivePressureButton(channel = "A") {
  return (level.pressureButtons || []).some((button) => button.active && gateChannel(button) === channel);
}

function say(text, timer = 95) {
  message = text;
  messageTimer = timer;
}

function spawnScorePopup(text, x, y, color = "#ffcf3f") {
  scorePopups.push({
    text,
    x,
    y,
    vy: -0.7,
    life: 58,
    color,
  });
  if (scorePopups.length > MAX_SCORE_POPUPS) {
    scorePopups.shift();
  }
}

function updateScorePopups() {
  for (const popup of scorePopups) {
    popup.y += popup.vy;
    popup.life -= 1;
  }
  scorePopups = scorePopups.filter((popup) => popup.life > 0);
}

function drawScorePopups() {
  ctx.font = "18px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const popup of scorePopups) {
    const x = Math.round(popup.x - cameraX);
    const y = Math.round(popup.y);
    ctx.fillStyle = "#111018";
    ctx.fillText(popup.text, x + 2, y + 2);
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, x, y);
  }
}

function loadProgress() {
  bestScore = Number(readSave(saveKeys.bestScore, 0)) || 0;
  highestUnlockedLevel = Number(readSave(saveKeys.highestUnlockedLevel, 0)) || 0;
  selectedRabbit = readSave(saveKeys.rabbit, selectedRabbit);
  if (!rabbitStyles[selectedRabbit]) selectedRabbit = "classic";
  soundOn = readSave(saveKeys.soundOn, "true") !== "false";
  audio.setSoundOn(soundOn);
}

function unlockLevel(index) {
  if (index <= highestUnlockedLevel) return;
  highestUnlockedLevel = Math.min(index, levels.length - 1);
  writeSave(saveKeys.highestUnlockedLevel, highestUnlockedLevel);
  populateLevelSelect();
}

function unlockAllLevels() {
  highestUnlockedLevel = levels.length - 1;
  writeSave(saveKeys.highestUnlockedLevel, highestUnlockedLevel);
  populateLevelSelect();
  say("Testi: kaikki tasot avattu.", 90);
}

function syncBestScore() {
  if (score > bestScore) {
    bestScore = score;
    writeSave(saveKeys.bestScore, bestScore);
    if (!bestScoreAnnounced && score > runStartingBestScore) {
      bestScoreAnnounced = true;
      spawnScorePopup("UUSI ENNÄTYS!", player.x + player.w / 2, player.y - 12, "#f9f4dc");
      say("Uusi ennätys!", 95);
      playSfx("gold");
    }
  }
}

function updateSoundButton() {
  soundBtn.textContent = soundOn ? "Ääni on" : "Ääni pois";
  soundBtn.classList.toggle("is-muted", !soundOn);
}

function toggleSound() {
  soundOn = !soundOn;
  writeSave(saveKeys.soundOn, soundOn);
  audio.setSoundOn(soundOn);
  updateSoundButton();
  if (soundOn) startMusic();
}

function playSfx(name) {
  audio.playSfx(name);
}

function setMusicMode() {
  audio.setMusicMode(musicMode());
}

function startMusic() {
  audio.start(musicMode());
}

function musicMode() {
  return level.boss ? "boss" : "level";
}

function fireShotgun() {
  if (!player.hasShotgun || player.deathTimer > 0) return;
  if (player.shootCooldown > 0) {
    if (player.dryFireCooldown <= 0) {
      player.dryFireCooldown = SHOTGUN_DRY_FIRE_COOLDOWN;
      playSfx("carrot");
      say("Haulikko latautuu...", 32);
    }
    return;
  }
  player.shootCooldown = SHOT_COOLDOWN;
  const startX = player.x + (player.facing > 0 ? player.w + 2 : -8);
  const startY = player.y + 22;
  const speed = player.facing > 0 ? 10 : -10;
  for (let i = -2; i <= 2; i += 1) {
    shots.push({
      x: startX,
      y: startY,
      vx: speed,
      vy: i * 0.75,
      life: 42,
      hit: false,
    });
  }
  const kickback = SHOTGUN_KICKBACK * (player.grounded ? SHOTGUN_GROUNDED_KICKBACK_SCALE : 1);
  player.vx = clamp(player.vx - player.facing * kickback, -TURBO_SPEED, TURBO_SPEED);
  if (!player.grounded) player.vy = Math.min(player.vy, -1.2);
  playSfx("shotgun");
  message = "PAM!";
  messageTimer = 16;
}

function cutJumpShort() {
  if (menuOpen || paused || gameOver || won || player.deathTimer > 0) return;
  if (player.vy < -3) {
    player.vy *= JUMP_RELEASE_CUT;
  }
}

function queueJump() {
  if (menuOpen || paused || gameOver || won || player.deathTimer > 0) return;
  if (!player.jumpHeld) {
    player.jumpBuffer = JUMP_BUFFER_TIME;
  }
  player.jumpHeld = true;
}

function releaseJump() {
  if (player) player.jumpHeld = false;
  cutJumpShort();
}

function startPlayerDeath() {
  if (player.deathTimer > 0) return;
  playSfx("hurt");
  lives -= 1;
  carrotComboTimer = 0;
  carrotComboCount = 0;
  spawnScorePopup("-1 ELAMA", player.x + player.w / 2, player.y - 14, "#e85b52");
  updateHud();
  player.deathTimer = PLAYER_DEATH_TIME;
  player.finalDeath = lives <= 0;
  player.vx = -player.facing * 2.2;
  player.vy = -9.5;
  player.grounded = false;
  message = player.finalDeath ? "Peli ohi - kani jäi tauolle" : "Auts! Vielä uudestaan";
  messageTimer = player.finalDeath ? Infinity : PLAYER_DEATH_TIME + 55;
}

function finishPlayerDeath() {
  if (player.finalDeath) {
    gameOver = true;
    player.vx = 0;
    player.vy = 0;
    return;
  }
  player.x = player.respawnX || level.startX;
  player.y = player.respawnY || level.startY;
  player.vx = 0;
  player.vy = 0;
  player.facing = player.respawnFacing || 1;
  player.invincible = RESPAWN_INVINCIBLE_TIME;
  player.deathTimer = 0;
  player.finalDeath = false;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  snapCameraToPlayer();
  message = "Kani: Uusi yritys!";
  messageTimer = 70;
}

function updateMovingPlatforms() {
  for (const platform of level.movingPlatforms || []) {
    platform.prevX = platform.x;
    platform.prevY = platform.y;
    if (platform.points && platform.points.length > 1) {
      const target = platform.points[platform.pointIndex || 0];
      const dx = target.x - platform.x;
      const dy = target.y - platform.y;
      const distance = Math.hypot(dx, dy);
      const step = platform.speed || 1.4;
      if (distance <= step) {
        platform.x = target.x;
        platform.y = target.y;
        platform.pointIndex = ((platform.pointIndex || 0) + 1) % platform.points.length;
      } else {
        platform.x += (dx / distance) * step;
        platform.y += (dy / distance) * step;
      }
      platform.dx = platform.x - platform.prevX;
      platform.dy = platform.y - platform.prevY;
      continue;
    }
    if (platform.axis === "y") {
      platform.y += platform.speed * platform.dir;
      if (Math.abs(platform.y - platform.startY) >= platform.distance) {
        platform.y = platform.startY + platform.distance * platform.dir;
        platform.dir *= -1;
      }
    } else {
      platform.x += platform.speed * platform.dir;
      if (Math.abs(platform.x - platform.startX) >= platform.distance) {
        platform.x = platform.startX + platform.distance * platform.dir;
        platform.dir *= -1;
      }
    }
    platform.dx = platform.x - platform.prevX;
    platform.dy = platform.y - platform.prevY;
  }
}

function updateCrumblePlatforms() {
  for (const platform of level.crumblePlatforms || []) {
    if (platform.respawnTimer > 0) {
      platform.respawnTimer -= 1;
      if (platform.respawnTimer <= 0) {
        platform.breakTimer = 0;
      }
      continue;
    }
    if (platform.breakTimer > 0) {
      platform.breakTimer -= 1;
      if (platform.breakTimer <= 0) {
        platform.respawnTimer = CRUMBLE_PLATFORM_RESPAWN_TIME;
      }
    }
  }
}

function updateTrampolines() {
  for (const trampoline of level.trampolines || []) {
    if (trampoline.springTimer > 0) trampoline.springTimer -= 1;
    const previousBottom = player.y + player.h - player.vy;
    const box = { x: trampoline.x, y: trampoline.y, w: trampoline.w, h: trampoline.h };
    if (player.vy >= 0 && previousBottom <= trampoline.y + 8 && rectsOverlap(player, box)) {
      player.y = trampoline.y - player.h;
      const holdBonus = keys.jump ? TRAMPOLINE_HOLD_BONUS : 0;
      player.vy = -((trampoline.bounce || 20) + holdBonus);
      player.grounded = false;
      player.coyoteTimer = 0;
      player.jumpBuffer = 0;
      trampoline.springTimer = 18;
      playSfx("turbo");
      say("Kani: Pomppu hyväksytty!", 55);
    }
  }
}

function updateWaterHazards() {
  if (player.invincible > 0 || player.deathTimer > 0) return;
  for (const water of level.water || []) {
    const hazard = {
      x: water.x + WATER_HAZARD_INSET,
      y: water.y + WATER_HAZARD_INSET,
      w: Math.max(1, water.w - WATER_HAZARD_INSET * 2),
      h: Math.max(1, water.h - WATER_HAZARD_INSET),
    };
    if (rectsOverlap(player, hazard)) {
      say("Kani: Kosteaa. Liian kosteaa.", 85);
      startPlayerDeath();
      return;
    }
  }
}

function applyCurrentWater() {
  for (const current of level.currentWater || []) {
    if (!rectsOverlap(player, current)) continue;
    player.vx = clamp(player.vx + (current.forceX || 0), -TURBO_SPEED - CURRENT_WATER_MAX_PUSH, TURBO_SPEED + CURRENT_WATER_MAX_PUSH);
    player.vy = clamp(player.vy + (current.forceY || 0) + 0.08, -MAX_FALL, MAX_FALL);
    player.coyoteTimer = Math.min(player.coyoteTimer, 2);
  }
}

function updateSpikeHazards() {
  if (player.invincible > 0 || player.deathTimer > 0) return;
  for (const spike of level.spikes || []) {
    const hazard = {
      x: spike.x + SPIKE_HAZARD_INSET,
      y: spike.y + SPIKE_HAZARD_INSET,
      w: Math.max(1, spike.w - SPIKE_HAZARD_INSET * 2),
      h: Math.max(1, spike.h - SPIKE_HAZARD_INSET),
    };
    if (rectsOverlap(player, hazard)) {
      say("Kani: Piikit eivÃ¤t silitÃ¤ takaisin.", 85);
      startPlayerDeath();
      return;
    }
  }
}

function pendulumBob(pendulum, frame = gameFrame) {
  const length = pendulum.length || PENDULUM_DEFAULT_LENGTH;
  const radius = pendulum.radius || PENDULUM_DEFAULT_RADIUS;
  const swing = pendulum.swing || PENDULUM_DEFAULT_SWING;
  const speed = pendulum.speed || PENDULUM_DEFAULT_SPEED;
  const phase = pendulum.phase || 0;
  const angle = Math.sin(frame * speed + phase) * swing;
  return {
    x: pendulum.x + Math.sin(angle) * length,
    y: pendulum.y + Math.cos(angle) * length,
    radius,
  };
}

function updatePendulumHazards() {
  if (player.invincible > 0 || player.deathTimer > 0) return;
  for (const pendulum of level.pendulums || []) {
    const bob = pendulumBob(pendulum);
    const hazard = {
      x: bob.x - bob.radius + 4,
      y: bob.y - bob.radius + 4,
      w: Math.max(1, bob.radius * 2 - 8),
      h: Math.max(1, bob.radius * 2 - 8),
    };
    if (rectsOverlap(player, hazard)) {
      say("Kani: Heiluri piti oman vuoronsa.", 85);
      startPlayerDeath();
      return;
    }
  }
}

function applyPlayerGravity() {
  const apexScale = !player.grounded && Math.abs(player.vy) < APEX_VELOCITY_WINDOW
    ? APEX_GRAVITY_SCALE
    : 1;
  player.vy = Math.min(MAX_FALL, player.vy + GRAVITY * apexScale);
}

function currentMoveSpeed() {
  if (player.turboTimer <= 0) return MOVE_SPEED;
  const ramp = Math.min(1, player.turboTimer / TURBO_SPEED_RAMP_TIME);
  return MOVE_SPEED + (TURBO_SPEED - MOVE_SPEED) * ramp;
}

function applyWindZones() {
  for (const zone of level.windZones || []) {
    if (!rectsOverlap(player, zone)) continue;
    player.vx = clamp(player.vx + (zone.forceX || 0), -TURBO_SPEED - WIND_ZONE_MAX_PUSH, TURBO_SPEED + WIND_ZONE_MAX_PUSH);
    player.vy = clamp(player.vy + (zone.forceY || 0), -MAX_FALL, MAX_FALL);
  }
}

function updatePlayer() {
  if (menuOpen || gameOver || won) return;

  if (player.deathTimer > 0) {
    player.vy = Math.min(MAX_FALL, player.vy + GRAVITY);
    player.x = clamp(player.x + player.vx, 0, level.width - player.w);
    player.y += player.vy;
    player.deathTimer -= 1;
    if (player.deathTimer <= 0) finishPlayerDeath();
    return;
  }

  if (player.shootCooldown > 0) {
    player.lastShootCooldown = player.shootCooldown;
    player.shootCooldown -= 1;
    if (player.hasShotgun && player.shootCooldown === SHOTGUN_READY_COOLDOWN && player.lastShootCooldown > SHOTGUN_READY_COOLDOWN) {
      playSfx("carrot");
    }
    if (level.boss) updateHud();
  }
  if (player.dryFireCooldown > 0) player.dryFireCooldown -= 1;
  if (carrotComboTimer > 0) {
    carrotComboTimer -= 1;
  } else if (carrotComboCount > 0) {
    carrotComboCount = 0;
  }
  if (player.turboTimer > 0) {
    player.turboTimer -= 1;
    if (!player.turboWarningGiven && player.turboTimer > 0 && player.turboTimer <= TURBO_END_WARNING_TIME) {
      player.turboWarningGiven = true;
      playSfx("carrot");
      say("Kani: Turbo hiipuu!", 75);
    }
    updateHud();
  }

  const moving = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const currentSpeed = currentMoveSpeed();
  player.vx = moving * currentSpeed;
  if (moving !== 0) player.facing = moving;

  if (player.jumpBuffer > 0) player.jumpBuffer -= 1;
  if (player.grounded) player.coyoteTimer = COYOTE_TIME;
  if (!player.grounded && player.coyoteTimer > 0) player.coyoteTimer -= 1;

  if (keys.shoot) {
    fireShotgun();
  }

  applyPlayerGravity();
  applyCurrentWater();
  applyWindZones();
  player.x = clamp(player.x + player.vx, 0, level.width - player.w);
  player.y += player.vy;
  player.grounded = false;

  for (const platform of solidPlatforms()) {
    if (!rectsOverlap(player, platform)) continue;

    const previousBottom = player.y + player.h - player.vy;
    const landedOnTop = player.vy >= 0 && previousBottom <= platform.y + 8;
    if (platform.oneWay && !landedOnTop) continue;

    if (landedOnTop) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.coyoteTimer = COYOTE_TIME;
      if (platform.breakTimer !== undefined && platform.breakTimer <= 0) {
        platform.breakTimer = CRUMBLE_PLATFORM_BREAK_TIME;
        say("Kani: Alusta murenee!", 55);
      }
      if (platform.dx || platform.dy) {
        player.x = clamp(player.x + platform.dx, 0, level.width - player.w);
        player.y += platform.dy;
      }
    } else if (!platform.oneWay && player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
    } else if (!platform.oneWay && player.vx > 0) {
      player.x = platform.x - player.w;
    } else if (!platform.oneWay && player.vx < 0) {
      player.x = platform.x + platform.w;
    }
  }

  updateTrampolines();
  updateWaterHazards();
  updateSpikeHazards();
  updatePendulumHazards();

  if (player.jumpBuffer > 0 && player.coyoteTimer > 0) {
    player.vy = -JUMP_FORCE;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    playSfx("jump");
  }

  if (player.y > canvas.height + 80) {
    startPlayerDeath();
  }

  if (player.invincible > 0) player.invincible -= 1;
}

function updateItems() {
  if (menuOpen || gameOver || won || player.deathTimer > 0) return;

  for (const button of level.pressureButtons || []) {
    const wasActive = button.active;
    const box = { x: button.x, y: button.y - 6, w: button.w, h: button.h + 10 };
    button.active = rectsOverlap(player, box);
    if (button.active && !wasActive) {
      playSfx("click");
      say("Nappi painui. Jokin portti liikahti.", 85);
    }
  }

  if (level.weapon && !level.weapon.got && rectsOverlap(player, level.weapon)) {
    level.weapon.got = true;
    player.hasShotgun = true;
    score += 300;
    spawnScorePopup("+300 HAULIKKO", level.weapon.x + 22, level.weapon.y, "#f9f4dc");
    playSfx("gold");
    say("Kani: Tämä on varmaan puutarhatyökalu.", 150);
    updateHud();
  }

  if (level.turbo && !level.turbo.got && rectsOverlap(player, level.turbo)) {
    level.turbo.got = true;
    player.turboTimer = TURBO_TIME;
    player.turboWarningGiven = false;
    score += 250;
    spawnScorePopup("+250 TURBO", level.turbo.x + 17, level.turbo.y, "#ffcf3f");
    playSfx("turbo");
    say("Kani: Nyt mennään kuin porkkana alamäessä!", 130);
    updateHud();
  }

  for (const carrot of level.carrots) {
    if (carrot.got) continue;
    const box = { x: carrot.x, y: carrot.y, w: 22, h: 30 };
    if (rectsOverlap(player, box)) {
      carrot.got = true;
      carrotsCollected += 1;
      carrotComboCount = carrotComboTimer > 0 ? carrotComboCount + 1 : 1;
      carrotComboTimer = CARROT_COMBO_TIME;
      const comboBonus = Math.min(4, carrotComboCount - 1) * CARROT_COMBO_BONUS;
      score += 100 + comboBonus;
      spawnScorePopup(comboBonus > 0 ? `+${100 + comboBonus} COMBO` : "+100", carrot.x + 12, carrot.y, "#ffcf3f");
      playSfx("carrot");
      say("Rousk!", 40);
      updateHud();
    }
  }

  for (const carrot of level.bonusCarrots || []) {
    if (carrot.got) continue;
    const box = { x: carrot.x, y: carrot.y, w: 28, h: 34 };
    if (rectsOverlap(player, box)) {
      carrot.got = true;
      score += 750;
      if (carrotComboCount > 0) carrotComboTimer = CARROT_COMBO_TIME;
      player.invincible = Math.max(player.invincible, BONUS_CARROT_INVINCIBLE_TIME);
      spawnScorePopup("+750", carrot.x + 14, carrot.y, "#f9f4dc");
      playSfx("gold");
      say("Kani: Kultaporkkana. Verottaja ei saa tietää.", 140);
      updateHud();
    }
  }

  for (const carrot of level.starCarrots || []) {
    if (carrot.got) continue;
    const box = { x: carrot.x, y: carrot.y, w: 30, h: 30 };
    if (rectsOverlap(player, box)) {
      carrot.got = true;
      score += 1200;
      carrotComboCount = Math.max(carrotComboCount, 2);
      carrotComboTimer = CARROT_COMBO_TIME * 2;
      spawnScorePopup("+1200 STAR", carrot.x + 15, carrot.y, "#f9f4dc");
      playSfx("gold");
      say("TÃ¤htiporkkana! Kani valitsi vaikean reitin.", 125);
      updateHud();
    }
  }

  for (const key of level.keys || []) {
    if (key.got) continue;
    const box = { x: key.x, y: key.y, w: 28, h: 28 };
    if (rectsOverlap(player, box)) {
      key.got = true;
      score += 400;
      spawnScorePopup("+400 AVAIN", key.x + 14, key.y, "#76c9d1");
      playSfx("gold");
      say("Kani: Avain! Nyt portit eivÃ¤t mÃ¤Ã¤rÃ¤Ã¤ tahtia.", 130);
      updateHud();
    }
  }

  for (const checkpoint of level.checkpoints || []) {
    const box = { x: checkpoint.x, y: checkpoint.y - 44, w: 32, h: 48 };
    if (!checkpoint.active && rectsOverlap(player, box)) {
      (level.checkpoints || []).forEach((entry) => {
        entry.active = false;
      });
      checkpoint.active = true;
      player.respawnX = checkpoint.x;
      player.respawnY = checkpoint.y - player.h;
      player.respawnFacing = player.facing;
      player.invincible = Math.max(player.invincible, CHECKPOINT_INVINCIBLE_TIME);
      score += CHECKPOINT_SCORE_BONUS;
      spawnScorePopup(`+${CHECKPOINT_SCORE_BONUS} CHECK`, checkpoint.x + 16, checkpoint.y - 44, "#f9f4dc");
      playSfx("win");
      say("Checkpoint! Kani merkitsi reviirin.", 100);
      updateHud();
    }
  }

  if (!level.boss && !level.goalAnnounced && carrotsCollected === level.carrots.length) {
    level.goalAnnounced = true;
    player.turboTimer = Math.max(player.turboTimer, GOAL_SPRINT_TIME);
    player.turboWarningGiven = false;
    playSfx("win");
    say("Kaikki porkkanat! Maali aukesi.", 110);
    updateHud();
  }

  if (!level.boss && carrotsCollected === level.carrots.length && player.x > level.width - 180) {
    advanceLevel();
  }
}

function updateEnemies() {
  if (menuOpen || won) return;

  for (const enemy of level.enemies) {
    if (enemy.dead) {
      if (enemy.deathTimer > 0) enemy.deathTimer -= 1;
      continue;
    }

    if (gameOver || player.deathTimer > 0) continue;

    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x < enemy.min || enemy.x > enemy.max) enemy.dir *= -1;
    if (enemy.type === "seagull") {
      enemy.phase += 0.045;
      enemy.y = enemy.startY + Math.sin(enemy.phase) * enemy.amp;
    }

    const box = enemyBox(enemy);
    if (player.invincible <= 0 && rectsOverlap(player, box)) {
      const previousBottom = player.y + player.h - player.vy;
      const wasAbove = previousBottom <= enemy.y + ENEMY_STOMP_GRACE;
      if (wasAbove && player.vy > 0) {
        enemy.dead = true;
        enemy.deathTimer = ENEMY_DEATH_TIME;
        player.vy = -(enemy.type === "seagull" ? SEAGULL_STOMP_BOUNCE : HEDGEHOG_STOMP_BOUNCE);
        player.invincible = Math.max(player.invincible, STOMP_INVINCIBLE_TIME);
        score += enemy.type === "seagull" ? 220 : 150;
        spawnScorePopup(enemy.type === "seagull" ? "+220" : "+150", enemy.x + 20, enemy.y, "#ffcf3f");
        playSfx("hit");
        message = enemy.type === "seagull" ? "Lokin lento loppui lyhyeen" : "Siili pomppasi hämmästyksestä";
        messageTimer = 70;
        updateHud();
      } else {
        startPlayerDeath();
      }
    }
  }
}

function updateShots() {
  if (menuOpen || gameOver || won) return;

  const boss = level.boss;
  const box = bossBox();
  for (const shot of shots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.life -= 1;
    const shotBox = { x: shot.x, y: shot.y, w: 8, h: 5 };

    for (const wall of level.breakableWalls || []) {
      if (wall.destroyed || shot.hit || !rectsOverlap(shotBox, wall)) continue;
      shot.hit = true;
      shot.life = 0;
      wall.hp = Math.max(0, (wall.hp || wall.maxHp || 2) - 1);
      wall.hitTimer = 12;
      playSfx("hit");
      if (wall.hp <= 0) {
        wall.destroyed = true;
        score += 90;
        spawnScorePopup("+90", wall.x + wall.w / 2, wall.y, "#ffcf3f");
        say("SeinÃ¤ murtui!", 75);
        updateHud();
      } else {
        spawnScorePopup("RASA", wall.x + wall.w / 2, wall.y, "#c9d4d6");
      }
    }

    if (box && !shot.hit && rectsOverlap(shotBox, box)) {
      shot.hit = true;
      shot.life = 0;
      boss.hp -= 1;
      boss.hitTimer = 12;
      staggerBossAttack(boss);
      score += 35;
      spawnScorePopup("+35", shot.x, shot.y, "#ffcf3f");
      playSfx("hit");
      updateHud();
      if (boss.hp <= 0) {
        boss.defeated = true;
        score += 1000;
        spawnScorePopup("+1000", boss.x + boss.w / 2, boss.y, "#f9f4dc");
        playSfx("win");
        message = "Jättilokki luovutti pesänsä!";
        messageTimer = 150;
        updateHud();
      }
    }
  }
  (level.breakableWalls || []).forEach((wall) => {
    if (wall.hitTimer > 0) wall.hitTimer -= 1;
  });
  shots = shots.filter((shot) => shot.life > 0 && shot.x > cameraX - 80 && shot.x < cameraX + canvas.width + 80);
}

function staggerBossAttack(boss) {
  boss.attackTimer = Math.min(
    boss.attackTimer + BOSS_HIT_STAGGER_TIME,
    BOSS_MAX_STAGGERED_ATTACK_TIMER,
  );
}

function spawnBossAttack() {
  const boss = level.boss;
  if (!boss || boss.defeated) return;

  if (boss.attackType === "fish") {
    playSfx("bossAttack");
    for (let i = 0; i < 4; i += 1) {
      bossAttacks.push({
        type: "fish",
        x: 620 + i * 210 + Math.sin(boss.phase + i) * 45,
        y: 42,
        vx: 0,
        vy: 1.8 + i * 0.18,
        life: 190,
      });
    }
    say("Pomo: Sardiinisade alkaa nyt!", 95);
    boss.attackType = "feather";
    boss.attackTimer = boss.enraged ? 78 : 125;
    return;
  }

  const fromRight = boss.x > player.x;
  playSfx("bossAttack");
  for (let i = 0; i < 5; i += 1) {
    bossAttacks.push({
      type: "feather",
      x: fromRight ? boss.x + 18 : boss.x + boss.w - 18,
      y: boss.y + 25 + i * 14,
      vx: fromRight ? -4.7 : 4.7,
      vy: (i - 2) * 0.18,
      life: 125,
    });
  }
  say("Kani: Tuo lokki on selvästi draamakoulutettu.", 115);
  boss.attackType = "fish";
  boss.attackTimer = boss.enraged ? 58 : 95;
}

function updateBossAttacks() {
  if (menuOpen || won || gameOver) return;

  for (const attack of bossAttacks) {
    if (attack.type === "fish") attack.vy += 0.12;
    attack.x += attack.vx;
    attack.y += attack.vy;
    attack.life -= 1;

    const box = attack.type === "fish"
      ? { x: attack.x, y: attack.y, w: 24, h: 18 }
      : { x: attack.x, y: attack.y, w: 28, h: 9 };
    if (player.invincible <= 0 && player.deathTimer <= 0 && rectsOverlap(player, box)) {
      attack.life = 0;
      startPlayerDeath();
    }
  }

  bossAttacks = bossAttacks.filter((attack) => (
    attack.life > 0 &&
    attack.y < canvas.height + 80 &&
    attack.x > cameraX - 140 &&
    attack.x < cameraX + canvas.width + 140
  ));
}

function updateBoss() {
  const boss = level.boss;
  if (menuOpen || !boss || won || gameOver) return;

  if (boss.defeated) {
    boss.y = Math.min(430, boss.y + 2);
    if (player.x > level.width - 180) {
      advanceLevel();
    }
    return;
  }

  if (!boss.enraged && boss.hp <= boss.maxHp / 2) {
    boss.enraged = true;
    bossAttacks = [];
    boss.attackTimer = Math.min(boss.attackTimer, 45);
    say("Pomo: Nyt meni höyhenet vinoon!", 115);
  }

  const bossSpeed = boss.enraged ? 1.78 : 1.25;
  const bossWave = boss.enraged ? 42 : 28;
  boss.phase += 0.035;
  boss.y = boss.baseY + Math.round(Math.sin(boss.phase) * bossWave);
  boss.x += boss.dir * bossSpeed;
  if (boss.x < (boss.minX || 1030) || boss.x > (boss.maxX || 1380)) boss.dir *= -1;
  if (boss.hitTimer > 0) boss.hitTimer -= 1;
  if (boss.attackTimer > 0) boss.attackTimer -= 1;
  if (boss.attackTimer <= 0) spawnBossAttack();

  const box = bossBox();
  if (box && player.invincible <= 0 && player.deathTimer <= 0 && rectsOverlap(player, box)) {
    const stomped = player.y + player.h - player.vy <= boss.y + 16 && player.vy > 0;
    if (stomped) {
      player.vy = -BOSS_STOMP_BOUNCE;
      player.invincible = Math.max(player.invincible, STOMP_INVINCIBLE_TIME);
      boss.hp -= 1;
      boss.hitTimer = 16;
      staggerBossAttack(boss);
      score += 50;
      spawnScorePopup("+50", boss.x + boss.w / 2, boss.y, "#ffcf3f");
      playSfx("hit");
      if (boss.hp <= 0) {
        boss.defeated = true;
        playSfx("win");
        message = "Jättilokki luovutti pesänsä!";
        messageTimer = 150;
      }
      updateHud();
    } else {
      startPlayerDeath();
    }
  }
}

function cameraTargetX() {
  const lookAhead = Math.abs(player.vx) > 0.1 ? player.facing * CAMERA_LOOKAHEAD : 0;
  let hintLookX = 0;
  for (const hint of level.cameraHints || []) {
    if (rectsOverlap(player, hint)) {
      hintLookX = hint.lookX || 0;
      break;
    }
  }
  return sideScrollerCameraTargetX({
    subject: player,
    levelWidth: level.width,
    viewportWidth: canvas.width,
    lookAhead,
    hintLookX,
  });
}

function snapCameraToPlayer() {
  cameraX = snapCameraX(cameraTargetX());
}

function updateCamera() {
  cameraX = smoothCameraX(cameraX, cameraTargetX(), CAMERA_SMOOTHING);
}

function drawPixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function wrapParallax(x, width) {
  return ((x % width) + width) % width;
}

function drawCloud(x, y, scale = 1, color = "#f6f2d6") {
  drawPixelRect(x, y, 44 * scale, 18 * scale, color);
  drawPixelRect(x + 20 * scale, y - 12 * scale, 44 * scale, 18 * scale, color);
  drawPixelRect(x + 58 * scale, y, 36 * scale, 18 * scale, color);
}

function drawCloudLayer(speed, yBase, color, scale = 1) {
  for (let i = 0; i < 14; i += 1) {
    const x = wrapParallax(i * 210 - cameraX * speed, 1400) - 120;
    const y = yBase + (i % 4) * 30;
    drawCloud(x, y, scale, color);
  }
}

function drawHillLayer(speed, baseY, color, step, height) {
  for (let i = -1; i < 10; i += 1) {
    const x = wrapParallax(i * step - cameraX * speed, step * 9) - step;
    drawPixelRect(x, baseY + 44, step + 30, canvas.height - baseY, color);
    drawPixelRect(x + 38, baseY + 18, step - 38, 34, color);
    drawPixelRect(x + 82, baseY, step - 112, height, color);
  }
}

function drawTreeLayer(speed, baseY, trunk, leaves) {
  for (let i = -1; i < 18; i += 1) {
    const x = wrapParallax(i * 140 - cameraX * speed, 2520) - 160;
    const h = 62 + (i % 4) * 18;
    drawPixelRect(x + 34, baseY - h + 36, 18, h, trunk);
    drawPixelRect(x + 4, baseY - h, 76, 42, "#111018");
    drawPixelRect(x + 9, baseY - h + 5, 66, 32, leaves);
    drawPixelRect(x + 20, baseY - h - 18, 42, 26, leaves);
  }
}

function drawWaveLayer(speed, y, color) {
  drawPixelRect(0, y + 18, canvas.width, canvas.height - y, color);
  for (let i = -1; i < 18; i += 1) {
    const x = wrapParallax(i * 92 - cameraX * speed, 1656) - 120;
    drawPixelRect(x, y + (i % 2) * 5, 54, 6, "#76c9d1");
    drawPixelRect(x + 36, y + 11, 48, 5, "#f6f2d6");
  }
}

function drawLighthouse(x, y, scale = 1) {
  drawPixelRect(x, y, 72 * scale, 160 * scale, "#111018");
  drawPixelRect(x + 12 * scale, y + 20 * scale, 48 * scale, 140 * scale, "#f9f4dc");
  drawPixelRect(x + 6 * scale, y + 52 * scale, 60 * scale, 14 * scale, "#e85b52");
  drawPixelRect(x + 6 * scale, y + 92 * scale, 60 * scale, 14 * scale, "#e85b52");
  drawPixelRect(x - 8 * scale, y, 88 * scale, 24 * scale, "#111018");
  drawPixelRect(x + 8 * scale, y + 5 * scale, 56 * scale, 14 * scale, "#ffcf3f");
}

function drawCanyonLayer(speed, color, yOffset) {
  for (let i = -1; i < 12; i += 1) {
    const x = wrapParallax(i * 180 - cameraX * speed, 2160) - 210;
    const h = 170 + (i % 5) * 32;
    drawPixelRect(x, yOffset + canvas.height - h, 124, h, color);
    drawPixelRect(x + 68, yOffset + canvas.height - h + 44, 94, h - 44, color);
    drawPixelRect(x + 22, yOffset + canvas.height - h + 28, 36, 8, "#5f3d2a");
  }
}

function drawSky() {
  const theme = level.background || ["meadow", "coast", "boss", "forest", "marsh", "lighthouse", "canyon", "final"][currentLevelIndex] || "meadow";
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (theme === "boss" || theme === "final") {
    gradient.addColorStop(0, theme === "final" ? "#3c2548" : "#415070");
    gradient.addColorStop(0.58, theme === "final" ? "#8d3c58" : "#6f718b");
    gradient.addColorStop(1, "#4b8f3d");
  } else if (theme === "canyon") {
    gradient.addColorStop(0, "#78d5e0");
    gradient.addColorStop(0.62, "#f3b56b");
    gradient.addColorStop(1, "#b66a45");
  } else if (theme === "coast" || theme === "lighthouse") {
    gradient.addColorStop(0, "#78d5e0");
    gradient.addColorStop(0.58, "#c9f0e7");
    gradient.addColorStop(1, "#2677b8");
  } else if (theme === "forest" || theme === "marsh") {
    gradient.addColorStop(0, "#6db9c2");
    gradient.addColorStop(0.62, "#8dcf75");
    gradient.addColorStop(1, "#3f7c50");
  } else {
    gradient.addColorStop(0, "#78d5e0");
    gradient.addColorStop(0.72, "#b6e77c");
    gradient.addColorStop(1, "#7cc25a");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloudLayer(0.12, 42, theme === "final" ? "#c9d4d6" : "#f6f2d6", theme === "boss" ? 0.8 : 1);

  if (theme === "coast" || theme === "lighthouse") {
    drawWaveLayer(0.18, 355, "#2677b8");
    drawHillLayer(0.08, 270, "#6aa45f", 260, 46);
    if (theme === "lighthouse") drawLighthouse(650 - cameraX * 0.16, 168, 0.9);
  } else if (theme === "forest" || theme === "marsh") {
    drawHillLayer(0.07, 270, "#5f9f58", 240, 52);
    drawTreeLayer(0.18, 430, "#5f3d2a", theme === "marsh" ? "#3f7c50" : "#4b8f3d");
    drawTreeLayer(0.34, 465, "#5f3d2a", theme === "marsh" ? "#2f6847" : "#3d7937");
  } else if (theme === "canyon") {
    drawCanyonLayer(0.08, "#b66a45", 12);
    drawCanyonLayer(0.22, "#80583a", 44);
    drawCloudLayer(0.32, 118, "#f6d49a", 0.7);
  } else if (theme === "boss" || theme === "final") {
    drawHillLayer(0.08, 290, theme === "final" ? "#5f3d2a" : "#4d4a52", 260, 42);
    drawTreeLayer(0.2, 455, "#3c3548", theme === "final" ? "#8d3c58" : "#5f627c");
    if (theme === "final") {
      drawPixelRect(90 - cameraX * 0.1, 78, 54, 54, "#ffcf3f");
      drawPixelRect(102 - cameraX * 0.1, 92, 30, 30, "#f28d35");
    }
  } else {
    drawHillLayer(0.08, 285, "#69b84f", 250, 44);
    drawHillLayer(0.2, 335, "#4b8f3d", 210, 40);
  }

  for (let i = -1; i < 22; i += 1) {
    const x = wrapParallax(i * 74 - cameraX * 0.75, 1628) - 90;
    drawPixelRect(x, 486, 28, 14, "#3f7c50");
    drawPixelRect(x + 12, 476, 8, 24, "#69b84f");
  }
}

function drawPlatform(platform) {
  const x = platform.x - cameraX;
  drawPixelRect(x, platform.y, platform.w, platform.h, "#111018");
  drawPixelRect(x + 4, platform.y + 4, platform.w - 8, platform.h - 4, "#80583a");
  drawPixelRect(x + 4, platform.y + 4, platform.w - 8, 8, "#69b84f");

  for (let px = x + 10; px < x + platform.w - 8; px += 34) {
    drawPixelRect(px, platform.y + 19, 14, 4, "#5f3d2a");
  }
}

function drawMovingPlatform(platform) {
  const x = Math.round(platform.x) - cameraX;
  const y = Math.round(platform.y);
  const arrowX = x + Math.round(platform.w / 2) - 5;
  const arrowY = y - 17;
  if (editorEnabled && platform.points && platform.points.length > 1) {
    for (let i = 0; i < platform.points.length; i += 1) {
      const point = platform.points[i];
      const next = platform.points[(i + 1) % platform.points.length];
      const startX = Math.round(point.x) - cameraX;
      const startY = Math.round(point.y);
      const endX = Math.round(next.x) - cameraX;
      const endY = Math.round(next.y);
      const steps = Math.max(1, Math.ceil(Math.hypot(endX - startX, endY - startY) / 18));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        drawPixelRect(startX + (endX - startX) * t - 2, startY + (endY - startY) * t - 2, 4, 4, "#ffcf3f");
      }
      drawPixelRect(startX - 5, startY - 5, 10, 10, "#111018");
      drawPixelRect(startX - 2, startY - 2, 4, 4, "#76c9d1");
    }
  }
  drawPixelRect(x, y, platform.w, platform.h, "#111018");
  drawPixelRect(x + 4, y + 4, platform.w - 8, platform.h - 8, "#4d4a52");
  drawPixelRect(x + 12, y + 9, platform.w - 24, 4, "#c9d4d6");
  drawPixelRect(x + 8, y - 8, 10, 8, "#111018");
  drawPixelRect(x + platform.w - 18, y - 8, 10, 8, "#111018");
  if (platform.points && platform.points.length > 1) {
    drawPixelRect(arrowX, arrowY + 1, 10, 10, "#111018");
    drawPixelRect(arrowX + 3, arrowY + 4, 4, 4, "#ffcf3f");
  } else if (platform.axis === "y") {
    drawPixelRect(arrowX, arrowY, 10, 10, "#111018");
    drawPixelRect(arrowX + 3, arrowY + (platform.dir > 0 ? 6 : 0), 4, 4, "#ffcf3f");
  } else {
    drawPixelRect(arrowX, arrowY + 3, 10, 6, "#111018");
    drawPixelRect(arrowX + (platform.dir > 0 ? 6 : 0), arrowY + 4, 4, 4, "#ffcf3f");
  }
}

function drawCrumblePlatform(platform) {
  if (platform.respawnTimer > 0 && Math.floor(platform.respawnTimer / 10) % 2 === 0) return;
  const x = Math.round(platform.x) - cameraX;
  const y = Math.round(platform.y);
  const warning = platform.breakTimer > 0;
  drawPixelRect(x, y, platform.w, platform.h, "#111018");
  drawPixelRect(x + 4, y + 4, platform.w - 8, platform.h - 8, warning ? "#b7774a" : "#80583a");
  drawPixelRect(x + 4, y + 4, platform.w - 8, 7, warning ? "#ffcf3f" : "#d0a35b");
  for (let px = x + 14; px < x + platform.w - 12; px += 38) {
    const crackDrop = warning ? 4 : 0;
    drawPixelRect(px, y + 12, 5, 6 + crackDrop, "#5f3d2a");
    drawPixelRect(px + 5, y + 17 + crackDrop, 10, 4, "#5f3d2a");
  }
}

function drawBreakableWall(wall) {
  if (wall.destroyed) return;
  const x = Math.round(wall.x) - cameraX;
  const y = Math.round(wall.y);
  const hp = wall.hp || wall.maxHp || 2;
  const damaged = hp < (wall.maxHp || 2);
  const shake = wall.hitTimer > 0 ? (wall.hitTimer % 2 === 0 ? 2 : -2) : 0;
  drawPixelRect(x + shake, y, wall.w, wall.h, "#111018");
  drawPixelRect(x + 4 + shake, y + 4, wall.w - 8, wall.h - 8, damaged ? "#7e3d48" : "#80583a");
  for (let py = y + 10; py < y + wall.h - 8; py += 18) {
    const rowOffset = Math.floor((py - y) / 18) % 2 === 0 ? 0 : 16;
    for (let px = x + 8 + rowOffset; px < x + wall.w - 10; px += 32) {
      drawPixelRect(px + shake, py, 18, 5, "#5f3d2a");
    }
  }
  if (damaged) {
    drawPixelRect(x + wall.w / 2 - 3 + shake, y + 10, 5, wall.h - 18, "#111018");
    drawPixelRect(x + wall.w / 2 + 2 + shake, y + wall.h / 2, 18, 5, "#111018");
  }
}

function drawOneWayPlatform(platform) {
  const x = Math.round(platform.x) - cameraX;
  const y = Math.round(platform.y);
  drawPixelRect(x, y, platform.w, platform.h, "#111018");
  drawPixelRect(x + 4, y + 4, platform.w - 8, Math.max(4, platform.h - 8), "#476e8f");
  drawPixelRect(x + 4, y + 4, platform.w - 8, 4, "#76c9d1");
  for (let px = x + 18; px < x + platform.w - 14; px += 34) {
    drawPixelRect(px, y - 8, 10, 4, "#111018");
    drawPixelRect(px + 3, y - 12, 4, 4, "#76c9d1");
    drawPixelRect(px + 3, y - 8, 4, 8, "#76c9d1");
  }
}

function drawWater(water, tick) {
  const x = Math.round(water.x) - cameraX;
  const y = Math.round(water.y);
  drawPixelRect(x, y, water.w, water.h, "#111018");
  drawPixelRect(x + 3, y + 5, water.w - 6, water.h - 8, "#2677b8");
  for (let px = x + 8; px < x + water.w - 12; px += 30) {
    const wave = Math.floor(tick / 180 + px) % 2 === 0 ? 0 : 4;
    drawPixelRect(px, y + 8 + wave, 16, 4, "#76c9d1");
  }
}

function drawCurrentWater(current, tick) {
  const x = Math.round(current.x) - cameraX;
  const y = Math.round(current.y);
  const forceX = current.forceX || 0;
  const forceY = current.forceY || 0;
  drawPixelRect(x, y, current.w, current.h, "#111018");
  drawPixelRect(x + 3, y + 5, current.w - 6, current.h - 8, "#245e9d");
  for (let px = x + 10; px < x + current.w - 12; px += 32) {
    const drift = Math.round(((tick / 90 + px) % 12) * Math.sign(forceX || 1));
    const arrowX = px + drift;
    const arrowY = y + 10 + (Math.floor((px - x) / 32) % 2) * 9;
    drawPixelRect(arrowX, arrowY, 18, 4, "#76c9d1");
    if (Math.abs(forceY) > Math.abs(forceX)) {
      drawPixelRect(arrowX + 7, arrowY + (forceY > 0 ? 4 : -6), 4, 8, "#f9f4dc");
    } else if (forceX < 0) {
      drawPixelRect(arrowX - 4, arrowY - 2, 6, 8, "#f9f4dc");
    } else {
      drawPixelRect(arrowX + 16, arrowY - 2, 6, 8, "#f9f4dc");
    }
  }
}

function drawWindZone(zone, tick) {
  const x = Math.round(zone.x) - cameraX;
  const y = Math.round(zone.y);
  const forceX = zone.forceX || 0;
  const forceY = zone.forceY || 0;
  drawPixelRect(x, y, zone.w, zone.h, "rgba(118, 201, 209, 0.16)");
  for (let px = x + 12; px < x + zone.w - 8; px += 34) {
    const drift = Math.round(Math.sin(tick / 180 + px) * 3);
    const arrowX = px + drift;
    const arrowY = y + Math.floor(zone.h / 2) - 3;
    drawPixelRect(arrowX, arrowY, 20, 4, "#76c9d1");
    if (Math.abs(forceY) > Math.abs(forceX)) {
      drawPixelRect(arrowX + 8, arrowY + (forceY > 0 ? 4 : -6), 4, 8, "#f9f4dc");
    } else if (forceX < 0) {
      drawPixelRect(arrowX - 4, arrowY - 2, 6, 8, "#f9f4dc");
    } else {
      drawPixelRect(arrowX + 18, arrowY - 2, 6, 8, "#f9f4dc");
    }
  }
}

function drawSpikes(spike) {
  const x = Math.round(spike.x) - cameraX;
  const y = Math.round(spike.y);
  const toothWidth = 20;
  drawPixelRect(x, y + spike.h - 5, spike.w, 5, "#111018");
  for (let px = 0; px < spike.w; px += toothWidth) {
    const left = x + px;
    const width = Math.min(toothWidth, spike.w - px);
    const center = left + Math.floor(width / 2);
    drawPixelRect(center - 2, y, 4, spike.h, "#111018");
    drawPixelRect(center - 6, y + 6, 12, spike.h - 6, "#c9d4d6");
    drawPixelRect(center - 3, y + 3, 6, 5, "#f9f4dc");
  }
}

function drawPendulum(pendulum) {
  const bob = pendulumBob(pendulum);
  const anchorX = Math.round(pendulum.x) - cameraX;
  const anchorY = Math.round(pendulum.y);
  const bobX = Math.round(bob.x) - cameraX;
  const bobY = Math.round(bob.y);
  const steps = 6;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const chainX = Math.round(anchorX + (bobX - anchorX) * t);
    const chainY = Math.round(anchorY + (bobY - anchorY) * t);
    drawPixelRect(chainX - 2, chainY - 2, 4, 4, "#111018");
    drawPixelRect(chainX - 1, chainY - 1, 2, 2, "#c9d4d6");
  }
  drawPixelRect(anchorX - 8, anchorY - 8, 16, 16, "#111018");
  drawPixelRect(anchorX - 4, anchorY - 4, 8, 8, "#80583a");
  drawPixelRect(bobX - bob.radius, bobY - bob.radius, bob.radius * 2, bob.radius * 2, "#111018");
  drawPixelRect(bobX - bob.radius + 4, bobY - bob.radius + 4, bob.radius * 2 - 8, bob.radius * 2 - 8, "#7e3d48");
  drawPixelRect(bobX - 5, bobY - bob.radius + 6, 10, 5, "#e85b52");
  drawPixelRect(bobX - bob.radius - 5, bobY - 2, 5, 4, "#ffcf3f");
  drawPixelRect(bobX + bob.radius, bobY - 2, 5, 4, "#ffcf3f");
}

function drawTrampoline(trampoline, tick) {
  const x = Math.round(trampoline.x) - cameraX;
  const y = Math.round(trampoline.y);
  const squash = trampoline.springTimer > 0 ? 5 : 0;
  const playerCenterX = player.x + player.w / 2;
  const trampolineCenterX = trampoline.x + trampoline.w / 2;
  const playerNear = Math.abs(playerCenterX - trampolineCenterX) < TRAMPOLINE_HINT_DISTANCE && player.y + player.h < trampoline.y + 48;
  const showHoldHint = playerNear || (keys.jump && Math.abs(playerCenterX - trampolineCenterX) < TRAMPOLINE_HINT_DISTANCE * 1.4);
  drawPixelRect(x, y + squash, trampoline.w, trampoline.h - squash, "#111018");
  drawPixelRect(x + 5, y + 3 + squash, trampoline.w - 10, 7, "#e85b52");
  drawPixelRect(x + 9, y + 10 + squash, 8, 8, "#c9d4d6");
  drawPixelRect(x + trampoline.w - 17, y + 10 + squash, 8, 8, "#c9d4d6");
  if (showHoldHint) {
    const bob = Math.round(Math.sin(tick / 150 + trampoline.x) * 2);
    const color = keys.jump ? "#ffcf3f" : "#f9f4dc";
    drawPixelRect(x + trampoline.w / 2 - 2, y - 16 + bob, 4, 4, color);
    drawPixelRect(x + trampoline.w / 2 - 6, y - 12 + bob, 12, 4, color);
    drawPixelRect(x + trampoline.w / 2 - 10, y - 8 + bob, 20, 4, color);
  }
}

function drawCheckpoint(checkpoint, tick) {
  const x = Math.round(checkpoint.x) - cameraX;
  const y = Math.round(checkpoint.y);
  const playerCenterX = player.x + player.w / 2;
  const checkpointCenterX = checkpoint.x + 16;
  const playerNear = !checkpoint.active && Math.abs(playerCenterX - checkpointCenterX) < CHECKPOINT_HINT_DISTANCE;
  if (playerNear) {
    const pulse = Math.floor(tick / 180) % 2 === 0 ? "#f9f4dc" : "#ffcf3f";
    drawPixelRect(x - 4, y - 52, 4, 56, pulse);
    drawPixelRect(x - 4, y - 52, 40, 4, pulse);
    drawPixelRect(x + 32, y - 52, 4, 56, pulse);
    drawPixelRect(x - 4, y, 40, 4, pulse);
  }
  drawPixelRect(x, y - 48, 8, 48, "#111018");
  drawPixelRect(x + 8, y - 46, 48, 30, "#111018");
  drawPixelRect(x + 12, y - 42, 40, 22, checkpoint.active ? "#ffcf3f" : "#c9d4d6");
  drawPixelRect(x + 24, y - 37, 16, 11, "#f28d35");
  drawPixelRect(x + 39, y - 42, 6, 7, "#5bbd50");
}

function drawCarrot(carrot, tick) {
  if (carrot.got) return;
  const bob = Math.round(Math.sin(tick / 220 + carrot.x) * 3);
  const x = Math.round(carrot.x) - cameraX;
  const y = Math.round(carrot.y) + bob;
  drawPixelRect(x + 8, y - 8, 6, 10, "#5bbd50");
  drawPixelRect(x + 14, y - 12, 6, 14, "#4aa747");
  drawPixelRect(x + 6, y, 18, 26, "#111018");
  drawPixelRect(x + 10, y + 3, 14, 20, "#f28d35");
  drawPixelRect(x + 14, y + 23, 6, 5, "#f28d35");
  drawPixelRect(x + 12, y + 9, 9, 4, "#ffd06b");
}

function drawBonusCarrot(carrot, tick) {
  if (carrot.got) return;
  const bob = Math.round(Math.sin(tick / 180 + carrot.x) * 4);
  const x = Math.round(carrot.x) - cameraX;
  const y = Math.round(carrot.y) + bob;
  drawPixelRect(x + 4, y - 8, 26, 38, "#111018");
  drawPixelRect(x + 12, y - 16, 6, 12, "#5bbd50");
  drawPixelRect(x + 18, y - 14, 6, 10, "#4aa747");
  drawPixelRect(x + 8, y, 19, 25, "#ffcf3f");
  drawPixelRect(x + 12, y + 4, 13, 5, "#f9f4dc");
  drawPixelRect(x + 14, y + 23, 7, 5, "#ffcf3f");
}

function drawStarCarrot(carrot, tick) {
  if (carrot.got) return;
  const bob = Math.round(Math.sin(tick / 150 + carrot.x) * 5);
  const x = Math.round(carrot.x) - cameraX;
  const y = Math.round(carrot.y) + bob;
  drawPixelRect(x + 5, y + 5, 24, 24, "#111018");
  drawPixelRect(x + 15, y - 2, 4, 34, "#111018");
  drawPixelRect(x - 1, y + 15, 36, 4, "#111018");
  drawPixelRect(x + 13, y, 8, 30, "#ffcf3f");
  drawPixelRect(x + 2, y + 13, 30, 8, "#ffcf3f");
  drawPixelRect(x + 8, y + 8, 18, 18, "#f9f4dc");
  drawPixelRect(x + 13, y + 13, 8, 8, "#f28d35");
}

function drawKey(key, tick) {
  if (key.got) return;
  const bob = Math.round(Math.sin(tick / 190 + key.x) * 4);
  const x = Math.round(key.x) - cameraX;
  const y = Math.round(key.y) + bob;
  const color = channelColor(key);
  drawPixelRect(x + 2, y + 6, 24, 20, "#111018");
  drawPixelRect(x + 6, y + 10, 10, 10, color);
  drawPixelRect(x + 9, y + 13, 4, 4, "#111018");
  drawPixelRect(x + 16, y + 14, 14, 5, "#ffcf3f");
  drawPixelRect(x + 24, y + 19, 4, 6, "#ffcf3f");
  drawPixelRect(x + 6, y + 8, 8, 3, "#f9f4dc");
}

function drawLockedGate(gate) {
  const x = Math.round(gate.x) - cameraX;
  const y = Math.round(gate.y);
  const color = channelColor(gate);
  const open = hasGateKey(gateChannel(gate));
  drawPixelRect(x, y, gate.w, gate.h, open ? "rgba(118, 201, 209, 0.22)" : "#111018");
  if (open) {
    drawPixelRect(x + 4, y + 4, gate.w - 8, 4, color);
    drawPixelRect(x + 4, y + gate.h - 8, gate.w - 8, 4, color);
    return;
  }
  drawPixelRect(x + 5, y + 5, gate.w - 10, gate.h - 10, "#476e8f");
  for (let px = x + 9; px < x + gate.w - 8; px += 16) {
    drawPixelRect(px, y + 6, 6, gate.h - 12, color);
  }
  drawPixelRect(x + Math.round(gate.w / 2) - 8, y + Math.round(gate.h / 2) - 8, 16, 18, "#111018");
  drawPixelRect(x + Math.round(gate.w / 2) - 4, y + Math.round(gate.h / 2) - 3, 8, 8, "#ffcf3f");
}

function drawPressureButton(button) {
  const x = Math.round(button.x) - cameraX;
  const y = Math.round(button.y);
  const pressed = button.active;
  const color = channelColor(button);
  drawPixelRect(x, y + (pressed ? 4 : 0), button.w, Math.max(8, button.h - (pressed ? 4 : 0)), "#111018");
  drawPixelRect(x + 4, y + 4 + (pressed ? 4 : 0), button.w - 8, Math.max(4, button.h - 8), pressed ? "#ffcf3f" : color);
  drawPixelRect(x + 10, y + 7 + (pressed ? 4 : 0), button.w - 20, 4, "#f9f4dc");
}

function drawButtonGate(gate) {
  const x = Math.round(gate.x) - cameraX;
  const y = Math.round(gate.y);
  const color = channelColor(gate);
  const open = hasActivePressureButton(gateChannel(gate));
  drawPixelRect(x, y, gate.w, gate.h, open ? "rgba(255, 207, 63, 0.18)" : "#111018");
  if (open) {
    drawPixelRect(x + 4, y + 4, 4, gate.h - 8, color);
    drawPixelRect(x + gate.w - 8, y + 4, 4, gate.h - 8, color);
    return;
  }
  drawPixelRect(x + 5, y + 5, gate.w - 10, gate.h - 10, "#7e3d48");
  for (let py = y + 12; py < y + gate.h - 8; py += 18) {
    drawPixelRect(x + 8, py, gate.w - 16, 5, color);
  }
  drawPixelRect(x + Math.round(gate.w / 2) - 7, y + 8, 14, 9, "#ffcf3f");
}

function drawWeapon() {
  if (!level.weapon || level.weapon.got) return;
  const x = Math.round(level.weapon.x) - cameraX;
  const y = Math.round(level.weapon.y);
  drawPixelRect(x - 4, y - 10, 52, 32, "#111018");
  drawPixelRect(x + 2, y + 1, 34, 7, "#4d4a52");
  drawPixelRect(x + 30, y - 2, 15, 5, "#c9d4d6");
  drawPixelRect(x + 5, y + 8, 12, 12, "#80583a");
  drawPixelRect(x + 17, y + 8, 8, 6, "#5f3d2a");
}

function drawTurbo() {
  if (!level.turbo || level.turbo.got) return;
  const x = Math.round(level.turbo.x) - cameraX;
  const y = Math.round(level.turbo.y);
  drawPixelRect(x, y, 34, 34, "#111018");
  drawPixelRect(x + 4, y + 4, 26, 26, "#ffcf3f");
  drawPixelRect(x + 13, y + 7, 9, 10, "#f9f4dc");
  drawPixelRect(x + 10, y + 16, 9, 11, "#e85b52");
  drawPixelRect(x + 20, y + 14, 5, 12, "#f28d35");
}

function drawShots() {
  for (const shot of shots) {
    const x = Math.round(shot.x) - cameraX;
    const y = Math.round(shot.y);
    drawPixelRect(x, y, 8, 5, "#111018");
    drawPixelRect(x + 2, y + 1, 4, 3, "#ffcf3f");
  }
}

function drawBossAttacks() {
  for (const attack of bossAttacks) {
    const x = Math.round(attack.x) - cameraX;
    const y = Math.round(attack.y);
    if (attack.type === "fish") {
      drawPixelRect(x, y + 5, 24, 12, "#111018");
      drawPixelRect(x + 3, y + 7, 17, 8, "#76c9d1");
      drawPixelRect(x + 19, y + 8, 6, 6, "#ffcf3f");
      drawPixelRect(x + 5, y + 9, 3, 3, "#111018");
    } else {
      drawPixelRect(x, y, 29, 9, "#111018");
      drawPixelRect(x + 3, y + 2, 22, 5, "#f9f4dc");
      drawPixelRect(x + 23, y + 3, 5, 3, "#c9d4d6");
    }
  }
}

function drawSeagull(enemy, tick) {
  const x = Math.round(enemy.x) - cameraX;
  const y = Math.round(enemy.dead ? enemy.y + 16 : enemy.y);

  if (enemy.dead) {
    const flash = Math.floor(enemy.deathTimer / 5) % 2 === 0;
    drawPixelRect(x + 5, y + 11, 38, 10, "#111018");
    drawPixelRect(x + 9, y + 12, 30, 7, flash ? "#f9f4dc" : "#c9d4d6");
    drawPixelRect(x + 1, y + 8, 15, 5, "#111018");
    drawPixelRect(x + 33, y + 8, 15, 5, "#111018");
    drawPixelRect(x + 22, y + 19, 6, 5, "#ffcf3f");
    return;
  }

  const wing = Math.floor(tick / 120) % 2 === 0 ? 0 : 6;
  drawPixelRect(x + 8, y + 16 - wing, 20, 7, "#111018");
  drawPixelRect(x + 28, y + 16 - wing, 20, 7, "#111018");
  drawPixelRect(x + 13, y + 14, 28, 18, "#111018");
  drawPixelRect(x + 17, y + 16, 22, 13, "#f9f4dc");
  drawPixelRect(x + 37, y + 19, 10, 6, "#ffcf3f");
  drawPixelRect(x + 29, y + 18, 5, 5, "#111018");
  drawPixelRect(x + 31, y + 19, 2, 2, "#f9f4dc");
  drawPixelRect(x + 18, y + 28, 6, 4, "#111018");
  drawPixelRect(x + 29, y + 28, 6, 4, "#111018");
}

function drawHedgehog(enemy, tick) {
  const x = Math.round(enemy.x) - cameraX;
  const y = Math.round(enemy.dead ? enemy.y + 18 : enemy.y);

  if (enemy.dead) {
    const flash = Math.floor(enemy.deathTimer / 5) % 2 === 0;
    drawPixelRect(x + 1, y + 8, 40, 12, "#111018");
    drawPixelRect(x + 5, y + 9, 32, 8, flash ? "#b58a69" : "#8d6b58");
    drawPixelRect(x + 4, y + 1, 5, 8, "#111018");
    drawPixelRect(x + 17, y - 3, 5, 10, "#111018");
    drawPixelRect(x + 31, y + 1, 5, 8, "#111018");
    drawPixelRect(x + 10, y + 20, 6, 4, "#111018");
    drawPixelRect(x + 27, y + 20, 6, 4, "#111018");
    return;
  }

  drawPixelRect(x, y + 12, 42, 22, "#111018");
  drawPixelRect(x + 4, y + 12, 34, 18, "#8d6b58");
  drawPixelRect(x + 8, y + 4, 4, 10, "#111018");
  drawPixelRect(x + 18, y, 4, 14, "#111018");
  drawPixelRect(x + 30, y + 5, 4, 10, "#111018");
  drawPixelRect(x + (enemy.dir > 0 ? 29 : 9), y + 17, 5, 5, "#f9f4dc");
  drawPixelRect(x + (enemy.dir > 0 ? 31 : 11), y + 19, 2, 2, "#111018");
  drawPixelRect(x + 8, y + 30, 6, 5, "#111018");
  drawPixelRect(x + 28, y + 30, 6, 5, "#111018");
}

function drawEnemy(enemy, tick) {
  if (enemy.dead && enemy.deathTimer <= 0) return;
  if (!enemy.dead) {
    const x = Math.round(enemy.x - cameraX);
    const y = Math.round(enemy.y);
    const arrowX = x + (enemy.dir > 0 ? 34 : 2);
    const blink = Math.floor(tick / 18) % 2 === 0 ? 0 : 1;
    drawPixelRect(arrowX, y - 10 - blink, 6, 4, "#111018");
    drawPixelRect(arrowX + (enemy.dir > 0 ? 4 : -2), y - 8 - blink, 4, 4, "#ffcf3f");
  }
  if (enemy.type === "seagull") {
    drawSeagull(enemy, tick);
    return;
  }
  drawHedgehog(enemy, tick);
}

function drawBoss(tick) {
  const boss = level.boss;
  if (!boss) return;

  const x = Math.round(boss.x) - cameraX;
  const y = Math.round(boss.y);
  const flash = boss.hitTimer > 0 && Math.floor(boss.hitTimer / 3) % 2 === 0;
  const body = boss.defeated ? "#b6b0a4" : flash ? "#ffcf3f" : boss.enraged ? "#f3b8c5" : "#f9f4dc";
  const wingLift = boss.defeated ? 15 : Math.floor(tick / 130) % 2 === 0 ? 0 : 12;

  drawPixelRect(x + 10, y + 36 + wingLift, 38, 16, "#111018");
  drawPixelRect(x + 60, y + 36 + wingLift, 38, 16, "#111018");
  drawPixelRect(x + 18, y + 14, 70, 78, "#111018");
  drawPixelRect(x + 26, y + 22, 54, 62, body);
  drawPixelRect(x + 76, y + 42, 24, 13, "#ffcf3f");
  drawPixelRect(x + 55, y + 34, 10, 10, "#111018");
  drawPixelRect(x + 58, y + 37, 4, 4, "#f9f4dc");
  drawPixelRect(x + 38, y + 65, 25, 9, "#c9d4d6");
  drawPixelRect(x + 30, y + 84, 12, 10, "#111018");
  drawPixelRect(x + 66, y + 84, 12, 10, "#111018");

  if (!boss.defeated) {
    if (boss.attackTimer > 0 && boss.attackTimer <= BOSS_ATTACK_WARNING_TIME) {
      const pulse = Math.floor(tick / 5) % 2 === 0 ? 0 : 3;
      const markerColor = boss.attackType === "fish" ? "#2677b8" : "#ffcf3f";
      drawPixelRect(x + 44, y - 24 - pulse, 20, 20, "#111018");
      drawPixelRect(x + 49, y - 20 - pulse, 10, 10, markerColor);
      drawPixelRect(x + 52, y - 8 - pulse, 4, 4, markerColor);
    }
    const barX = Math.max(16, Math.min(canvas.width - 236, x - 35));
    const hpWidth = Math.round((boss.hp / boss.maxHp) * 200);
    drawPixelRect(barX, 94, 210, 24, "#111018");
    drawPixelRect(barX + 5, 99, 200, 14, "#5f3d2a");
    drawPixelRect(barX + 5, 99, hpWidth, 14, boss.enraged ? "#ffcf3f" : "#e85b52");
  }
}

function drawPlayer(tick) {
  if (player.invincible > 0 && Math.floor(tick / 6) % 2 === 0) return;

  const rabbit = rabbitStyles[player.rabbit] || rabbitStyles.classic;
  const x = Math.round(player.x - cameraX);
  const y = Math.round(player.y);
  const isRunning = player.grounded && Math.abs(player.vx) > 0.1;
  const runStep = isRunning ? Math.floor(tick / 7) % 4 : 0;
  const hop = isRunning ? (runStep === 1 || runStep === 2 ? -2 : 0) : player.grounded ? Math.round(Math.sin(tick / 28) * 1) : 0;
  const stretch = !player.grounded ? Math.max(-2, Math.min(3, Math.round(player.vy / 4))) : 0;
  const earWave = isRunning ? (runStep % 2 === 0 ? -2 : 2) : Math.round(Math.sin(tick / 18) * 1);
  const blink = Math.floor(tick / 170) % 12 === 0;
  const faceRight = player.facing > 0;
  const eyeX = faceRight ? x + 24 : x + 9;
  const noseX = faceRight ? x + 29 : x + 4;
  const cheekX = faceRight ? x + 22 : x + 13;
  const tailX = faceRight ? x + 1 : x + 27;
  const backFootX = faceRight ? x + 3 : x + 22;
  const frontFootX = faceRight ? x + 22 : x + 3;
  const backFootY = y + 38 + hop + (isRunning && runStep === 1 ? 2 : 0);
  const frontFootY = y + 38 + hop + (isRunning && runStep === 3 ? 2 : 0);

  if (player.deathTimer > 0) {
    const flip = Math.floor(player.deathTimer / 8) % 2 === 0;
    const lift = Math.max(0, PLAYER_DEATH_TIME - player.deathTimer) < 20 ? -4 : 0;
    drawPixelRect(x + 5, y + 22 + lift, 30, 22, "#111018");
    drawPixelRect(x + 9, y + 25 + lift, 22, 15, rabbit.body);
    drawPixelRect(x + 12, y + 29 + lift, 12, 8, rabbit.belly);
    drawPixelRect(x + (flip ? 2 : 25), y + 13 + lift, 22, 8, "#111018");
    drawPixelRect(x + (flip ? 6 : 28), y + 15 + lift, 14, 5, rabbit.innerEar);
    drawPixelRect(x + (flip ? 25 : 8), y + 28 + lift, 5, 3, "#111018");
    drawPixelRect(x + (flip ? 24 : 9), y + 34 + lift, 4, 3, rabbit.nose);
    drawPixelRect(x + 29, y + 39 + lift, 10, 5, "#111018");
    drawPixelRect(x - 2, y + 39 + lift, 10, 5, "#111018");
    return;
  }

  if (player.grounded) {
    drawPixelRect(x + 5, y + 43, 24, 4, "rgba(13, 12, 18, 0.3)");
  }

  drawPixelRect(x + 8, y - 8 + hop + earWave, 8, 22, "#111018");
  drawPixelRect(x + 20, y - 10 + hop - earWave, 8, 24, "#111018");
  drawPixelRect(x + 10, y - 5 + hop + earWave, 4, 15, rabbit.innerEar);
  drawPixelRect(x + 22, y - 6 + hop - earWave, 4, 16, rabbit.innerEar);
  drawPixelRect(x + 5, y + 8 + hop - stretch, 28, 34 + stretch, "#111018");
  drawPixelRect(x + 8, y + 11 + hop - stretch, 22, 27 + stretch, rabbit.body);
  drawPixelRect(x + 7, y + 14 + hop - stretch, 18, 13, rabbit.body);
  drawPixelRect(x + 12, y + 24 + hop, 12, 12 + Math.max(0, stretch), rabbit.belly);
  drawPixelRect(tailX, y + 25 + hop, 7, 8, "#111018");
  drawPixelRect(tailX + 2, y + 27 + hop, 4, 4, rabbit.belly);
  drawPixelRect(eyeX, y + 18 + hop - stretch, 6, blink ? 2 : 6, "#111018");
  if (!blink) drawPixelRect(eyeX + 1, y + 19 + hop - stretch, 2, 2, "#f9f4dc");
  drawPixelRect(noseX, y + 25 + hop - stretch, 5, 4, rabbit.nose);
  drawPixelRect(cheekX, y + 28 + hop - stretch, 5, 3, rabbit.innerEar);
  drawPixelRect(backFootX, backFootY, 11, 6, "#111018");
  drawPixelRect(frontFootX, frontFootY, 11, 6, "#111018");

  if (player.turboTimer > 0 && Math.abs(player.vx) > 0.1) {
    const trailX = faceRight ? x - 16 : x + 36;
    drawPixelRect(trailX, y + 22 + hop, 13, 5, "#ffcf3f");
    drawPixelRect(trailX + (faceRight ? -7 : 12), y + 28 + hop, 10, 4, "#e85b52");
    drawPixelRect(trailX + (faceRight ? 4 : -2), y + 34 + hop, 7, 3, "#f9f4dc");
  }
}

function drawFlag() {
  const x = level.width - 96 - cameraX;
  const flagOpen = level.boss ? level.boss.defeated : carrotsCollected === level.carrots.length;
  drawPixelRect(x, 320, 8, 180, "#111018");
  drawPixelRect(x + 8, 326, 76, 42, "#111018");
  drawPixelRect(x + 12, 330, 68, 34, flagOpen ? "#ffcf3f" : "#c9d4d6");
  drawPixelRect(x + 27, 338, 24, 18, "#f28d35");
  drawPixelRect(x + 49, 332, 8, 10, "#5bbd50");
}

function drawGoalHint() {
  const goalReady = level.boss ? level.boss.defeated : carrotsCollected === level.carrots.length;
  const flagScreenX = level.width - 96 - cameraX;
  if (!goalReady || flagScreenX < 0 || flagScreenX < canvas.width - 96) return;

  drawPixelRect(canvas.width - 74, 238, 54, 54, "#111018");
  drawPixelRect(canvas.width - 68, 244, 42, 42, "#ffcf3f");
  drawPixelRect(canvas.width - 52, 254, 12, 22, "#17120a");
  drawPixelRect(canvas.width - 40, 260, 12, 10, "#17120a");
  drawPixelRect(canvas.width - 30, 264, 8, 2, "#17120a");

  const meters = Math.max(1, Math.ceil((flagScreenX - canvas.width + 96) / TILE));
  ctx.save();
  ctx.font = "14px 'Press Start 2P'";
  ctx.textAlign = "right";
  ctx.fillStyle = "#111018";
  ctx.fillText(`${meters}m`, canvas.width - 18, 312);
  ctx.fillStyle = "#f9f4dc";
  ctx.fillText(`${meters}m`, canvas.width - 20, 310);
  ctx.restore();
}

function drawComboMeter() {
  if (carrotComboCount < 2 || carrotComboTimer <= 0) return;
  const width = 150;
  const fill = Math.round((carrotComboTimer / CARROT_COMBO_TIME) * (width - 10));
  drawPixelRect(18, 92, width, 24, "#111018");
  drawPixelRect(23, 97, width - 10, 14, "#5f3d2a");
  drawPixelRect(23, 97, fill, 14, "#ffcf3f");
  ctx.save();
  ctx.font = "14px 'Press Start 2P'";
  ctx.textAlign = "left";
  ctx.fillStyle = "#111018";
  ctx.fillText(`COMBO x${carrotComboCount}`, 20, 134);
  ctx.fillStyle = "#f9f4dc";
  ctx.fillText(`COMBO x${carrotComboCount}`, 18, 132);
  ctx.restore();
}

function drawMessage() {
  if (!message || messageTimer <= 0) return;
  const text = message;
  const width = Math.min(760, text.length * 16 + 42);
  const x = (canvas.width - width) / 2;
  drawPixelRect(x, 26, width, 48, "#111018");
  drawPixelRect(x + 5, 31, width - 10, 38, "#252235");
  ctx.fillStyle = "#f9f4dc";
  ctx.font = "20px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, 51, width - 24);
}

function drawPauseOverlay() {
  if (!paused || menuOpen) return;
  drawPixelRect(0, 0, canvas.width, canvas.height, "rgba(13, 12, 18, 0.42)");
  drawPixelRect(318, 202, 324, 112, "#111018");
  drawPixelRect(326, 210, 308, 96, "#252235");
  ctx.fillStyle = "#ffcf3f";
  ctx.font = "34px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TAUKO", canvas.width / 2, 242);
  ctx.fillStyle = "#f9f4dc";
  ctx.font = "18px 'Courier New', monospace";
  ctx.fillText("P tai Esc jatkaa", canvas.width / 2, 282);
}

function drawLowLifeWarning(tick) {
  if (menuOpen || won || gameOver || lives !== 1) return;
  const pulse = Math.floor(tick / 220) % 2 === 0 ? 0.18 : 0.28;
  const color = `rgba(232, 91, 82, ${pulse})`;
  drawPixelRect(0, 0, canvas.width, 8, color);
  drawPixelRect(0, canvas.height - 8, canvas.width, 8, color);
  drawPixelRect(0, 0, 8, canvas.height, color);
  drawPixelRect(canvas.width - 8, 0, 8, canvas.height, color);
}

function drawCameraHint(hint) {
  if (!editorEnabled) return;
  const x = Math.round(hint.x) - cameraX;
  const y = Math.round(hint.y);
  const centerY = y + Math.round(hint.h / 2);
  const look = hint.lookX || 0;
  drawPixelRect(x, y, hint.w, hint.h, "rgba(255, 207, 63, 0.16)");
  drawPixelRect(x, y, hint.w, 2, "rgba(255, 207, 63, 0.55)");
  drawPixelRect(x, y + hint.h - 2, hint.w, 2, "rgba(255, 207, 63, 0.55)");
  drawPixelRect(x + 4, centerY - 2, Math.max(10, hint.w - 8), 4, "#ffcf3f");
  if (look >= 0) {
    drawPixelRect(x + hint.w - 14, centerY - 8, 10, 16, "#f9f4dc");
  } else {
    drawPixelRect(x + 4, centerY - 8, 10, 16, "#f9f4dc");
  }
}

function draw(tick) {
  drawSky();
  drawFlag();
  (level.cameraHints || []).forEach(drawCameraHint);
  (level.water || []).forEach((water) => drawWater(water, tick));
  (level.currentWater || []).forEach((current) => drawCurrentWater(current, tick));
  (level.windZones || []).forEach((zone) => drawWindZone(zone, tick));
  level.platforms.forEach(drawPlatform);
  (level.movingPlatforms || []).forEach(drawMovingPlatform);
  (level.crumblePlatforms || []).forEach(drawCrumblePlatform);
  (level.breakableWalls || []).forEach(drawBreakableWall);
  (level.oneWayPlatforms || []).forEach(drawOneWayPlatform);
  (level.spikes || []).forEach(drawSpikes);
  (level.pendulums || []).forEach(drawPendulum);
  (level.trampolines || []).forEach((trampoline) => drawTrampoline(trampoline, tick));
  (level.lockedGates || []).forEach(drawLockedGate);
  (level.buttonGates || []).forEach(drawButtonGate);
  (level.pressureButtons || []).forEach(drawPressureButton);
  (level.keys || []).forEach((key) => drawKey(key, tick));
  (level.checkpoints || []).forEach((checkpoint) => drawCheckpoint(checkpoint, tick));
  level.carrots.forEach((carrot) => drawCarrot(carrot, tick));
  (level.bonusCarrots || []).forEach((carrot) => drawBonusCarrot(carrot, tick));
  (level.starCarrots || []).forEach((carrot) => drawStarCarrot(carrot, tick));
  drawWeapon();
  drawTurbo();
  level.enemies.forEach((enemy) => drawEnemy(enemy, tick));
  drawBoss(tick);
  drawBossAttacks();
  drawShots();
  drawPlayer(tick);
  drawScorePopups();
  drawGoalHint();
  drawComboMeter();
  drawEditorGrid();
  drawEditorPreview();
  drawMessage();
  drawLowLifeWarning(tick);
  drawPauseOverlay();
}

function updateGameLogic() {
  gameFrame += 1;
  updateMovingPlatforms();
  updateCrumblePlatforms();
  updatePlayer();
  updateEnemies();
  updateBoss();
  updateBossAttacks();
  updateShots();
  updateItems();
  updateScorePopups();
  updateCamera();
  updateLevelProgress();
  if (messageTimer !== Infinity && messageTimer > 0) messageTimer -= 1;
}

function loop(tick) {
  if (paused) {
    lastLoopTick = tick;
    logicAccumulator = 0;
  } else {
    const delta = lastLoopTick === 0 ? TARGET_FRAME_MS : Math.min(1000, tick - lastLoopTick);
    lastLoopTick = tick;
    logicAccumulator += delta;

    let steps = 0;
    while (logicAccumulator >= TARGET_FRAME_MS && steps < MAX_LOGIC_STEPS) {
      updateGameLogic();
      logicAccumulator -= TARGET_FRAME_MS;
      steps += 1;
    }
    if (steps === MAX_LOGIC_STEPS) logicAccumulator = 0;
  }
  draw(tick);
  requestAnimationFrame(loop);
}

function setButtonControl(buttonId, key) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const press = (event) => {
    event.preventDefault();
    if (menuOpen || paused) return;
    if (event.pointerId !== undefined) button.setPointerCapture(event.pointerId);
    startMusic();
    keys[key] = true;
    if (key === "jump") queueJump();
    button.classList.add("is-pressed");
  };
  const release = (event) => {
    event.preventDefault();
    keys[key] = false;
    if (key === "jump") releaseJump();
    if (event.pointerId !== undefined && button.hasPointerCapture(event.pointerId)) {
      button.releasePointerCapture(event.pointerId);
    }
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

window.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  const editingField = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";
  if (editorEnabled && !editingField && event.ctrlKey && event.code === "KeyZ") {
    undoEditorObject();
    event.preventDefault();
    return;
  }
  if (menuOpen && event.code === "Enter") {
    startMusic();
    resetGame();
    closeStartMenu();
    return;
  }
  if (!editingField && event.code === "KeyM") {
    toggleSound();
    event.preventDefault();
    return;
  }
  if (!editingField && event.code === "KeyR") {
    startMusic();
    resetGame();
    openStartMenu();
    event.preventDefault();
    return;
  }
  if (!menuOpen && (event.code === "KeyP" || event.code === "Escape")) {
    togglePause();
    event.preventDefault();
    return;
  }
  if (paused) return;
  startMusic();
  if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = true;
  if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = true;
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    keys.jump = true;
    queueJump();
    event.preventDefault();
  }
  if (event.code === "KeyF" || event.code === "ControlLeft" || event.code === "ControlRight") {
    keys.shoot = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = false;
  if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = false;
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    keys.jump = false;
    releaseJump();
  }
  if (event.code === "KeyF" || event.code === "ControlLeft" || event.code === "ControlRight") keys.shoot = false;
});

pauseBtn.addEventListener("click", () => {
  startMusic();
  togglePause();
});
restartBtn.addEventListener("click", () => {
  startMusic();
  resetGame();
  openStartMenu();
});
soundBtn.addEventListener("click", toggleSound);
menuStartBtn.addEventListener("click", () => {
  startMusic();
  resetGame();
  closeStartMenu();
});
menuTestBtn.addEventListener("click", () => {
  startMusic();
  startTestLevel(Number(levelSelect.value));
  closeStartMenu();
});
startLevelBtn.addEventListener("click", () => {
  startMusic();
  startTestLevel(Number(levelSelect.value));
  closeStartMenu();
});
unlockLevelsBtn.addEventListener("click", unlockAllLevels);
editorToggleBtn.textContent = "Editor päälle";
editorToggleBtn.addEventListener("click", toggleEditor);
editorUndoBtn.addEventListener("click", undoEditorObject);
editorCopyBtn.addEventListener("click", copyEditorJson);
editorType.addEventListener("change", applyEditorPreset);
editorWidth.addEventListener("change", editorExport);
editorHeight.addEventListener("change", editorExport);
canvas.addEventListener("click", (event) => {
  if (!editorEnabled) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const worldX = cameraX + canvasX;
  if (event.ctrlKey && event.shiftKey) {
    testSpawnAt(worldX, canvasY);
  } else if (menuOpen) {
    return;
  } else if (event.shiftKey) {
    cloneEditorObject(worldX, canvasY);
  } else {
    addEditorObject(worldX, canvasY);
  }
});
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  editorPreview = {
    x: cameraX + (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
});
canvas.addEventListener("pointerleave", () => {
  editorPreview = null;
});
characterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectRabbit(button.dataset.rabbit);
  });
});
setButtonControl("leftBtn", "left");
setButtonControl("rightBtn", "right");
setButtonControl("jumpBtn", "jump");
setButtonControl("shootBtn", "shoot");
window.addEventListener("blur", releaseAllControls);
window.addEventListener("pointercancel", releaseAllControls);

loadProgress();
updateSoundButton();
selectRabbit(selectedRabbit);
populateLevelSelect();
resetGame();
requestAnimationFrame(loop);
