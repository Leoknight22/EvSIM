/***** Parametri simulazione *****/
let probmutazione = 0.2;         // probabilità di mutazione ad ogni nascita
const DIAM = 20;                 // diametro “cerchi” (px)
const R = DIAM / 2;
const MAX_SPEED = 300;           // clamp velocità (px/s)
const MIN_SPEED = 12;
const MIN_LIFE = 200;
const MAX_LIFE = 8000;

/***** Setup DOM *****/
const container = document.getElementById("container");
const slider = document.getElementById("slider"); // 0..512 -> targetHz = value * 4
let esseri = [];                                   // tutte le entità: animali + piante

/***** Uniform Grid per broad-phase (collisioni/vicini) *****/
class UniformGrid {
  constructor(width, height, cellSize = 32) {
    this.cellSize = cellSize;
    this.resize(width, height);
  }
  resize(width, height) {
    this.w = Math.max(1, Math.ceil(width / this.cellSize));
    this.h = Math.max(1, Math.ceil(height / this.cellSize));
    this.cells = Array.from({ length: this.w * this.h }, () => []);
    this.width = width;
    this.height = height;
  }
  _idxFromCell(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= this.w || cy >= this.h) return -1;
    return cy * this.w + cx;
  }
  clear() { this.cells.forEach(c => c.length = 0); }
  insert(b) {
    // inserisci in tutte le celle toccate dal bounding box (20x20)
    const minx = Math.floor(b.x / this.cellSize);
    const maxx = Math.floor((b.x + DIAM) / this.cellSize);
    const miny = Math.floor(b.y / this.cellSize);
    const maxy = Math.floor((b.y + DIAM) / this.cellSize);
    for (let cy = miny; cy <= maxy; cy++) {
      for (let cx = minx; cx <= maxx; cx++) {
        const idx = this._idxFromCell(cx, cy);
        if (idx >= 0) this.cells[idx].push(b);
      }
    }
  }
  neighborsAround(b) {
    // restituisce cella e 8 adiacenti (finestra 3x3)
    const cx = Math.floor((b.x + R) / this.cellSize);
    const cy = Math.floor((b.y + R) / this.cellSize);
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const idx = this._idxFromCell(cx + dx, cy + dy);
        if (idx >= 0) out.push(...this.cells[idx]);
      }
    }
    return out;
  }
  forEachPotentialPair(cb) {
    for (const cell of this.cells) {
      const n = cell.length;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) cb(cell[i], cell[j]);
      }
    }
  }
}
let grid = new UniformGrid(container.clientWidth, container.clientHeight, 32);

/***** Classi *****/
class animale {
  // comportamento: 0 = ignora, 1 = fuga, 2 = inseguimento, 3 = misto
  // velocitamedia: **px/s**
  constructor(container, x, y, velocitamedia, erbivoro, aspettativa_vita, comportamento) {
    this.container = container;
    // fisica
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.velocitamedia = velocitamedia; // px/s
    this.angle = 0;                     // radianti
    this.keepangle = 0;
    this.ne = null;                     // vicino “rilevante”
    // caratteristiche
    this.regno = "animale";
    this.erbivoro = erbivoro;
    this.eta = 0; // in “steps-equivalenti-60Hz” per compatibilità con aspettativa_vita
    this.aspettativa_vita = aspettativa_vita;
    this.comportamento = comportamento;
    this.alive = true;
    // DOM
    this.el = document.createElement("div");
    this.el.className = "animale" + this.erbivoro;
    container.appendChild(this.el);
    this.el.style.width = `${DIAM}px`;
    this.el.style.height = `${DIAM}px`;
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  update(dtSec) {
    // Decide l'angolo in base al comportamento e al "ne" (se presente)
    if (this.comportamento === 0 || !this.ne || !this.ne.alive) {
      if (--this.keepangle <= 0) {
        this.keepangle = Math.floor(Math.random() * 50) + 1;
        this.angle += (Math.random() * 0.6 - 0.3); // +/- ~17°
      }
    } else if (this.comportamento === 1) {
      this.angle = Math.atan2(this.ne.y - this.y, this.ne.x - this.x) + Math.PI;
    } else if (this.comportamento === 2) {
      this.angle = Math.atan2(this.ne.y - this.y, this.ne.x - this.x);
    } else if (this.comportamento === 3) {
      if ((this.ne.regno === "piante" && this.erbivoro) ||
          (this.ne.regno === "animale" && !this.erbivoro && this.ne.erbivoro)) {
        this.angle = Math.atan2(this.ne.y - this.y, this.ne.x - this.x);
      } else if (this.ne.regno === "animale" && this.erbivoro && !this.ne.erbivoro) {
        this.angle = Math.atan2(this.ne.y - this.y, this.ne.x - this.x) + Math.PI;
      } else {
        if (--this.keepangle <= 0) {
          this.keepangle = Math.floor(Math.random() * 50) + 1;
          this.angle += (Math.random() * 0.6 - 0.3);
        }
      }
    }

    // velocità px/s → spostamento = v * dt (s)
    const speed = this.velocitamedia;
    this.vx = Math.cos(this.angle) * speed;
    this.vy = Math.sin(this.angle) * speed;

    this.x += this.vx * dtSec;
    this.y += this.vy * dtSec;

    const W = this.container.clientWidth, H = this.container.clientHeight;
    if (this.x < 0) { this.x = 0; this.vx *= -1; this.angle = Math.atan2(this.vy, this.vx); }
    if (this.x > W - DIAM) { this.x = W - DIAM; this.vx *= -1; this.angle = Math.atan2(this.vy, this.vx); }
    if (this.y < 0) { this.y = 0; this.vy *= -1; this.angle = Math.atan2(this.vy, this.vx); }
    if (this.y > H - DIAM) { this.y = H - DIAM; this.vy *= -1; this.angle = Math.atan2(this.vy, this.vx); }

    // età in “steps-equivalenti-60Hz” (così aspettativa_vita resta coerente)
    this.eta += dtSec * 60;
    if (this.eta > this.aspettativa_vita) this.alive = false;
  }
  render() {
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
}

class pianta {
  constructor(container, x, y, aspettativa_vita) {
    this.container = container;
    this.x = x; this.y = y;
    this.regno = "piante";
    this.eta = 0;
    this.aspettativa_vita = aspettativa_vita;
    this.alive = true;

    this.el = document.createElement("div");
    this.el.className = "piante";
    this.el.style.width = `${DIAM}px`;
    this.el.style.height = `${DIAM}px`;
    container.appendChild(this.el);
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  update(dtSec) {
    this.eta += dtSec * 60;
    if (this.eta > this.aspettativa_vita) this.alive = false;
  }
  render() {
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
}

/***** Utility *****/
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function createChild(parent) {
  let speed = parent.velocitamedia;
  let life = parent.aspettativa_vita;
  let comport = parent.comportamento;
  let diet = parent.erbivoro;

  if (Math.random() < probmutazione) {
    switch (Math.floor(Math.random() * 4)) {
      case 0: speed += (Math.random() * 24 - 12); break; // mutazione velocità ±12 px/s
      case 1: /* toggle dieta (drastico) non usato come in origine */ break;
      case 2: comport = Math.floor(Math.random() * 4); break;
      case 3: life += (Math.random() * 200 - 100); break;
    }
  }
  speed = clamp(speed, MIN_SPEED, MAX_SPEED);
  life = clamp(life, MIN_LIFE, MAX_LIFE);

  esseri.push(new animale(
    container,
    clamp(parent.x + DIAM, 0, container.clientWidth - DIAM),
    parent.y,
    speed,
    diet,
    Math.round(life),
    comport
  ));
}

function distance(a, b) {
  const ax = a.x + R, ay = a.y + R;
  const bx = b.x + R, by = b.y + R;
  return Math.hypot(bx - ax, by - ay);
}
function checkAndResolveCollision(a, b, toRemove) {
  const dist = distance(a, b);
  if (dist > DIAM) return;
  if (a.regno === "animale" && b.regno === "piante" && a.erbivoro && b.alive) {
    b.alive = false; toRemove.add(b); createChild(a); return;
  }
  if (b.regno === "animale" && a.regno === "piante" && b.erbivoro && a.alive) {
    a.alive = false; toRemove.add(a); createChild(b); return;
  }
  if (a.regno === "animale" && b.regno === "animale") {
    if (!a.erbivoro && b.erbivoro && b.alive) { b.alive = false; toRemove.add(b); createChild(a); }
    else if (!b.erbivoro && a.erbivoro && a.alive) { a.alive = false; toRemove.add(a); createChild(b); }
  }
}

/***** Clock: render @rAF, simulazione con fixed timestep dal valore slider*4 *****/
let running = true;
let lastTs = performance.now();
let accumulator = 0;
let framecounter = 0;            // conta gli step eseguiti (tutti i sub-step)
let lastframecounter = 0;

// Spawn piante “per tempo simulato” (derivato dall’euristica originale)
const area = container.clientWidth * container.clientHeight;
const plantFrames = Math.max(1, Math.round(32000000 / area)); // come in origine: N frame
const secondsPerPlant = Math.max(0.2, plantFrames / 60);       // converto in secondi simulati
let plantTimer = 0;

// controllo dei limiti per evitare "spiral of death"
const MAX_STEPS_PER_FRAME = 64;   // aumenta con cautela se alzi molto il target

function targetHzFromSlider() {
  const raw = Number(slider?.value ?? 0);
  const clamped = Math.max(0, Math.min(raw, 2048));
  return clamped * 4; // mapping richiesto: 0..512 -> 0..2048 steps/s
}

// quanto deve “accelerare” il tempo simulato rispetto al tempo reale
function timeScaleFromSlider() {
  const baseHz = 60;                   // 1x ≈ esperienza “normale”
  const hz = targetHzFromSlider();
  return hz > 0 ? (hz / baseHz) : 0;   // es. 240 -> 240/60 = 4x più veloce
}

function step(dtMs) {
  // delta reale in secondi
  const dtRealSec = dtMs / 1000;
  // accelerazione del tempo simulato (slider)
  const tScale = timeScaleFromSlider();
  // secondi simulati da usare ovunque nella logica
  const dtSec = dtRealSec * tScale;

  // resize → aggiorna griglia
  const W = container.clientWidth, H = container.clientHeight;
  if (W !== grid.width || H !== grid.height) grid.resize(W, H);

  // 1) riempi griglia
  grid.clear();
  for (const e of esseri) if (e.alive) grid.insert(e);

  // 2) nearest per animali
  for (const e of esseri) {
    if (!e.alive || e.regno !== "animale") continue;
    let minD = Infinity, nearest = null;
    const neigh = grid.neighborsAround(e);
    for (const cand of neigh) {
      if (cand === e || !cand.alive) continue;
      const d = distance(e, cand);
      if (d < minD) { minD = d; nearest = cand; }
    }
    e.ne = nearest;
  }

  // 3) update logica/posizioni (dtSec)
  for (const e of esseri) if (e.alive) e.update(dtSec);

  // 4) collisioni (solo candidati nella stessa cella)
  const toRemove = new Set();
  grid.forEachPotentialPair((a, b) => checkAndResolveCollision(a, b, toRemove));

  // 5) spawn piante: timer a secondi simulati
  plantTimer += dtSec;
  if (plantTimer >= secondsPerPlant) {
    plantTimer = 0;
    esseri.push(new pianta(
      container,
      Math.random() * (container.clientWidth - DIAM),
      Math.random() * (container.clientHeight - DIAM),
      3000
    ));
  }

  // 6) rimozione batch
  esseri = esseri.filter(e => {
    if (!e.alive) {
      if (e.el && e.el.parentNode) e.container.removeChild(e.el);
      return false;
    }
    return true;
  });

  framecounter += 1;
}

function render() {
  for (const e of esseri) if (e.alive) e.render();
}

function loop(now) {
  if (!running) return;

  // fixed timestep calcolato dall’obiettivo dello slider (0 => pausa => nessuno step)
  const targetHz = targetHzFromSlider();
  const fixedDtMs = targetHz > 0 ? (1000 / targetHz) : Infinity;

  const dt = now - lastTs;
  lastTs = now;
  accumulator += dt;

  let steps = 0;
  while (accumulator >= fixedDtMs && steps < MAX_STEPS_PER_FRAME) {
    step(fixedDtMs);
    accumulator -= fixedDtMs;
    steps++;
  }

  // 1 solo render per rAF → sincronizzato al refresh display
  render();

  // se la sim è più lenta del target, droppa backlog per evitare freeze
  if (steps >= MAX_STEPS_PER_FRAME) {
    accumulator = 0;
  }

  requestAnimationFrame(loop);
}

/***** UI & Stats *****/
function stats() {
  const numPiante = esseri.reduce((n, e) => n + (e.regno === "piante" ? 1 : 0), 0);
  const animali = esseri.filter(e => e.regno === "animale");
  const numAnimali = animali.length;
  const numErbivori = animali.reduce((n, e) => n + (e.erbivoro ? 1 : 0), 0);

  const velocitamedia = numAnimali
    ? (animali.reduce((s, e) => s + e.velocitamedia, 0) / numAnimali).toFixed(1) // px/s
    : "0.0";
  const aspettativavita = numAnimali
    ? (animali.reduce((s, e) => s + e.aspettativa_vita, 0) / numAnimali).toFixed(0)
    : "0";

  const comportamentoCounts = [0, 0, 0, 0];
  for (const e of animali) comportamentoCounts[e.comportamento]++;

  const sps = ((framecounter - lastframecounter) / 0.5).toFixed(1); // steps/s effettivi (reali)
  lastframecounter = framecounter;

  const target = targetHzFromSlider();

  document.getElementById("tempo").textContent =
    `Step eseguiti: ${Math.floor(framecounter)}  (${sps} steps/s  |  target:${target})`;
  document.getElementById("numPiante").textContent = "Piante: " + numPiante;
  document.getElementById("numAnimali").textContent = "Animali: " + numAnimali;
  document.getElementById("numErbivori").textContent = "Erbivori: " + numErbivori;
  document.getElementById("velocitamedia").textContent = "Velocita' media: " + velocitamedia + " px/s";
  document.getElementById("aspettativavita").textContent = "Aspettativa di vita media: " + aspettativavita;
  document.getElementById("comportamento").textContent =
    comportamentoCounts.map((c, i) => `Intelligenza ${i}: ${c}`).join(", ");

  setTimeout(stats, 500);
}

/***** API helper *****/
function removeEssere() {
  // rimuove l’ultimo essere vivo
  for (let i = esseri.length - 1; i >= 0; i--) {
    if (esseri[i].alive) { esseri[i].alive = false; break; }
  }
}
function pace() {
  // rimuove tutti i carnivori
  for (const e of esseri) {
    if (e.regno === "animale" && !e.erbivoro) e.alive = false;
  }
}

/***** Avvio *****/
stats();

// Helper per coordinate random all'interno del container
function randX() { return Math.random() * (container.clientWidth - DIAM); }
function randY() { return Math.random() * (container.clientHeight - DIAM); }

// NB: i valori originali (1.0 e 1.7) erano “px/frame a 60Hz” → qui li converto in **px/s** moltiplicando ×60
esseri.push(new animale(container, randX(), randY(), 1.0 * 60, true, 2000, 0));   // ~60 px/s
esseri.push(new animale(container, randX(), randY(), 1.7 * 60, false, 1000, 0)); // ~102 px/s
esseri.push(new pianta(container, randX(), randY(), 3000));

requestAnimationFrame(loop);