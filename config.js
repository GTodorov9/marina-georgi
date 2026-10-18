// Everything couple-specific lives here, so the site can be reused.
window.WEDDING = {
  name1: "Марина",
  name2: "Георги",
  initials: "М&Г",
  // Wedding date: shown in the scratch-to-reveal circles and the confirmation line
  dateDay: "05",
  dateMonth: "Юни",
  dateYear: "2027",
  dateText: "05 юни 2027",
  // Day-of program at Terra Residence. PLACEHOLDER times until confirmed with the venue.
  times: { ceremony: "16:30", cocktail: "17:30", dinner: "19:00" },
  // Background music, started (with a fade-in) when the guest taps the seal — browsers
  // block autoplay before an interaction. Put an mp3 in assets/ and its path here.
  music: "assets/music.mp3",
};
