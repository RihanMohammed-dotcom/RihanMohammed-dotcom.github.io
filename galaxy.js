/*
  Payment flow galaxy
  -------------------
  Thousands of tiny stars orbit slowly like a spiral galaxy. A few bright "nodes" (think: banks, wallets,
  merchants) ride along with the galaxy, connected by faint glowing paths. Every moment, a "transaction"
  leaves one node and travels along a path to another, leaving a trail of sparks. When it arrives, the
  node pulses. Stars move out of the way of your mouse (or finger) and drift back.
  Click / tap: you send a real-looking payment (sample data) through operations — card → scheme → fraud check →
  bank → merchant, or a fund load, a wallet transfer, a chargeback — with each stage popping up as it lands.

  How it works, in one sentence: every frame (about 60 times a second) we move each dot a tiny bit
  according to a few simple rules, then draw all the dots again.
*/
(() => {
  "use strict";
  const canvas = document.getElementById("galaxy");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = () => window.innerWidth < 760;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;

  // ---- colours come from the page theme (dark / light)
  let C = {};
  const fade = (hex, a) => { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  let sprite = null;                                              // a soft round "dust" blob, drawn once and reused
  function makeSprite() {
    sprite = document.createElement("canvas"); sprite.width = sprite.height = 64;
    const s = sprite.getContext("2d"), g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, fade(C.star2, C.light ? .5 : .55)); g.addColorStop(1, fade(C.star2, 0));
    s.fillStyle = g; s.fillRect(0, 0, 64, 64);
  }
  function readTheme() {
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    C = { star: v("--g-star"), star2: v("--g-star2"), gold: v("--g-gold"), path: v("--g-path"),
          glow: v("--g-glow"), glow2: v("--g-glow2"), label: v("--g-label"), light: document.documentElement.dataset.theme === "light" };
    makeSprite(); paintNebula();
  }

  // ---- sizes
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 0;
  const nebula = document.createElement("canvas");
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = small() ? W * 0.52 : W * 0.65; CY = small() ? H * 0.48 : H * 0.5;
    R = Math.min(W * (small() ? 0.7 : 0.45), H * (small() ? 0.56 : 0.8));
    paintNebula(); makeStars(); makeNetwork();
  }
  function paintNebula() {
    if (!W) return;
    nebula.width = canvas.width; nebula.height = canvas.height;
    const n = nebula.getContext("2d"); n.setTransform(DPR, 0, 0, DPR, 0, 0); n.clearRect(0, 0, W, H);
    const g1 = n.createRadialGradient(CX, CY, 0, CX, CY, R * 1.25);
    g1.addColorStop(0, C.glow || "rgba(160,190,90,.35)"); g1.addColorStop(1, "rgba(0,0,0,0)");
    n.fillStyle = g1; n.fillRect(0, 0, W, H);
    const g2 = n.createRadialGradient(CX + R * 0.35, CY - R * 0.2, 0, CX + R * 0.35, CY - R * 0.2, R * 0.8);
    g2.addColorStop(0, C.glow2 || "rgba(227,199,112,.12)"); g2.addColorStop(1, "rgba(0,0,0,0)");
    n.fillStyle = g2; n.fillRect(0, 0, W, H);
  }

  // ---- stars: each one has a distance from the centre, an angle, a speed and a size
  const ARMS = 3, TILT = 0.5, ROT = -0.21;  // TILT squashes the circle into an ellipse (3-D look); ROT tilts the whole galaxy
  let stars = [];
  function makeStars() {
    let n = Math.round(Math.min(4200, Math.max(900, (W * H) / 330)));
    if (small()) n = Math.round(n * 0.55);
    if (lowPower) n = Math.round(n * 0.6);
    stars = [];
    for (let i = 0; i < n; i++) {
      const d = Math.min(1.15, Math.pow(Math.random(), 1.2) * 1.1);  // a few more stars near the middle
      const arm = i % ARMS;
      const spread = (Math.random() - 0.5) * (0.55 + d * 0.5);      // how far from the arm line
      stars.push({
        d, a: arm * (Math.PI * 2 / ARMS) + d * 4.2 + spread,         // spiral: angle grows with distance
        w: 0.05 + 0.12 / (0.25 + d),                                 // inner stars orbit faster
        s: Math.random() < 0.06 ? 1.8 + Math.random() * 1.2 : 0.7 + Math.random() * 1.1,
        o: 0.35 + Math.random() * 0.65, z: Math.random(), dust: Math.random() < 0.06,
        gold: Math.random() < 0.07, ox: 0, oy: 0, vx: 0, vy: 0, tw: Math.random() * 6.28,
      });
    }
  }

  // ---- the payment network: nodes that orbit with the galaxy, and paths between them
  let nodes = [], edges = [];
  const NAMES = ["Card", "Scheme", "Fraud check", "Bank", "Merchant", "Wallet", "Ledger", "Client"];
  const byName = n => nodes.findIndex(nd => nd.name === n);
  function makeNetwork() {
    nodes = [{ d: 0, a: 0, hub: true, pulse: 0, flash: 0, name: "OPS" }];   // the centre: operations
    const count = NAMES.length;
    for (let i = 0; i < count; i++)
      nodes.push({ d: 0.42 + (i % 2) * 0.3 + Math.random() * 0.06, a: (i / count) * Math.PI * 2 + Math.random() * 0.3, pulse: 0, flash: 0, name: NAMES[i] });
    edges = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push([0, i]);                                            // every node talks to the core
      edges.push([i, i + 1 < nodes.length ? i + 1 : 1]);             // and to its neighbour
    }
    edges.push([1, 1 + Math.floor((nodes.length - 1) / 2)]);              // one long route across the galaxy
  }
  const cr = Math.cos(ROT), sr = Math.sin(ROT);
  const pos = (d, a) => { const x = Math.cos(a) * d * R, y = Math.sin(a) * d * R * TILT; return [CX + x * cr - y * sr, CY + x * sr + y * cr]; };
  function nodePos(nd, t) { return nd.hub ? [CX, CY] : pos(nd.d, nd.a + t * 0.018); }
  function curve(p0, p1) {                                           // control point bends the path towards the centre
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    return [p0, [mx + (CX - mx) * 0.35, my + (CY - my) * 0.35 - 18], p1];
  }
  const qb = (c, t) => { const u = 1 - t; return [u * u * c[0][0] + 2 * u * t * c[1][0] + t * t * c[2][0], u * u * c[0][1] + 2 * u * t * c[1][1] + t * t * c[2][1]]; };

  // ---- transactions travelling along paths, and the sparks they leave behind
  let txs = [], sparks = [];
  function sendTx(from) {
    const options = edges.filter(e => from === undefined || e[0] === from || e[1] === from);
    const e = options[Math.floor(Math.random() * options.length)]; if (!e) return;
    const fwd = from === undefined ? Math.random() < 0.5 : e[0] === from;
    txs.push({ a: fwd ? e[0] : e[1], b: fwd ? e[1] : e[0], t: 0, v: 0.35 + Math.random() * 0.4 });
  }

  // ---- mouse / finger
  const mouse = { x: -9999, y: -9999, on: false };
  window.addEventListener("pointermove", e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; }, { passive: true });
  window.addEventListener("pointerleave", () => { mouse.on = false; mouse.x = mouse.y = -9999; });
  canvas.addEventListener("click", e => {                            // click: send a payment through operations
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    startJourney(x, y);
    // plus a burst of ordinary payments from the nearest node
    let best = 0, bd = 1e9;
    nodes.forEach((nd, i) => { const p = nodePos(nd, clock), dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < bd) { bd = dd; best = i; } });
    for (let i = 0; i < 5; i++) sendTx(best);
    nodes[best].pulse = 1; nodes[best].flash = 1;
  });

  // ---- journeys: what a click sends. Each one hops node to node; each landing is an ops stage.
  const FLOWS = [
    { name: "Card payment", icon: "💳", path: ["Card", "Scheme", "Fraud check", "Bank", "Merchant"], tags: ["Approved ✓", "Fraud check ✓", "Cleared", "Settled ✓"], done: "Settled" },
    { name: "Fund load", icon: "🏦", path: ["Bank", "OPS", "Ledger", "Wallet"], tags: ["Approved ✓", "Cleared", "Settled ✓"], done: "Loaded" },
    { name: "Chargeback", icon: "🛡️", path: ["Client", "OPS", "Scheme", "Merchant", "OPS"], tags: ["Dispute raised", "Evidence sent", "Representment", "Won ✓"], done: "Won" },
    { name: "Wallet transfer", icon: "⇄", path: ["Client", "Wallet", "OPS", "Ledger"], tags: ["Approved ✓", "Cleared", "Reconciled ✓"], done: "Reconciled" },
  ];
  let journeys = [], tags = [], fi = 0, cleared = 0;
  const feed = document.getElementById("feed"), counter = document.getElementById("cleared");
  function startJourney(x, y) {
    if (journeys.length >= 6) return;
    const f = FLOWS[fi++ % FLOWS.length], amt = Math.round((25 + Math.random() * 2400) * 4) / 4;
    const j = { f, amt: "AED " + amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), hop: -1, t: 0, from: [x, y], to: byName(f.path[0]), t0: clock };
    if (reduceMotion) return finish(j);
    journeys.push(j); hintGone();
  }
  function finish(j) {
    cleared++; if (counter) { counter.textContent = cleared; counter.classList.remove("bump"); void counter.offsetWidth; counter.classList.add("bump"); }
    if (!feed) return;
    const el = document.createElement("div"); el.className = "toast";
    el.innerHTML = `<span class="ic">${j.f.icon}</span><div><b>${j.f.name} · ${j.amt}</b>${j.f.done} in ${(clock - j.t0).toFixed(1)}s · ${j.f.path.length} stops</div>`;
    feed.prepend(el);
    const all = feed.querySelectorAll(".toast"); if (all.length > 4) all[all.length - 1].remove();
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 6500);
  }
  function hintGone() { const h = document.getElementById("hint"); if (h) h.style.opacity = ".45"; }
  function pill(x, y, text, bg, fg, alpha) {
    ctx.font = "600 11px Inter, system-ui, sans-serif";
    const w = ctx.measureText(text).width + 14;
    ctx.globalAlpha = alpha; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 10, w, 20, 10); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 0.5);
  }
  function drawJourneys(dt) {
    ctx.globalCompositeOperation = "source-over";
    for (let i = journeys.length - 1; i >= 0; i--) {
      const j = journeys[i];
      const p0 = j.hop < 0 ? j.from : nodePos(nodes[byName(j.f.path[j.hop])], clock), p1 = nodePos(nodes[j.to], clock);
      const c = curve(p0, p1);
      j.t = Math.min(1, j.t + dt * (j.hop < 0 ? 2.4 : 0.95));
      // the route lights up
      ctx.globalAlpha = 0.55; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -clock * 30;
      ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.quadraticCurveTo(c[1][0], c[1][1], c[2][0], c[2][1]); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k < 12; k++) {                                 // a bigger, brighter comet
        const p = qb(c, Math.max(0, j.t - k * 0.016));
        ctx.globalAlpha = (1 - k / 12); ctx.fillStyle = k === 0 ? "#fffbe8" : C.gold;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0.6, k === 0 ? 4.2 : 3.2 - k * 0.22), 0, 6.283); ctx.fill();
      }
      const h = qb(c, j.t);
      for (let k = 0; k < 2; k++) sparks.push({ x: h[0], y: h[1], vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 1 });
      pill(h[0], h[1] - 20, j.amt, fade(C.gold, 0.95), C.light ? "#fffdf6" : "#1a1f0c", 1);
      if (j.t >= 1) {                                                // landed: pulse the node and show the stage
        const nd = nodes[j.to]; nd.pulse = 1; nd.flash = 1;
        if (j.hop >= 0) { const [x, y] = nodePos(nd, clock); tags.push({ x, y: y - 26, text: j.f.tags[j.hop], life: 1, last: j.hop === j.f.tags.length - 1 }); }
        j.hop++; j.t = 0;
        if (j.hop >= j.f.path.length - 1) { journeys.splice(i, 1); finish(j); }
        else j.to = byName(j.f.path[j.hop + 1]);
      }
    }
    for (let i = tags.length - 1; i >= 0; i--) {                     // stage labels float up and fade
      const g = tags[i]; g.life -= dt * (g.last ? 0.45 : 0.6); g.y -= dt * 16;
      if (g.life <= 0) { tags.splice(i, 1); continue; }
      pill(g.x, g.y, g.text, g.last ? (C.light ? "#4f6420" : "#a9c25a") : (C.light ? "rgba(35,41,15,.85)" : "rgba(20,27,14,.9)"),
        g.last ? (C.light ? "#fffdf6" : "#11170c") : (C.light ? "#fffdf6" : "#eef2e0"), Math.min(1, g.life * 1.6));
    }
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
  }

  // ---- one frame
  let clock = 0, last = performance.now(), spawn = 0, running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    draw(dt);
    requestAnimationFrame(frame);
  }
  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(nebula, 0, 0, W, H);
    ctx.globalCompositeOperation = C.light ? "source-over" : "lighter";   // glowing in the dark, crisp in the light

    // stars
    const mr = small() ? 90 : 150;
    for (const s of stars) {
      s.a += s.w * dt * 0.35;
      let [x, y] = pos(s.d, s.a);
      if (mouse.on) {                                                // push stars away from the mouse, softly
        const dx = x + s.ox - mouse.x, dy = y + s.oy - mouse.y, dd = dx * dx + dy * dy;
        if (dd < mr * mr) { const f = (1 - Math.sqrt(dd) / mr) * 60 * dt; const l = Math.sqrt(dd) || 1; s.vx += dx / l * f * 9; s.vy += dy / l * f * 9; }
      }
      s.vx += -s.ox * 4 * dt; s.vy += -s.oy * 4 * dt;                // spring back home
      s.vx *= 0.9; s.vy *= 0.9; s.ox += s.vx * dt * 10; s.oy += s.vy * dt * 10;
      x += s.ox; y += s.oy;
      s.tw += dt * 2;
      const tw = 0.75 + 0.25 * Math.sin(s.tw);
      if (s.dust) {                                                  // soft glowing dust clouds along the arms
        ctx.globalAlpha = (C.light ? 0.10 : 0.13) * s.o; const ds = 18 + s.z * 34;
        ctx.drawImage(sprite, x - ds / 2, y - ds / 2, ds, ds);
      }
      ctx.globalAlpha = s.o * tw * (0.6 + 0.4 * (1 - Math.min(1, s.d)));
      ctx.fillStyle = s.gold ? C.gold : (s.z < 0.5 ? C.star : C.star2);
      const sz = s.s * (C.light ? 1.15 : 1);
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }

    // paths
    ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeStyle = C.path;
    for (const e of edges) {
      const c = curve(nodePos(nodes[e[0]], clock), nodePos(nodes[e[1]], clock));
      ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.quadraticCurveTo(c[1][0], c[1][1], c[2][0], c[2][1]); ctx.stroke();
    }

    // transactions
    spawn += dt;
    const every = small() ? 0.6 : 0.38;
    while (spawn > every) { spawn -= every; if (txs.length < 26) sendTx(); }
    for (let i = txs.length - 1; i >= 0; i--) {
      const tx = txs[i]; tx.t += tx.v * dt;
      const c = curve(nodePos(nodes[tx.a], clock), nodePos(nodes[tx.b], clock));
      if (tx.t >= 1) { const nd = nodes[tx.b]; nd.pulse = 1; nd.flash = 1; txs.splice(i, 1);
        if (Math.random() < 0.35 && txs.length < 26) sendTx(tx.b);       // sometimes the payment hops on
        continue; }
      for (let k = 0; k < 7; k++) {                                   // the comet tail
        const tt = Math.max(0, tx.t - k * 0.018), p = qb(c, tt);
        ctx.globalAlpha = (1 - k / 7) * 0.9; ctx.fillStyle = k === 0 ? (C.light ? "#fff6ef" : "#fff8dc") : C.gold;
        const r = k === 0 ? 2.6 : 2 - k * 0.22;
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0.4, r), 0, 6.283); ctx.fill();
      }
      if (Math.random() < 0.5) { const p = qb(c, tx.t); sparks.push({ x: p[0], y: p[1], vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, life: 1 }); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i]; sp.life -= dt * 1.6; if (sp.life <= 0) { sparks.splice(i, 1); continue; }
      sp.x += sp.vx * dt; sp.y += sp.vy * dt;
      ctx.globalAlpha = sp.life * 0.7; ctx.fillStyle = C.gold; ctx.fillRect(sp.x - 0.7, sp.y - 0.7, 1.4, 1.4);
    }

    // nodes: a soft core plus an expanding ring when a payment lands
    for (const nd of nodes) {
      const [x, y] = nodePos(nd, clock), base = nd.hub ? 6 : 3.6;
      nd.pulse = Math.max(0, nd.pulse - dt * 0.9); nd.flash = Math.max(0, nd.flash - dt * 2.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, base * (nd.hub ? 7 : 5));
      g.addColorStop(0, fade(C.gold, 0.9)); g.addColorStop(1, fade(C.gold, 0));
      ctx.globalAlpha = (C.light ? 0.35 : 0.45) + nd.flash * 0.5; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, base * (nd.hub ? 7 : 5), 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = C.light ? "#fff6ef" : "#fffbe8";   // bright core = the "shine"
      ctx.beginPath(); ctx.arc(x, y, base * (0.55 + nd.flash * 0.3), 0, 6.283); ctx.fill();
      if (nd.pulse > 0) {
        ctx.globalAlpha = nd.pulse * 0.8; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(x, y, (1 - nd.pulse) * 34 + base, ((1 - nd.pulse) * 34 + base) * 0.6, 0, 0, 6.283); ctx.stroke();
      }
    }
    // node names: tiny labels, so you can see where the money goes
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = C.label;
    for (const nd of nodes) {
      const [x, y] = nodePos(nd, clock);
      ctx.globalAlpha = 0.75 + nd.flash * 0.25;
      ctx.font = nd.hub ? "700 11px Inter, system-ui, sans-serif" : "500 10.5px Inter, system-ui, sans-serif";
      ctx.fillText(nd.name, x + (nd.hub ? 14 : 9), y + (nd.hub ? -12 : -8));
    }
    drawCards(dt);
    drawJourneys(dt);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  // ---- my signature: two orbit rings, with payment cards travelling around the galaxy
  const RINGS = [0.86, 1.2];
  const cards = [{ ring: 1, a: 0.4, v: 0.11 }, { ring: 1, a: 2.5, v: 0.11 }, { ring: 0, a: 4.4, v: -0.15 }, { ring: 1, a: 4.6, v: 0.11 }];
  function ringPath(d) {
    ctx.beginPath(); ctx.ellipse(CX, CY, d * R, d * R * TILT, ROT, 0, 6.283);
  }
  function drawCards(dt) {
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1; ctx.setLineDash([2, 7]);
    RINGS.forEach((d, i) => {
      ctx.lineDashOffset = -clock * (i ? 6 : -9);
      ctx.globalAlpha = C.light ? 0.32 : 0.28; ctx.strokeStyle = C.gold; ringPath(d); ctx.stroke();
    });
    ctx.setLineDash([]);
    for (const c of cards) {
      c.a += c.v * dt;
      const d = RINGS[c.ring], depth = (Math.sin(c.a) + 1) / 2;    // 0 = far side, 1 = near side
      const [x, y] = pos(d, c.a), sc = (small() ? 0.75 : 1) * (0.7 + depth * 0.5);
      for (let k = 1; k <= 14; k++) {                               // a light trail behind each card
        const [tx, ty] = pos(d, c.a - Math.sign(c.v) * k * 0.012);
        ctx.globalAlpha = (1 - k / 14) * 0.35 * (0.5 + depth / 2); ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.arc(tx, ty, 1.6 * sc, 0, 6.283); ctx.fill();
      }
      ctx.save(); ctx.translate(x, y); ctx.rotate(ROT + Math.cos(c.a) * 0.25); ctx.scale(sc, sc);
      ctx.globalAlpha = 0.55 + depth * 0.45;
      ctx.shadowColor = C.gold; ctx.shadowBlur = 14;
      const g = ctx.createLinearGradient(-15, -10, 15, 10);
      g.addColorStop(0, C.light ? C.star : fade(C.star2, 1)); g.addColorStop(1, C.gold);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-15, -9.5, 30, 19, 3.5); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,248,225,.9)"; ctx.fillRect(-11, -4, 6, 4.6);            // the chip
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(-11, 3.5, 15, 1.6);         // the number line
      ctx.restore();
    }
  }

  // ---- start, pause when hidden, calm still picture for "reduce motion"
  readTheme(); resize();
  window.addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  document.addEventListener("themechange", readTheme);
  if (reduceMotion) { for (let i = 0; i < 8; i++) { sendTx(); txs[txs.length - 1] && (txs[txs.length - 1].t = Math.random() * 0.9); } draw(0); return; }
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);
})();
