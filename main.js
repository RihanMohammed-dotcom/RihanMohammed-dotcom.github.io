// Small helpers for the page: dark/light switch, the top bar, fade-in on scroll, screenshot tabs.
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

  // screenshot tabs on the Notifier project
  const img = document.getElementById("nm-img");
  document.querySelectorAll("#nm .tabs button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#nm .tabs button").forEach(x => x.classList.toggle("on", x === b));
    img.style.opacity = 0;
    setTimeout(() => { img.src = b.dataset.src; img.alt = "Ops Notifier — " + b.textContent + " (sample data)"; img.style.opacity = 1; }, 160);
  }));
  img.style.transition = "opacity .16s";

  if (window.matchMedia("(pointer: coarse)").matches)          // phones and tablets
    document.getElementById("hint").innerHTML = "✦ Touch the galaxy — every <b>spark</b> is a payment.";

  document.getElementById("yr").textContent = new Date().getFullYear();
})();
