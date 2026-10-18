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
  fill("[data-date-day]", cfg.dateDay);
  fill("[data-date-month]", cfg.dateMonth);
  fill("[data-date-year]", cfg.dateYear);
  document.querySelectorAll("[data-time]").forEach((el) => {
    el.textContent = (cfg.times || {})[el.dataset.time] || "";
  });

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
    revealDate.classList.remove("complete");
    scratches.forEach((s) => s.reset());
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
  document.querySelectorAll(".arrived, .reveal-up").forEach((el) => io.observe(el));

  // ---- Scratch to reveal the date ----
  const revealDate = document.getElementById("revealDate");
  const scratches = [...document.querySelectorAll("[data-scratch]")].map((el) => {
    const canvas = el.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let size = 0, down = false, last = null, done = false, moves = 0, lastFlake = 0;

    // The rose-gold coating: a glossy sphere with a fine foil grain
    function paint() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = el.clientWidth;
      canvas.width = canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createRadialGradient(size * .36, size * .3, size * .04, size * .5, size * .5, size * .62);
      g.addColorStop(0, "#fff3e0");
      g.addColorStop(.28, "#f4c79b");
      g.addColorStop(.62, "#dd9a6a");
      g.addColorStop(1, "#a9643f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < size * 6; i++) {           // foil grain
        ctx.fillStyle = `rgba(${Math.random() < .5 ? "255,240,220" : "120,60,30"},${Math.random() * .12})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
      }
      const hl = ctx.createRadialGradient(size * .34, size * .26, 0, size * .34, size * .26, size * .22);
      hl.addColorStop(0, "rgba(255,255,255,.75)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, size, size);
    }

    const point = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    function flake(p) {
      const now = performance.now();
      if (reduced || now - lastFlake < 40) return;
      lastFlake = now;
      const host = revealDate.getBoundingClientRect();
      const r = canvas.getBoundingClientRect();
      const f = document.createElement("span");
      f.className = "flake";
      f.style.left = `${r.left - host.left + p.x}px`;
      f.style.top = `${r.top - host.top + p.y}px`;
      f.style.setProperty("--s", `${2 + Math.random() * 3}px`);
      f.style.setProperty("--dx", `${(Math.random() - .5) * 40}px`);
      f.style.setProperty("--r", `${Math.random() * 360}deg`);
      revealDate.appendChild(f);
      setTimeout(() => f.remove(), 950);
    }

    function scratchTo(p) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = ctx.lineJoin = "round";
      ctx.lineWidth = size * .26;
      ctx.beginPath();
      ctx.moveTo((last || p).x, (last || p).y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      flake(p);
      if (++moves % 6 === 0) check();
    }

    // Share of the coating already cleared (sampled, inside the circle only)
    function check() {
      const { width: w, height: h } = canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      let total = 0, clear = 0;
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const dx = x - w / 2, dy = y - h / 2;
          if (dx * dx + dy * dy > (w / 2) * (w / 2)) continue;
          total++;
          if (data[(y * w + x) * 4 + 3] < 40) clear++;
        }
      }
      if (clear / total > 0.5) finish();
    }

    function finish() {
      if (done) return;
      done = true;
      el.classList.add("done");
      if (navigator.vibrate) navigator.vibrate(12);
      if (scratches.every((s) => s.isDone())) {
        revealDate.classList.add("complete");
        if (navigator.vibrate) navigator.vibrate([20, 60, 30]);
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (done) return;
      down = true; last = null;
      canvas.setPointerCapture(e.pointerId);
      scratchTo(point(e));
    });
    canvas.addEventListener("pointermove", (e) => { if (down && !done) scratchTo(point(e)); });
    const up = () => { if (down) { down = false; last = null; if (!done) check(); } };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    paint();
    return {
      isDone: () => done,
      reset() { done = false; moves = 0; el.classList.remove("done"); paint(); },
      repaint() { if (!done && moves === 0) paint(); },
    };
  });
  window.addEventListener("resize", () => scratches.forEach((s) => s.repaint()));

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
