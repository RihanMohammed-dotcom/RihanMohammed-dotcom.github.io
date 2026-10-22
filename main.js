// Small helpers for the page: dark/light switch, the top bar, fade-in on scroll, slideshows, the picture viewer and counters.
(() => {
  const root = document.documentElement;

  // dark / light switch (remembered in this browser)
  document.getElementById("theme").addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    document.querySelector('meta[name="theme-color"]').content = next === "light" ? "#f5f2e7" : "#0b0f08";
    document.dispatchEvent(new Event("themechange"));      // tells the galaxy to change colours
  });

  // the top bar gets a background once you scroll
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 30);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // sections fade in as they come into view
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".rv").forEach(el => io.observe(el));

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // live demo frames: the app is drawn at 1440×900 and scaled to fit its box
  const fitFrames = () => document.querySelectorAll(".sl .frame, .lb .lframe").forEach(f => {
    const ifr = f.querySelector("iframe"); if (ifr) ifr.style.transform = `scale(${f.clientWidth / 1440})`;
  });
  window.addEventListener("resize", fitFrames);

  // ---- slideshows: change picture every few seconds, like an ad; pause on hover; swipe on phones
  const shows = [...document.querySelectorAll(".show")].map(el => {
    const slides = [...el.querySelectorAll(".sl")], dots = el.querySelector(".dots");
    slides.forEach((_, i) => { const b = document.createElement("button"); b.setAttribute("aria-label", `Picture ${i + 1}`); b.innerHTML = "<i></i>"; b.onclick = e => { e.stopPropagation(); go(i); }; dots.appendChild(b); });
    const db = [...dots.children];
    let idx = 0, timer = 0, left = 0, started = 0, hover = false, seen = false;
    const dwell = i => +(slides[i].dataset.dwell || 3800);
    function go(i, auto) {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle("on", k === idx));
      db.forEach((d, k) => { d.classList.toggle("on", k === idx); d.classList.toggle("done", k < idx); d.querySelector("i").style.animation = "none"; });
      void dots.offsetWidth; const cur = db[idx].querySelector("i"); cur.style.animation = "";
      db[idx].style.setProperty("--dur", dwell(idx) + "ms");
      const img = slides[idx].querySelector("img"); if (img) { img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; }
      left = dwell(idx); schedule();
    }
    function schedule() { clearTimeout(timer); if (hover || !seen || reduce) return; started = Date.now(); timer = setTimeout(() => go(idx + 1, true), left); }
    function pause() { hover = true; el.classList.add("paused"); clearTimeout(timer); left = Math.max(400, left - (Date.now() - started)); }
    function resume() { hover = false; el.classList.remove("paused"); schedule(); }
    el.addEventListener("mouseenter", pause); el.addEventListener("mouseleave", resume);
    el.querySelector(".prev").onclick = e => { e.stopPropagation(); go(idx - 1); };
    el.querySelector(".next").onclick = e => { e.stopPropagation(); go(idx + 1); };
    let x0 = null;
    el.addEventListener("pointerdown", e => { x0 = e.clientX; });
    el.addEventListener("pointerup", e => {
      if (x0 === null) return; const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); el.dataset.swiped = Date.now(); }
    });
    el.addEventListener("click", e => { if (Date.now() - (+el.dataset.swiped || 0) < 400) return; openLB(api, idx); });
    // start only when it scrolls into view; load the live demo then too
    new IntersectionObserver(es => es.forEach(en => {
      seen = en.isIntersecting;
      if (seen) { el.querySelectorAll("iframe[data-src]").forEach(f => { f.src = f.dataset.src; f.removeAttribute("data-src"); }); fitFrames(); }
      if (seen) { if (!hover) schedule(); } else clearTimeout(timer);
    }), { threshold: 0.35 }).observe(el);
    const api = { slides, go: i => go(i), pause, resume, get idx() { return idx; } };
    go(0);
    return api;
  });

  // ---- full-screen viewer
  const lb = document.createElement("div"); lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Picture viewer");
  lb.innerHTML = `<div class="lb-top"><span class="n"></span><span class="cap"></span><button class="lb-x">Close ✕</button></div>
    <div class="lb-stage"><button class="lb-nav prev" aria-label="Previous">‹</button><div class="lb-c"></div><button class="lb-nav next" aria-label="Next">›</button></div>`;
  document.body.appendChild(lb);
  const stage = lb.querySelector(".lb-stage"), box = lb.querySelector(".lb-c");
  let cur = null, ci = 0;
  function draw() {
    const s = cur.slides[ci]; stage.classList.remove("big");
    lb.querySelector(".n").textContent = `${ci + 1} / ${cur.slides.length}`;
    lb.querySelector(".cap").textContent = s.querySelector("figcaption").textContent.replace("● LIVE", "Live · ");
    if (s.dataset.live) { box.innerHTML = `<div class="lframe"><iframe src="${s.dataset.live}" title="Live demo"></iframe></div>`; fitFrames(); }
    else { const im = s.querySelector("img"); box.innerHTML = `<img src="${im.src}" alt="${im.alt}">`;
      box.querySelector("img").onclick = () => stage.classList.toggle("big"); }
  }
  function openLB(show, i) { cur = show; ci = i; show.pause(); draw(); lb.classList.add("open"); document.body.style.overflow = "hidden"; lb.querySelector(".lb-x").focus(); }
  function closeLB() { lb.classList.remove("open"); document.body.style.overflow = ""; box.innerHTML = ""; if (cur) { cur.go(ci); cur.resume(); } }
  const step = d => { ci = (ci + d + cur.slides.length) % cur.slides.length; draw(); };
  lb.querySelector(".lb-x").onclick = closeLB;
  lb.querySelector(".lb-nav.prev").onclick = () => step(-1); lb.querySelector(".lb-nav.next").onclick = () => step(1);
  stage.addEventListener("click", e => { if (e.target === stage) closeLB(); });
  document.addEventListener("keydown", e => { if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLB(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); });
  let lx = null;
  stage.addEventListener("pointerdown", e => { lx = e.clientX; });
  stage.addEventListener("pointerup", e => { if (lx !== null && !stage.classList.contains("big") && Math.abs(e.clientX - lx) > 50) step(e.clientX < lx ? 1 : -1); lx = null; });

  // ---- numbers count up when they come into view
  const co = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return; co.unobserve(en.target);
    const el = en.target, to = +el.dataset.count, suf = el.dataset.suf || "", t0 = performance.now();
    if (reduce) return;
    const tickN = now => { const k = Math.min(1, (now - t0) / 1400), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = v + suf; if (k < 1) requestAnimationFrame(tickN); };
    requestAnimationFrame(tickN);
  }), { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach(el => co.observe(el));

  if (window.matchMedia("(pointer: coarse)").matches)          // phones and tablets
    document.getElementById("hint").innerHTML = "✦ Touch the galaxy — every <b>spark</b> is a payment.";

  document.getElementById("yr").textContent = new Date().getFullYear();
})();
