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

  // ---- Use the generated art only once it has loaded; CSS fallbacks otherwise ----
  const useImage = (src, cls) => {
    const img = new Image();
    img.onload = () => root.classList.add(cls);
    img.src = src;
  };
  useImage("assets/paper.webp?v=2", "has-paper");
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
  // Volume goes through Web Audio (a GainNode) because iOS ignores audio.volume.
  const musicBtn = document.getElementById("musicBtn");
  const player = (() => {
    let ctx = null, gain = null, on = false, available = false;
    if (cfg.music) {
      music.src = cfg.music;
      music.addEventListener("canplay", () => { available = true; }, { once: true });
      music.addEventListener("error", () => { available = false; musicBtn.hidden = true; });
    }

    const fadeTo = (v, secs) => {
      if (gain) {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(v, t + secs);
      } else {
        music.volume = v;
      }
    };

    const play = () => {
      music.play().then(() => fadeTo(0.35, 3)).catch(() => {});
      on = true;
      musicBtn.setAttribute("aria-pressed", "true");
      musicBtn.classList.add("playing");
    };
    const pause = (keepState) => {
      fadeTo(0, 0.6);
      setTimeout(() => { if (!on || keepState) music.pause(); }, 650);
      if (!keepState) {
        on = false;
        musicBtn.setAttribute("aria-pressed", "false");
        musicBtn.classList.remove("playing");
      }
    };

    // pause while the guest is in another app / tab, resume when they return
    document.addEventListener("visibilitychange", () => {
      if (!on) return;
      if (document.hidden) pause(true); else play();
    });
    musicBtn.addEventListener("click", () => (on ? pause() : play()));

    return {
      start() {                    // called from the seal tap (a user gesture)
        if (!cfg.music) return;
        try {
          if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
            gain = ctx.createGain();
            gain.gain.value = 0;
            ctx.createMediaElementSource(music).connect(gain).connect(ctx.destination);
          }
          ctx.resume();
        } catch (e) { ctx = gain = null; music.volume = 0; }
        musicBtn.hidden = false;
        play();
      },
      stop() { pause(); musicBtn.hidden = true; music.currentTime = 0; },
      get ready() { return available; },
    };
  })();

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
      replay.hidden = false;
      document.dispatchEvent(new CustomEvent("invitation:opened"));
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    player.stop();
    invite.scrollTop = 0;
    invite.setAttribute("aria-hidden", "true");
    heroBg.style.translate = "";
    document.querySelectorAll(".in-view").forEach((el) => el.classList.remove("in-view"));
    revealDate.classList.remove("complete");
    afterReveal.hidden = true;
    afterReveal.classList.remove("unveil");
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
        setTimeout(unlockRest, 1200);
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
    const companions = form.querySelector(".f-companions");
    let lastFocus = null;

    const openSheet = () => {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("open")));
      setTimeout(() => form.elements.name.focus({ preventScroll: true }), 450);
    };
    const closeSheet = () => {
      sheet.classList.remove("open");
      setTimeout(() => { sheet.hidden = true; lastFocus && lastFocus.focus({ preventScroll: true }); }, 500);
    };
    document.getElementById("rsvpOpen").addEventListener("click", openSheet);
    sheet.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeSheet));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

    form.addEventListener("change", () => {
      const att = form.elements.attending.value;
      ifYes.hidden = att === "no";
      companions.hidden = Number(form.elements.guests.value) < 2;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const data = Object.fromEntries(new FormData(form));
      if (!data.name || !data.name.trim()) { err.textContent = "Моля, въведете името си."; err.hidden = false; return; }
      if (!data.attending) { err.textContent = "Моля, отбележете дали ще присъствате."; err.hidden = false; return; }
      if (data.attending === "no") ["guests", "companions", "children", "menu", "allergies"].forEach((k) => delete data[k]);
      data.submittedAt = new Date().toISOString();

      const btn = form.querySelector(".f-submit");
      btn.disabled = true;
      try {
        if (cfg.rsvpEndpoint) {
          // text/plain avoids a CORS preflight (works with Google Apps Script web apps)
          await fetch(cfg.rsvpEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
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
