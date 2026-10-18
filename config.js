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
  // Countdown target: first moment of the day (Sofia is UTC+3 in June)
  celebrationStart: "2027-06-05T16:00:00+03:00",
  // Day-of schedule (MOCK until confirmed with Terra Residence)
  schedule: [
    { time: "16:00", title: "Посрещане на гостите", place: "Централната градина" },
    { time: "16:30", title: "Изнесен ритуал", place: "Английският двор" },
    { time: "17:30", title: "Коктейл", place: "Градината с фонтана" },
    { time: "19:00", title: "Вечеря", place: "Le Grand Salon" },
    { time: "21:00", title: "Първи танц", place: "Le Grand Salon" },
    { time: "22:30", title: "Сватбена торта", place: "Le Grand Salon" },
    { time: "23:00", title: "Парти до зори", place: "" },
  ],
  // RSVP
  rsvpBy: "01 май 2027",           // MOCK deadline
  // Where answers are POSTed (e.g. a Google Apps Script web-app URL that appends to a
  // Sheet). Empty = answers are only kept in this browser (for testing).
  rsvpEndpoint: "",
  // Background music, started (with a fade-in) when the guest taps the seal — browsers
  // block autoplay before an interaction. Put an mp3 in assets/ and its path here.
  music: "assets/music.mp3?v=3",
};
