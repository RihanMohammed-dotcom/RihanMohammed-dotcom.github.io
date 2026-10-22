/*
  Payment flow galaxy
  -------------------
  Thousands of tiny stars orbit slowly like a spiral galaxy. A few bright "nodes" (think: banks, wallets,
  merchants) ride along with the galaxy, connected by faint glowing paths. Every moment, a "transaction"
  leaves one node and travels along a path to another, leaving a trail of sparks. When it arrives, the
  node pulses. Stars move out of the way of your mouse (or finger) and drift back. Click to send a burst.

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
          glow: v("--g-glow"), glow2: v("--g-glow2"), light: document.documentElement.dataset.theme === "light" };
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
    CX = small() ? W * 0.5 : W * 0.66; CY = small() ? H * 0.26 : H * 0.5;
    R = Math.min(W * (small() ? 0.6 : 0.36), H * (small() ? 0.5 : 0.6));
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
  const ARMS = 3, TILT = 0.5;            // TILT squashes the circle into an ellipse, so it looks 3-D
  let stars = [];
  function makeStars() {
    let n = Math.round(Math.min(3400, Math.max(800, (W * H) / 420)));
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
  function makeNetwork() {
    nodes = [{ d: 0, a: 0, hub: true, pulse: 0, flash: 0 }];       // the centre: the "core"
    const count = small() ? 6 : 8;
    for (let i = 0; i < count; i++)
      nodes.push({ d: 0.42 + (i % 2) * 0.3 + Math.random() * 0.06, a: (i / count) * Math.PI * 2 + Math.random() * 0.3, pulse: 0, flash: 0 });
    edges = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push([0, i]);                                            // every node talks to the core
      edges.push([i, i + 1 < nodes.length ? i + 1 : 1]);             // and to its neighbour
    }
    edges.push([1, 1 + Math.floor((nodes.length - 1) / 2)]);              // one long route across the galaxy
  }
  const pos = (d, a) => [CX + Math.cos(a) * d * R, CY + Math.sin(a) * d * R * TILT];
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
  canvas.addEventListener("click", e => {                            // click: burst of transactions from the nearest node
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, t = clock;
    let best = 0, bd = 1e9;
    nodes.forEach((nd, i) => { const p = nodePos(nd, t), dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < bd) { bd = dd; best = i; } });
    for (let i = 0; i < 6; i++) sendTx(best);
    nodes[best].pulse = 1; nodes[best].flash = 1;
  });

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
        ctx.globalAlpha = (1 - k / 7) * 0.9; ctx.fillStyle = k === 0 ? (C.light ? C.gold : "#fff8dc") : C.gold;
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
      ctx.globalAlpha = 1; ctx.fillStyle = C.light ? C.gold : "#fffbe8";
      ctx.beginPath(); ctx.arc(x, y, base * (0.55 + nd.flash * 0.3), 0, 6.283); ctx.fill();
      if (nd.pulse > 0) {
        ctx.globalAlpha = nd.pulse * 0.8; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(x, y, (1 - nd.pulse) * 34 + base, ((1 - nd.pulse) * 34 + base) * 0.6, 0, 0, 6.283); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
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
