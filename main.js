// The page's moving parts: theme switch, scroll effects, the project dock + case panel, and each section's own graphic.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const narrow = () => window.innerWidth <= 760;

  // ---------- dark / light switch (remembered in this browser)
  $("#theme").addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    $('meta[name="theme-color"]').content = next === "light" ? "#f5f2e7" : "#0b0f08";
    document.dispatchEvent(new Event("themechange"));
  });

  // ---------- things fade / rise in as they come into view
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$(".rv").forEach(el => io.observe(el));

  // ================= PROJECTS (opened from the dock, the reel and the Billeaf stack) =================
  const shot = n => `assets/shots/${n}.jpg`;
  const STORIES = {
    intro: { label: "About", icon: "👋", sub: "Intro", slides: [
      { big: "👋", h: "Hi, I'm Rihan", p: "Nine years where the money moves — restaurants, buy-now-pay-later, and now card issuing." },
      { h: "I notice the slow parts.", p: "The work that slows a team down is usually repetitive, manual and easy to get wrong. So I build the fix myself — and hand it to the whole team.", g: "g2" },
      { h: "Sample data only 🔒", p: "Fictional clients, people and numbers. The tools are real — the data isn't.", g: "g3" } ] },
    notifier: { label: "Notifier", thumb: shot("notifier-home"), sub: "Desktop app", slides: [
      { img: "notifier-home", c: "Home — everything that needs you, in one place" },
      { img: "notifier-ai", c: "AI suggestion — next steps and a ready reply" },
      { img: "notifier-noreply", c: "No reply 24h+ — nothing gets forgotten" },
      { img: "notifier-report", c: "Team report — SLA met, breached, fastest to close" },
      { img: "notifier-clients", c: "Clients — every open ticket per client" },
      { img: "notifier-unassigned", c: "Unassigned — tickets nobody owns yet" } ] },
    bulkrun: { label: "Bulk Run", thumb: shot("bulkrun-home"), sub: "Desktop app", slides: [
      { img: "bulkrun-home", c: "Home — every bulk task one click away" },
      { img: "bulkrun-file", c: "Choose a file — checked and previewed instantly" },
      { img: "bulkrun-checks", c: "Pre-run checks — nothing runs until it's safe" },
      { img: "bulkrun-paused", c: "Internet drops — the run pauses and carries on" },
      { img: "bulkrun-done", c: "Done — counts, Excel report and full history" } ] },
    ai: { label: "Local AI", icon: "🤖", sub: "Automation", slides: [
      { big: "🤖", h: "A private AI on the laptop", p: "Open-source and free. It runs offline — nothing leaves the computer." },
      { h: "It follows our playbook.", p: "An editable team playbook, plus how we replied to similar cases before → next steps and a draft reply in seconds.", g: "g2" } ] },
    statements: { label: "Statements", icon: "📄", sub: "Automation", slides: [
      { big: "📄", h: "Statements in minutes", p: "Raw exports in. A summary plus one sheet per user for business clients, or a branded PDF for cardholders, out.", g: "g2" } ] },
    billeaf: { label: "Billeaf", thumb: shot("billeaf-billing"), sub: "Personal project", slides: [
      { img: "billeaf-billing", c: "Billing — tap items, the bill builds itself" },
      { img: "billeaf-pay", c: "Charge — cash, card, split or pay later" },
      { img: "billeaf-reports", c: "Reports — sales, profit and VAT by day" },
      { img: "billeaf-products", c: "Menu items — prices, margins and tax" },
      { img: "billeaf-sales", c: "Sales history — every bill, searchable" } ] },
  };
  const ORDER = Object.keys(STORIES);

  // the project dock under the intro (rectangular tiles, numbered)
  const dock = $("#dock");
  ORDER.forEach((k, n) => {
    const s = STORIES[k], b = document.createElement("button");
    b.className = "dk"; b.dataset.story = k; b.setAttribute("aria-label", `Open project: ${s.label}`);
    b.innerHTML = `<span class="th" ${s.thumb ? `style="background-image:url('${s.thumb}')"` : ""}>${s.thumb ? "" : s.icon}</span><small>${String(n + 1).padStart(2, "0")} · ${s.sub.toUpperCase()}</small><b>${s.label}</b>`;
    dock.appendChild(b);
  });

  // the case panel: a drawer that slides in from the right
  const wrap = document.createElement("div"); wrap.className = "cp-wrap"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", "Project");
  wrap.innerHTML = `<div class="cp-shade"></div><aside class="cp">
    <div class="cp-head"><div><div class="cp-k"></div><h3></h3></div><button class="cp-x" aria-label="Close">✕</button></div>
    <div class="cp-body"><div class="cp-view"></div>
      <div class="cp-row"><button class="sh-btn cp-p" aria-label="Previous">←</button><div class="cp-cap"></div><span class="cp-count"></span><button class="sh-btn cp-n" aria-label="Next">→</button></div>
      <div class="cp-strip"></div></div>
    <div class="cp-foot"><button class="btn cp-prev">← Previous project</button><button class="btn primary cp-next">Next project →</button></div></aside>`;
  document.body.appendChild(wrap);
  const view = $(".cp-view", wrap), strip = $(".cp-strip", wrap);
  let cur = null, si = 0, lastFocus = null;
  function drawSlide() {
    const s = STORIES[cur], sl = s.slides[si], n = ORDER.indexOf(cur);
    view.innerHTML = sl.img
      ? `<img src="${shot(sl.img)}" alt="${sl.c} (sample data)">`
      : `<div class="cp-text ${sl.g || ""}">${sl.big ? `<div class="big">${sl.big}</div>` : ""}<h4>${sl.h}</h4><p>${sl.p}</p></div>`;
    $(".cp-cap", wrap).textContent = sl.img ? sl.c : sl.h;
    $(".cp-count", wrap).textContent = `${String(si + 1).padStart(2, "0")} / ${String(s.slides.length).padStart(2, "0")}`;
    $$("button", strip).forEach((b, k) => b.classList.toggle("on", k === si));
    $(".cp-p", wrap).disabled = $(".cp-n", wrap).disabled = s.slides.length < 2;
    $(".cp-prev", wrap).style.visibility = n > 0 ? "" : "hidden";
    $(".cp-next", wrap).textContent = n < ORDER.length - 1 ? `Next: ${STORIES[ORDER[n + 1]].label} →` : "Close ✕";
  }
  function openStory(k, i = 0) {
    if (!wrap.classList.contains("open")) lastFocus = document.activeElement;
    cur = k; si = i;
    const s = STORIES[k];
    $(".cp-k", wrap).textContent = `PROJECT ${String(ORDER.indexOf(k) + 1).padStart(2, "0")} · ${s.sub.toUpperCase()}`;
    $("h3", wrap).textContent = s.label;
    strip.innerHTML = s.slides.map((sl, j) => `<button aria-label="Show ${j + 1}" data-j="${j}" ${sl.img ? `style="background-image:url('${shot(sl.img)}')"` : ""}>${sl.img ? "" : (sl.big || "✦")}</button>`).join("");
    strip.style.display = s.slides.length > 1 ? "" : "none";
    drawSlide();
    wrap.classList.add("open"); document.body.style.overflow = "hidden"; $(".cp-x", wrap).focus({ preventScroll: true });
  }
  function closeStory() { wrap.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus({ preventScroll: true }); }
  function jump(d) { const n = ORDER.indexOf(cur) + d; if (n < 0 || n >= ORDER.length) return closeStory(); openStory(ORDER[n]); }
  function step(d) { const L = STORIES[cur].slides.length; si = (si + d + L) % L; drawSlide(); }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-story]"); if (!t || wrap.contains(t)) return;
    openStory(t.dataset.story, +(t.dataset.i || 0));
  });
  $(".cp-x", wrap).onclick = closeStory; $(".cp-shade", wrap).onclick = closeStory;
  $(".cp-p", wrap).onclick = () => step(-1); $(".cp-n", wrap).onclick = () => step(1);
  $(".cp-prev", wrap).onclick = () => jump(-1); $(".cp-next", wrap).onclick = () => jump(1);
  strip.addEventListener("click", e => { const b = e.target.closest("button"); if (b) { si = +b.dataset.j; drawSlide(); } });
  let vx = null;   // swipe the picture left / right, or click it for the next one
  view.addEventListener("pointerdown", e => { vx = e.clientX; });
  view.addEventListener("pointerup", e => { if (vx === null) return; const dx = e.clientX - vx; vx = null; if (STORIES[cur].slides.length > 1) step(Math.abs(dx) > 50 && dx > 0 ? -1 : 1); });
  document.addEventListener("keydown", e => {
    if (!wrap.classList.contains("open")) return;
    if (e.key === "Escape") closeStory(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
  });

  // ================= headline numbers count up when they come into view =================
  const co = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting || reduce) return; co.unobserve(en.target);
    const el = en.target, to = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "", t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / 1600), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = pre + v + suf; if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach(el => co.observe(el));

  // ================= 01 NOTIFIER: the device shows the picture for the step you're reading =================
  const imgs = $$(".screens img"), steps = $$(".step");
  const stepIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    steps.forEach(s => s.classList.toggle("on", s === e.target));
    const k = +e.target.dataset.shot; imgs.forEach((im, i) => im.classList.toggle("on", i === k));
  }), { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => stepIO.observe(s)); steps[0].classList.add("on");

  // desktop pop-ups slide in beside the device (fictional clients and people)
  const POPS = [
    ["🔔 New ticket · Northwind Pay", "Card declined at checkout"],
    ["⏰ SLA breach in 30 min", "Bluefin Wallet · fund load query"],
    ["@ Sara Khan mentioned you", "“Can you check this refund?”"],
    ["🚨 Client incident", "Northwind Pay · settlement delay"],
    ["✦ AI reply ready", "Refund status · 3 next steps"],
    ["💬 Alex Morgan replied", "Ticket moved to Waiting for client"],
  ];
  const pops = $("#pops"); let pi = 0, popT = 0;
  function addPop() {
    const [b, t] = POPS[pi++ % POPS.length], el = document.createElement("div");
    el.className = "pop"; el.innerHTML = `<b>${b}</b>${t}`; pops.prepend(el);
    const all = $$(".pop", pops); if (all.length > 3) { const old = all[all.length - 1]; old.classList.add("out"); setTimeout(() => old.remove(), 400); }
  }
  new IntersectionObserver(es => es.forEach(e => {
    clearInterval(popT); if (e.isIntersecting && !reduce) { addPop(); popT = setInterval(addPop, 2600); }
  }), { threshold: 0.2 }).observe($(".device"));

  // ================= 02 BULK RUN: the reel slides sideways while you scroll down =================
  const bulk = $("#bulk"), reel = $("#reel");
  const fitFrames = () => $$(".frame").forEach(f => { const ifr = $("iframe", f); if (ifr) ifr.style.transform = `scale(${f.clientWidth / 1440})`; });
  function sizeBulk() {
    if (narrow() || reduce) { bulk.style.height = ""; reel.style.transform = ""; return; }
    const extra = Math.max(0, reel.scrollWidth - window.innerWidth);
    bulk.style.height = (window.innerHeight + extra) + "px"; bulk.dataset.extra = extra;
  }
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$("iframe[data-src]", bulk).forEach(f => { f.src = f.dataset.src; f.removeAttribute("data-src"); }); fitFrames(); } }),
    { rootMargin: "300px" }).observe(bulk);

  // ================= 03 LAB: the chat plays itself =================
  const chat = $("#chat");
  new IntersectionObserver((es, ob) => es.forEach(e => {
    if (!e.isIntersecting) return; ob.disconnect();
    const m = $$(".msg", chat), at = (ms, fn) => setTimeout(fn, reduce ? 0 : ms);
    at(200, () => m[0].classList.add("show"));
    at(900, () => m[1].classList.add("show"));
    at(2300, () => { m[1].classList.add("gone"); m[2].classList.add("show"); });
    at(3100, () => m[3].classList.add("show"));
  }), { threshold: 0.4 }).observe(chat);

  // ================= 05 BILLEAF: a stack of screens that shuffles =================
  const B = STORIES.billeaf.slides, stack = $("#stack"), shN = $("#shN"), shCap = $("#shCap");
  stack.innerHTML = B.map((s, i) => `<figure class="sc" data-k="${i}"><img src="${shot(s.img)}" alt="${s.c} (sample data)" loading="lazy"></figure>`).join("");
  const cards = $$(".sc", stack);
  let bi = 0, bT = 0, bHover = false, bSeen = false, busy = false;
  function layout() {
    cards.forEach((c, k) => c.dataset.p = (k - bi + B.length) % B.length);
    shN.textContent = `${String(bi + 1).padStart(2, "0")} / ${String(B.length).padStart(2, "0")}`; shCap.textContent = B[bi].c; bsched();
  }
  function bgo(d) {
    if (busy) return;
    if (reduce) { bi = (bi + d + B.length) % B.length; return layout(); }
    busy = true;
    if (d > 0) {                    // the top card flies off, then tucks in at the back
      const top = cards[bi]; top.classList.add("fly");
      setTimeout(() => { bi = (bi + 1) % B.length; top.classList.remove("fly"); layout(); busy = false; }, 420);
    } else { bi = (bi - 1 + B.length) % B.length; layout(); setTimeout(() => busy = false, 300); }
  }
  function bsched() { clearTimeout(bT); if (!bHover && bSeen && !reduce) bT = setTimeout(() => bgo(1), 3800); }
  stack.addEventListener("mouseenter", () => { bHover = true; clearTimeout(bT); });
  stack.addEventListener("mouseleave", () => { bHover = false; bsched(); });
  new IntersectionObserver(es => es.forEach(e => { bSeen = e.isIntersecting; bsched(); }), { threshold: 0.4 }).observe(stack);
  $("#shNext").onclick = () => bgo(1); $("#shPrev").onclick = () => bgo(-1);
  let px = null;
  stack.addEventListener("pointerdown", e => { px = e.clientX; });
  stack.addEventListener("pointerup", e => {
    if (px === null) return; const dx = e.clientX - px; px = null;
    if (Math.abs(dx) > 40) return bgo(dx < 0 ? 1 : -1);
    openStory("billeaf", bi);       // a click opens it in the case panel
  });
  layout();

  // ================= one scroll loop for everything that follows the scroll =================
  const prog = $("#prog"), nav = $("#nav"), flow = $("#flow"), fss = $$(".fs", flow), mq = $("#mq"), par = $$("[data-speed]");
  let mqX = 0, lastY = window.scrollY, vel = 0, t0 = performance.now();
  function onScroll() {
    const y = window.scrollY, vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("scrolled", y > 30);
    // Bulk Run reel
    if (!narrow() && !reduce) {
      const extra = +bulk.dataset.extra || 0, top = bulk.offsetTop;
      const p = clamp((y - top) / Math.max(1, extra));
      reel.style.transform = `translateX(${-p * extra}px)`;
    }
    // How I work line
    const r = flow.getBoundingClientRect();
    const p = clamp((vh * 0.78 - r.top) / (r.height + vh * 0.25));
    flow.style.setProperty("--p", p.toFixed(3));
    fss.forEach((f, i) => f.classList.toggle("on", p >= (i / (fss.length - 1)) * 0.92 + 0.02));
    // gentle parallax
    par.forEach(el => { const rr = el.parentElement.getBoundingClientRect(); el.style.transform = `translateY(${(rr.top + rr.height / 2 - vh / 2) * +el.dataset.speed}px)`; });
  }
  let ticking = false;
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  window.addEventListener("resize", () => { sizeBulk(); fitFrames(); onScroll(); });

  // the big "Let's talk" marquee: always moving, faster when you scroll
  function marquee(now) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const y = window.scrollY; vel = vel * 0.9 + (y - lastY) * 0.1; lastY = y;
    mqX -= (40 + Math.abs(vel) * 6) * dt;
    const half = mq.scrollWidth / 2; if (half && -mqX > half) mqX += half;
    mq.style.transform = `translateX(${mqX}px)`;
    requestAnimationFrame(marquee);
  }
  if (!reduce) requestAnimationFrame(marquee);

  // phones: the hint talks about touching instead of clicking
  if (window.matchMedia("(pointer: coarse)").matches) $("#hint").innerHTML = "✦ Tap the galaxy — send a <b>payment</b> through operations";

  $("#yr").textContent = new Date().getFullYear();
  window.addEventListener("load", () => { sizeBulk(); fitFrames(); onScroll(); });
  sizeBulk(); onScroll();
})();
