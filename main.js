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

  // ---- Gold dust: glittering particles rising out of the envelope ----
  const dust = (() => {
    const canvas = document.getElementById("dust");
    const ctx = canvas.getContext("2d");
    const COLORS = ["255,248,222", "255,232,170", "246,210,128", "232,186,92"];
    let parts = [], raf = 0, emitUntil = 0, w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (burst) => {
      // born near the tip of the V, a few along its edges
      const t = Math.random();
      const edge = Math.random() < 0.35;
      const x = edge ? w * (0.5 + (Math.random() < 0.5 ? -1 : 1) * t * 0.5) : w * (0.5 + (Math.random() - 0.5) * 0.25);
      const y = edge ? h * (0.54 - t * 0.24) : h * (0.52 + Math.random() * 0.04);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (burst ? 2.6 : 1.4);
      const speed = burst ? 160 + Math.random() * 280 : 40 + Math.random() * 70;
      parts.push({
        x, y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        r: 0.6 + Math.random() * 2.2,
        life: 0, max: 1.6 + Math.random() * 2.2,
        tw: Math.random() * Math.PI * 2, tws: 6 + Math.random() * 10,
        glint: Math.random() < 0.18,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      });
    };

    const star = (x, y, r, a, c) => {
      ctx.strokeStyle = `rgba(${c},${a})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - r * 4, y); ctx.lineTo(x + r * 4, y);
      ctx.moveTo(x, y - r * 4); ctx.lineTo(x, y + r * 4);
      ctx.stroke();
    };

    let last = 0;
    const frame = (now) => {
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      if (now < emitUntil) for (let i = 0; i < 4; i++) spawn(false);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      parts = parts.filter((p) => (p.life += dt) < p.max);
      for (const p of parts) {
        p.vx *= 0.975; p.vy = p.vy * 0.975 - 6 * dt;   // drag + gentle lift
        p.x += p.vx * dt + Math.sin(p.life * 2 + p.tw) * 0.3;
        p.y += p.vy * dt;
        const fade = Math.min(p.life / 0.25, 1) * (1 - p.life / p.max);
        const a = fade * (0.55 + 0.45 * Math.sin(p.tw + p.life * p.tws));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(${p.c},${a})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
        if (p.glint && a > 0.5) star(p.x, p.y, p.r, a * 0.8, "255,250,230");
      }
      raf = parts.length || now < emitUntil ? requestAnimationFrame(frame) : 0;
    };

    window.addEventListener("resize", resize);
    return {
      start(ms) {
        resize();
        for (let i = 0; i < 90; i++) spawn(true);
        emitUntil = performance.now() + ms;
        if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      },
      stop() { emitUntil = 0; parts = []; ctx.clearRect(0, 0, w, h); },
    };
  })();

  // ---- Open sequence ----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = reduced
    ? { press: 0, glow: 0, wash: 0, dust: 0, flare: 0, bloom: 0, reveal: 0, done: 0 }
    : { press: 140, glow: 2650, wash: 2250, dust: 500, flare: 1900, bloom: 2600, reveal: 3400, done: 4000 };
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
    if (!reduced) later(t0 + T.dust, () => dust.start(2600));
    later(t0 + T.flare, () => stage.classList.add("is-flare"));
    later(t0 + T.bloom, () => stage.classList.add("is-bloom"));
    later(t0 + T.reveal, () => {
      stage.classList.add("is-reveal");
      invite.setAttribute("aria-hidden", "false");
    });
    later(t0 + T.done, () => {
      replay.hidden = false;
      document.dispatchEvent(new CustomEvent("invitation:opened"));
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    music.pause();
    dust.stop();
    invite.scrollTop = 0;
    invite.setAttribute("aria-hidden", "true");
    heroBg.style.translate = "";
    document.querySelectorAll(".in-view").forEach((el) => el.classList.remove("in-view"));
    replay.hidden = true;
    stage.classList.remove("is-pressed", "is-glowing", "is-washed", "is-open", "is-flare", "is-bloom", "is-reveal");
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
  }, { root: invite, threshold: 0.35 });
  document.querySelectorAll(".arrived").forEach((el) => io.observe(el));

  seal.addEventListener("click", open);

  // Dev aid: ?skip jumps straight to the opened invitation
  if (new URLSearchParams(location.search).has("skip")) {
    opened = true;
    stage.classList.add("is-open", "is-bloom", "is-reveal");
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
