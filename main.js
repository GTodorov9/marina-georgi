(() => {
  const cfg = window.WEDDING || {};
  const root = document.documentElement;
  const stage = document.getElementById("stage");
  const seal = document.getElementById("seal");

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
  fill("[data-rsvp-by]", cfg.rsvpBy);

  // ---- Schedule list from config ----
  const scheduleList = document.getElementById("scheduleList");
  (cfg.schedule || []).forEach((it) => {
    const li = document.createElement("li");
    li.className = "sc-item";
    li.innerHTML = '<span class="sc-time"></span><span class="sc-dot" aria-hidden="true"></span>' +
      '<span class="sc-what"><strong></strong><small></small></span>';
    li.querySelector(".sc-time").textContent = it.time;
    li.querySelector("strong").textContent = it.title;
    li.querySelector("small").textContent = it.place || "";
    scheduleList.appendChild(li);
  });

  // ---- Personal invitation (?g=code): look up the household in the RSVP sheet ----
  const guestCode = (new URLSearchParams(location.search).get("g") || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") || null;
  if (guestCode && cfg.rsvpEndpoint) {
    fetch(`${cfg.rsvpEndpoint}?g=${encodeURIComponent(guestCode)}`)
      .then((r) => r.json())
      .then((g) => {
        if (!g || !g.ok) return;
        const forEl = document.querySelector(".hint-for");
        forEl.textContent = `За ${g.name}`;
        forEl.hidden = false;
        const dear = document.querySelector(".rs-dear");
        dear.textContent = `Скъпи ${g.name},`;
        dear.hidden = false;
        document.dispatchEvent(new CustomEvent("guest:loaded", { detail: g }));
      })
      .catch(() => {});
  }

  // ---- Use the generated art only once it has loaded; CSS fallbacks otherwise ----
  const useImage = (src, cls) => {
    const img = new Image();
    img.onload = () => root.classList.add(cls);
    img.src = src;
  };
  useImage("assets/paper.webp?v=3", "has-paper");
  useImage("assets/seal.webp?v=2", "has-seal");
  useImage("assets/seal-rsvp.webp?v=1", "has-rsvp-seal");

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

  // ---- Background music: fades in on the seal tap, floating mute button ----
  // Played through Web Audio: the decoded track is looped by crossfading two copies
  // (no audible restart, no MP3 gap), and volume fades work on iOS too.
  const musicBtn = document.getElementById("musicBtn");
  const player = (() => {
    const VOLUME = 0.35, XFADE = 4;            // seconds of overlap at the loop point
    let ctx = null, master = null, buffer = null, on = false, started = false, timer = 0;
    const fileReq = cfg.music ? fetch(cfg.music).then((r) => r.arrayBuffer()).catch(() => null) : Promise.resolve(null);

    const decode = (data) => new Promise((res, rej) => ctx.decodeAudioData(data, res, rej));  // callback form for older Safari

    // play one copy starting at `when`, fading in/out over XFADE, and schedule the next
    function scheduleCopy(when) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buffer;
      src.connect(g).connect(master);
      const end = when + buffer.duration;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(1, when + XFADE);
      g.gain.setValueAtTime(1, end - XFADE);
      g.gain.linearRampToValueAtTime(0, end);
      src.start(when);
      src.stop(end + 0.05);
      const next = end - XFADE;
      timer = setTimeout(() => scheduleCopy(next), Math.max(0, (next - ctx.currentTime - 1) * 1000));
    }

    const fadeTo = (v, secs) => {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(v, t + secs);
    };
    const setBtn = (playing) => {
      musicBtn.setAttribute("aria-pressed", String(playing));
      musicBtn.classList.toggle("playing", playing);
    };

    const play = () => {
      if (!ctx || !buffer) return;
      ctx.resume();
      if (!started) { started = true; scheduleCopy(ctx.currentTime + 0.05); }
      fadeTo(VOLUME, 3);
      on = true;
      setBtn(true);
    };
    const pause = () => {
      if (!ctx) return;
      fadeTo(0, 0.6);
      on = false;
      setBtn(false);
    };

    // silence while the guest is in another app / tab; continue softly on return
    document.addEventListener("visibilitychange", () => {
      if (!ctx || !on) return;
      if (document.hidden) { fadeTo(0, 0.3); setTimeout(() => document.hidden && ctx.suspend(), 350); }
      else { ctx.resume().then(() => fadeTo(VOLUME, 1.5)); }
    });
    musicBtn.addEventListener("click", () => (on ? pause() : play()));

    return {
      start() {                    // called from the seal tap (a user gesture)
        if (!cfg.music) return;
        try {
          if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0;
            master.connect(ctx.destination);
          }
          ctx.resume();            // unlock inside the gesture (iOS)
        } catch (e) { return; }
        fileReq.then((data) => (data ? decode(data) : null)).then((buf) => {
          if (!buf) return;
          buffer = buf;
          musicBtn.hidden = false;
          play();
        }).catch(() => { musicBtn.hidden = true; });
      },
    };
  })();

  // ---- Seal light on the card: relief lit from the seal, computed from the paper ----
  function drawSealLight() {
    const img = new Image();
    img.onload = () => {
      [["shadePocket", "cover"], ["shadeFlap", "width"]].forEach(([id, fit]) => {
        const cv = document.getElementById(id);
        const host = cv.parentElement;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scene = document.getElementById("scene");
        const W = Math.round(host.clientWidth * dpr), H = Math.round(host.clientHeight * dpr);
        if (!W || !H) return;
        cv.width = W; cv.height = H;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        // draw the paper exactly as CSS shows it on this piece
        let dw, dh;
        if (fit === "cover") {
          const k = Math.max(W / img.width, H / img.height); dw = img.width * k; dh = img.height * k;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          const k = W / img.width; dw = W; dh = img.height * k;
          ctx.drawImage(img, 0, 0, dw, dh);
        }
        const src = ctx.getImageData(0, 0, W, H).data;
        const lum = new Float32Array(W * H);
        for (let i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = src[p] * .3 + src[p + 1] * .59 + src[p + 2] * .11;
        // seal centre in this canvas (seal sits at 54% of the scene height)
        const sx = W / 2;
        const sy = (scene.clientHeight * 0.54 - (fit === "cover" ? 0 : 0)) * dpr;
        const R = 210 * dpr;                     // reach of the light
        const out = ctx.createImageData(W, H);
        const o = out.data;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            const dx0 = x - sx, dy0 = y - sy;
            const d = Math.hypot(dx0, dy0);
            const fall = Math.exp(-(d * d) / (R * R));
            if (fall < 0.02) continue;
            // relief slope (Sobel)
            const gx = (lum[i - W + 1] + 2 * lum[i + 1] + lum[i + W + 1]) - (lum[i - W - 1] + 2 * lum[i - 1] + lum[i + W - 1]);
            const gy = (lum[i + W - 1] + 2 * lum[i + W] + lum[i + W + 1]) - (lum[i - W - 1] + 2 * lum[i - W] + lum[i - W + 1]);
            const inv = d > 0 ? 1 / d : 0;
            const s = -(gx * dx0 + gy * dy0) * inv / 60;   // >0 faces the seal, <0 turned away
            const p = i * 4;
            const warm = 0.18 * fall;                       // soft amber pool
            if (s > 0) {                                    // lit edge: warm gold highlight
              const a = Math.min(.8, s * fall * .6 + warm);
              o[p] = 255; o[p + 1] = 178; o[p + 2] = 90; o[p + 3] = a * 255;
            } else {                                        // far side: warm brown shade
              const a = Math.min(.55, -s * fall * .5);
              const t = a / (a + warm + 1e-6);
              o[p] = 255 * (1 - t) + 120 * t; o[p + 1] = 178 * (1 - t) + 55 * t; o[p + 2] = 90 * (1 - t) + 20 * t;
              o[p + 3] = Math.min(1, a + warm) * 255;
            }
          }
        }
        ctx.putImageData(out, 0, 0);
        drawLines(id === "shadePocket" ? "linesPocket" : "linesFlap", lum, W, H, sx, sy, dpr);
      });
    };
    img.src = "assets/paper.webp?v=3";
  }

  // Separable box blur (radius r) of a W×H float field
  function boxBlur(src, W, H, r) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      let acc = 0; const row = y * W;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = acc / n;
        acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        out[y * W + x] = acc / n;
        acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
    return out;
  }

  // ---- The engraved drawings around the seal, traced in glowing gold (revealed as a ripple in CSS) ----
  function drawLines(id, lum, W, H, sx, sy, dpr) {
    const cv = document.getElementById(id);
    if (!cv) return;
    cv.width = W; cv.height = H;
    cv.style.setProperty("--sx", `${sx / dpr}px`);
    cv.style.setProperty("--sy", `${sy / dpr}px`);
    // engraved strokes are darker than the paper around them
    const mean = boxBlur(lum, W, H, Math.round(4 * dpr));
    const line = new Float32Array(W * H);
    for (let i = 0; i < line.length; i++) line[i] = Math.min(1, Math.max(0, (mean[i] - lum[i] - 3) / 12));
    const glow = boxBlur(line, W, H, Math.round(5 * dpr));
    const R = 300 * dpr;                         // the light reaches the nearest drawings, then fades
    const ctx = cv.getContext("2d");
    const out = ctx.createImageData(W, H), o = out.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const d = Math.hypot(x - sx, y - sy);
        const f = Math.exp(-(d * d) / (R * R));
        if (f < 0.03) continue;
        const core = line[i] * f, halo = Math.min(1, glow[i] * 2.2) * f;
        const a = Math.min(1, core * .95 + halo * .5);
        if (a < 0.01) continue;
        const t = core / (core + halo * .5 + 1e-6);     // 1 = stroke centre (pale gold), 0 = halo (amber)
        const p = i * 4;
        o[p] = 255; o[p + 1] = 168 + 72 * t; o[p + 2] = 70 + 120 * t; o[p + 3] = a * 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  // ---- Open sequence ----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) drawSealLight();
  const T = reduced
    ? { press: 0, glow: 0, wash: 0, slide: 0, reveal: 0, done: 0 }
    : { press: 140, glow: 3500, wash: 3000, slide: 1300, reveal: 2300, done: 3700 };   // glow leaves time for the ripple through the drawings
  let timers = [];
  let opened = false;

  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  function open() {
    if (opened) return;
    opened = true;

    if (navigator.vibrate) navigator.vibrate(15);
    player.start();

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
      document.dispatchEvent(new CustomEvent("invitation:opened"));
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    invite.scrollTop = 0;
    invite.setAttribute("aria-hidden", "true");
    heroBg.style.translate = "";
    document.querySelectorAll(".in-view").forEach((el) => el.classList.remove("in-view"));
    revealDate.classList.remove("complete", "celebrate");
    afterReveal.hidden = true;
    afterReveal.classList.remove("unveil");
    scratches.forEach((s) => s.reset());
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

  // Slow, eased scroll (native smooth scroll is too quick); any touch cancels it
  function glideTo(target, ms) {
    const from = invite.scrollTop, dist = target - from, t0 = performance.now();
    let cancelled = false;
    const stop = () => { cancelled = true; };
    invite.addEventListener("touchstart", stop, { once: true, passive: true });
    invite.addEventListener("wheel", stop, { once: true, passive: true });
    const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;   // gentle sine ease-in-out
    const step = (now) => {
      if (cancelled) return;
      const t = Math.min((now - t0) / ms, 1);
      invite.scrollTop = from + dist * ease(t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---- The rest of the invitation unlocks after the date is found ----
  const afterReveal = document.getElementById("afterReveal");
  function unlockRest(instant) {
    if (!afterReveal.hidden) return;
    afterReveal.hidden = false;
    invite.dispatchEvent(new Event("scroll"));          // position the schedule rose
    if (instant === true) return;
    afterReveal.classList.add("unveil");
    // after a pause to enjoy the date, glide slowly down to the countdown
    setTimeout(() => {
      const target = afterReveal.offsetTop - invite.clientHeight * 0.18;
      if (reduced) { invite.scrollTop = target; return; }
      glideTo(target, 3400);
    }, 1400);
  }

  // Rose petals and a few small roses drifting down over the revealed date
  function petals() {
    const W = revealDate.clientWidth, H = revealDate.clientHeight;
    for (let n = 0; n < 26; n++) {
      const p = document.createElement("span");
      const rose = Math.random() < 0.22;
      p.className = rose ? "petal rose" : "petal";
      p.style.setProperty("--x", `${Math.random() * (W - 20)}px`);
      p.style.setProperty("--s", `${rose ? 18 + Math.random() * 10 : 10 + Math.random() * 8}px`);
      p.style.setProperty("--dx", `${(Math.random() - .5) * 120}px`);
      p.style.setProperty("--fall", `${H * (0.75 + Math.random() * 0.3)}px`);
      p.style.setProperty("--r", `${(Math.random() - .5) * 360}deg`);
      const d = 5 + Math.random() * 3, delay = Math.random() * 2.2;
      p.style.setProperty("--d", `${d}s`);
      p.style.setProperty("--delay", `${delay}s`);
      revealDate.appendChild(p);
      setTimeout(() => p.remove(), (d + delay) * 1000 + 200);
    }
  }

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
        revealDate.classList.add("complete", "celebrate");
        if (navigator.vibrate) navigator.vibrate([20, 60, 30]);
        if (!reduced) petals();
        setTimeout(unlockRest, 2200);   // let the celebration play first
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

  // ---- Idle hint: circles on screen but untouched for a while -> show how to scratch ----
  (() => {
    if (reduced) return;
    const items = [...revealDate.querySelectorAll(".rd-item")];
    const hint = document.createElement("span");
    hint.className = "scratch-hint";
    hint.setAttribute("aria-hidden", "true");
    let timer = 0, endTimer = 0, inView = false, busy = false, current = null;
    const next = () => items[scratches.findIndex((s) => !s.isDone())];

    function stop() {
      clearTimeout(endTimer);
      revealDate.classList.remove("nudge");
      if (current) current.classList.remove("nudge-me");
      current = null;
    }
    function show() {
      const item = next();
      if (!item || !inView || busy) return;
      stop();
      item.appendChild(hint);
      void hint.offsetWidth;                     // restart the CSS animations
      current = item;
      item.classList.add("nudge-me");
      revealDate.classList.add("nudge");
      endTimer = setTimeout(() => { stop(); schedule(7000); }, 3600);
    }
    function schedule(ms) { clearTimeout(timer); if (next()) timer = setTimeout(show, ms); }

    revealDate.addEventListener("pointerdown", (e) => {
      if (!e.target.closest("[data-scratch]")) return;
      busy = true;
      clearTimeout(timer);
      stop();
    });
    window.addEventListener("pointerup", () => { if (busy) { busy = false; schedule(6000); } });
    new IntersectionObserver(([e]) => {
      inView = e.intersectionRatio >= .6;
      if (inView) schedule(4000); else { clearTimeout(timer); stop(); }
    }, { threshold: [0, .6] }).observe(revealDate.querySelector(".rd-circles"));
  })();

  // ---- Countdown to the celebration ----
  (() => {
    const target = new Date(cfg.celebrationStart).getTime();
    const els = {};
    document.querySelectorAll("[data-cd]").forEach((el) => (els[el.dataset.cd] = el));
    const clock = document.querySelector(".cd-clock");
    const doneMsg = document.querySelector(".cd-done");
    const set = (el, v) => {
      if (el.textContent === v) return;
      el.textContent = v;
      el.classList.remove("tick");
      void el.offsetWidth;            // restart the tick animation
      el.classList.add("tick");
    };
    const pad = (n) => String(n).padStart(2, "0");
    const update = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (s === 0) { clock.hidden = true; doneMsg.hidden = false; return; }
      const d = Math.floor(s / 86400); s %= 86400;
      set(els.d, String(d));
      set(els.h, pad(Math.floor(s / 3600)));
      set(els.m, pad(Math.floor((s % 3600) / 60)));
      set(els.s, pad(s % 60));
    };
    update();
    setInterval(update, 1000);
  })();

  // ---- Schedule: the rose travels down the line as you scroll, lighting each moment ----
  (() => {
    const timeline = document.getElementById("timeline");
    const rose = document.getElementById("rose");
    const fill = document.getElementById("lineFill");
    const items = [...timeline.querySelectorAll(".sc-item")];
    let pending = false;
    const update = () => {
      pending = false;
      const r = timeline.getBoundingClientRect();
      const anchor = invite.clientHeight * 0.55;        // the rose follows this point of the screen
      const y = Math.min(Math.max(anchor - r.top, 0), r.height);
      rose.style.top = `${y}px`;
      rose.style.transform = `rotate(${y * 0.35}deg)`;
      fill.style.height = `${y}px`;
      items.forEach((li) => {
        const mid = li.offsetTop + li.offsetHeight / 2;
        li.classList.toggle("lit", mid <= y + 4);
      });
    };
    invite.addEventListener("scroll", () => {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  // ---- RSVP: seal opens a bottom-sheet form ----
  (() => {
    const sheet = document.getElementById("rsvpSheet");
    const form = document.getElementById("rsvpForm");
    const thanks = document.getElementById("rsvpThanks");
    const err = document.getElementById("rsvpError");
    const ifYes = form.querySelector(".f-if-yes");
    const rest = form.querySelector(".f-rest");
    const allergy = form.querySelector(".f-allergy");
    let lastFocus = null;

    const openSheet = () => {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("open")));
    };
    const closeSheet = () => {
      sheet.classList.remove("open");
      setTimeout(() => { sheet.hidden = true; lastFocus && lastFocus.focus({ preventScroll: true }); }, 500);
    };
    document.getElementById("rsvpOpen").addEventListener("click", openSheet);
    sheet.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeSheet));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

    // answer chosen -> reveal the rest (only the name for "no")
    form.querySelectorAll('input[name="attending"]').forEach((r) => r.addEventListener("change", () => {
      const firstTime = rest.hidden;
      rest.hidden = false;
      ifYes.hidden = r.value === "no";
      form.classList.toggle("answered-no", r.value === "no");
      if (firstTime) setTimeout(() => form.elements.name.focus({ preventScroll: true }), 250);
    }));

    // −/+ steppers
    const counts = { adults: 1, children: 0 };
    let seatCap = Infinity;
    const steppers = [];
    form.querySelectorAll("[data-counter]").forEach((box) => {
      const key = box.dataset.counter, min = +box.dataset.min, max = +box.dataset.max;
      const out = box.querySelector("output");
      const [minus, plus] = box.querySelectorAll("button");
      const render = () => {
        out.textContent = counts[key];
        minus.disabled = counts[key] <= min;
        plus.disabled = counts[key] >= max || counts.adults + counts.children >= seatCap;
      };
      box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const step = Number(b.dataset.step);
        if (step > 0 && counts.adults + counts.children >= seatCap) return;
        counts[key] = Math.min(max, Math.max(min, counts[key] + step));
        steppers.forEach((f) => f());
      }));
      steppers.push(render);
      render();
    });

    // Menu picture cards: one guest -> pick one; several -> distribute counts per menu
    const menus = [...form.querySelectorAll(".f-menu")];
    const menuHint = form.querySelector(".f-menu-hint");
    const menuCounts = { "Месно": 1, "Вегетарианско": 0, "Веганско": 0 };
    const total = () => counts.adults + counts.children;
    function renderMenus() {
      const t = total(), multi = t > 1;
      let sum = Object.values(menuCounts).reduce((a, b) => a + b, 0);
      // keep the distribution equal to the number of guests (adjust "Месно" first)
      if (sum !== t) {
        let diff = t - sum;
        for (const k of ["Месно", "Вегетарианско", "Веганско"]) {
          const nv = Math.max(0, menuCounts[k] + diff);
          diff -= nv - menuCounts[k];
          menuCounts[k] = nv;
          if (!diff) break;
        }
      }
      menuHint.hidden = !multi;
      menuHint.querySelector("[data-menu-total]").textContent = t;
      menus.forEach((m) => {
        const k = m.dataset.menu, n = menuCounts[k];
        m.querySelector(".f-menu-pick").setAttribute("aria-pressed", String(n > 0));
        m.classList.toggle("on", n > 0);
        const box = m.querySelector(".f-menu-count");
        box.hidden = !multi;
        box.querySelector("output").textContent = n;
      });
    }
    menus.forEach((m) => {
      const k = m.dataset.menu;
      m.querySelector(".f-menu-pick").addEventListener("click", () => {
        if (total() === 1) { Object.keys(menuCounts).forEach((x) => (menuCounts[x] = x === k ? 1 : 0)); }
        else if (menuCounts[k] === 0) {                  // take one from the largest other menu
          const from = Object.keys(menuCounts).filter((x) => x !== k).sort((a, b) => menuCounts[b] - menuCounts[a])[0];
          if (menuCounts[from] > 0) { menuCounts[from]--; menuCounts[k]++; }
        }
        renderMenus();
      });
      m.querySelectorAll(".f-menu-count button").forEach((b) => b.addEventListener("click", () => {
        const d = Number(b.dataset.d);
        if (d > 0) {                                     // move one here from another menu
          const from = Object.keys(menuCounts).filter((x) => x !== k && menuCounts[x] > 0).sort((a, c) => menuCounts[c] - menuCounts[a])[0];
          if (!from) return;
          menuCounts[from]--; menuCounts[k]++;
        } else if (menuCounts[k] > 0) {                  // give one back to the first other menu
          const to = k === "Месно" ? "Вегетарианско" : "Месно";
          menuCounts[k]--; menuCounts[to]++;
        }
        renderMenus();
      }));
    });
    form.querySelectorAll("[data-counter] button").forEach((b) => b.addEventListener("click", renderMenus));
    renderMenus();

    // Personal invitation: prefill name, seats and a greeting
    document.addEventListener("guest:loaded", (e) => {
      const g = e.detail;
      form.elements.name.value = g.name;
      document.getElementById("rsvpTitle").textContent = `${g.name}, ще бъдете ли с нас?`;
      // seats only pre-set the adults count; guests may still add more people
      counts.adults = Math.min(8, Math.max(1, g.seats));
      counts.children = 0;
      steppers.forEach((f) => f());
      renderMenus();
    });

    // "Имаме алергия" reveals a short text box
    form.querySelector("[data-allergy]").addEventListener("change", (e) => {
      allergy.hidden = !e.target.checked;
      if (e.target.checked) allergy.focus();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const fd = new FormData(form);
      const data = { attending: fd.get("attending"), name: (fd.get("name") || "").trim(), code: guestCode || "", ua: navigator.userAgent.slice(0, 120) };
      if (!data.attending) { err.textContent = "Моля, изберете отговор."; err.hidden = false; return; }
      if (!data.name) { err.textContent = "Моля, напишете името си."; err.hidden = false; form.elements.name.focus(); return; }
      if (data.attending === "yes") {
        data.adults = counts.adults;
        data.children = counts.children;
        data.menu = Object.entries(menuCounts).filter(([, n]) => n > 0).map(([k, n]) => `${k} × ${n}`).join(", ");
        data.allergies = allergy.hidden ? "" : (fd.get("allergies") || "").trim();
      }
      data.submittedAt = new Date().toISOString();

      const btn = form.querySelector(".f-submit");
      btn.disabled = true;
      try {
        if (cfg.rsvpEndpoint) {
          // text/plain avoids a CORS preflight (works with Google Apps Script web apps)
          await fetch(cfg.rsvpEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
          try { localStorage.setItem("rsvp-sent", JSON.stringify({ code: data.code, attending: data.attending, at: data.submittedAt })); } catch (_) {}
        } else {
          try {
            const all = JSON.parse(localStorage.getItem("rsvp-test") || "[]");
            all.push(data);
            localStorage.setItem("rsvp-test", JSON.stringify(all));
          } catch (_) { /* storage unavailable: ignore in test mode */ }
          console.info("[RSVP test mode] no rsvpEndpoint configured", data);
        }
        form.hidden = true;
        thanks.hidden = false;
        document.getElementById("rsvpThanksText").textContent = data.attending === "yes"
          ? `Очакваме ви с нетърпение на ${cfg.dateText}!`
          : "Ще ни липсвате! Благодарим ви, че ни уведомихте.";
      } catch (_) {
        err.textContent = "Нещо се обърка. Моля, опитайте отново.";
        err.hidden = false;
      } finally {
        btn.disabled = false;
      }
    });
  })();

  seal.addEventListener("click", open);

  // Dev aid: ?skip jumps straight to the opened invitation
  if (new URLSearchParams(location.search).has("skip")) {
    opened = true;
    stage.classList.add("is-open", "is-slide", "is-reveal", "is-done");
    if (new URLSearchParams(location.search).get("skip") !== "locked") unlockRest(true);
    invite.setAttribute("aria-hidden", "false");
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
})();

/* ---------- Hero sea: each row of the water strip drifts sideways, so the painted waves ripple ---------- */
(function () {
  const cvs = document.getElementById("sea");
  if (!cvs || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cvs.getContext("2d");
  const W = cvs.width, H = cvs.height;
  const water = new Image();     // the sea cut out of the plate; its alpha is the water mask
  water.src = "assets/hero/water.webp?v=2";

  let visible = true, last = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;                 // ~30fps is plenty for slow water
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    for (let y = 0; y < H; y++) {
      const depth = y / H;                       // 0 = horizon, 1 = shore: nearer water moves more
      const amp = 0.7 + depth * depth * 4.2;
      const dx = amp * (0.62 * Math.sin(y * 0.21 + t * 1.5) + 0.38 * Math.sin(y * 0.067 - t * 0.85));
      // a slow swell: rows borrow from a pixel or two above/below, so the painted wave lines rise and fall
      const sy = Math.min(H - 1, Math.max(0, y + Math.round((0.5 + depth * 1.6) * Math.sin(t * 1.1 - y * 0.09))));
      ctx.drawImage(water, 0, sy, W, 1, dx, y, W, 1);
    }
    // keep the ripple inside the sea (pier, rocks and island stay still)
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(water, 0, 0);
  }
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  water.onload = () => {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(cvs);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
  };
})();

