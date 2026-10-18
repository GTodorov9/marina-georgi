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
  fill("[data-initials]", cfg.initials);
  fill("[data-date]", cfg.dateText);

  // ---- Use the generated art only once it has loaded; CSS fallbacks otherwise ----
  const useImage = (src, cls) => {
    const img = new Image();
    img.onload = () => root.classList.add(cls);
    img.src = src;
  };
  useImage("assets/paper.webp", "has-paper");
  useImage("assets/seal.webp", "has-seal");

  // ---- Open sequence ----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T = reduced
    ? { press: 0, flipped: 0, letter: 0, done: 0 }
    : { press: 140, flipped: 900, letter: 1500, done: 3000 };
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
    later(T.press, () => {
      stage.classList.remove("is-pressed");
      stage.classList.add("is-open");
    });
    // Once the flap passes vertical it must go behind the letter
    later(T.press + T.flipped, () => stage.classList.add("is-flipped"));
    later(T.press + T.letter, () => stage.classList.add("is-letter"));
    later(T.press + T.done, () => {
      replay.hidden = false;
      document.dispatchEvent(new CustomEvent("invitation:opened"));
    });
  }

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    music.pause();
    replay.hidden = true;
    stage.classList.remove("is-pressed", "is-open", "is-flipped", "is-letter");
    opened = false;
  }

  seal.addEventListener("click", open);
  replay.addEventListener("click", reset);
})();
