(() => {
  const cfg = window.WEDDING || {};
  const root = document.documentElement;
  const stage = document.getElementById("stage");
  const seal = document.getElementById("seal");
  const replay = document.getElementById("replay");
  const music = document.getElementById("music");

  // ---- Fill couple details from config.js ----
  const fill = (sel, text) => document.querySelectorAll(sel).forEach((el) => (el.textContent = text || ""));
  fill("[data-name1]", cfg.name1);
  fill("[data-name2]", cfg.name2);
  // Initials: render the "&" in the decorative ampersand font
  document.querySelectorAll("[data-initials]").forEach((el) => {
    const [a, b] = (cfg.initials || "").split("&");
    el.textContent = a || "";
    if (b !== undefined) {
      const amp = document.createElement("span");
      amp.className = "amp";
      amp.textContent = "&";
      el.append(amp, b);
    }
  });
  fill("[data-date]", cfg.dateText);

  // ---- Use the generated art only once it has loaded; CSS fallbacks otherwise ----
  const useImage = (src, cls) => {
    const img = new Image();
    img.onload = () => root.classList.add(cls);
    img.src = src;
  };
  useImage("assets/paper.webp?v=2", "has-paper");
  useImage("assets/seal.webp?v=2", "has-seal");

  // ---- Gold sparkles for the dissolve ----
  const sparkles = document.getElementById("sparkles");
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${20 + Math.random() * 70}%`;
    s.style.setProperty("--s", `${3 + Math.random() * 5}px`);
    s.style.setProperty("--d", `${4 + Math.random() * 4}s`);
    s.style.setProperty("--delay", `${Math.random() * 3}s`);
    sparkles.appendChild(s);
  }

  // ---- Open sequence ----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = reduced
    ? { press: 0, glow: 0, wash: 0, slide: 0, reveal: 0, done: 0 }
    : { press: 140, glow: 2650, wash: 2250, slide: 1300, reveal: 2300, done: 3700 };
  let timers = [];
  let opened = false;

  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  function open() {
    if (opened) return;
    opened = true;

    if (navigator.vibrate) navigator.vibrate(15);
    if (cfg.music) {
      music.src = cfg.music;
      music.volume = 0.6;
      music.play().catch(() => {});
    }

    stage.classList.add("is-pressed");
    // The seal lights up from within, then breaks open
    later(T.press, () => {
      stage.classList.remove("is-pressed");
      stage.classList.add("is-glowing");
    });
    later(T.press + T.wash, () => stage.classList.add("is-washed"));
    const t0 = T.press + T.glow;
    later(t0, () => stage.classList.add("is-open"));
    later(t0 + T.slide, () => stage.classList.add("is-slide"));
    later(t0 + T.reveal, () => {
      stage.classList.add("is-reveal");
      invite.setAttribute("aria-hidden", "false");
    });
    later(t0 + T.done, () => {
      stage.classList.add("is-done");
      replay.hidden = false;
      document.dispatchEvent(new CustomEvent("invitation:opened"));
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    music.pause();
    invite.scrollTop = 0;
    invite.setAttribute("aria-hidden", "true");
    heroBg.style.translate = "";
    document.querySelectorAll(".in-view").forEach((el) => el.classList.remove("in-view"));
    replay.hidden = true;
    stage.classList.remove("is-pressed", "is-glowing", "is-washed", "is-open", "is-slide", "is-reveal", "is-done");
    opened = false;
  }

  // ---- Invitation: parallax hero + sections that press in as they scroll into view ----
  const invite = document.getElementById("invite");
  const heroBg = document.getElementById("heroBg");
  if (!reduced) {
    invite.addEventListener("scroll", () => {
      heroBg.style.translate = `0 ${invite.scrollTop * 0.25}px`;
    }, { passive: true });
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.isIntersecting && e.target.classList.add("in-view"));
  }, { root: invite, threshold: 0.12 });
  document.querySelectorAll(".arrived").forEach((el) => io.observe(el));

  seal.addEventListener("click", open);

  // Dev aid: ?skip jumps straight to the opened invitation
  if (new URLSearchParams(location.search).has("skip")) {
    opened = true;
    stage.classList.add("is-open", "is-slide", "is-reveal", "is-done");
    invite.setAttribute("aria-hidden", "false");
    replay.hidden = false;
  }

  // Dev aid: ?freeze=<ms> plays the open sequence and freezes it <ms> after the flap
  // starts moving, so a single frame can be inspected or screenshotted.
  const freeze = new URLSearchParams(location.search).get("freeze");
  if (freeze !== null) {
    stage.classList.add("is-glowing", "is-washed", "is-open");
    const extra = new URLSearchParams(location.search).get("with");
    if (extra) extra.split(",").forEach((c) => stage.classList.add(`is-${c}`));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getAnimations().forEach((a) => { a.pause(); a.currentTime = Number(freeze); });
    }));
  }
  replay.addEventListener("click", reset);
})();
