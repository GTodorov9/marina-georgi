/**
 * Покана Марина & Георги — RSVP backend (Google Apps Script, bound to the RSVP spreadsheet).
 *
 * One-time setup:
 *   1. In the spreadsheet: Разширения (Extensions) → Apps Script, paste this file, save.
 *   2. Run the function `setup` once (▶ Run) and allow the permissions.
 *   3. Deploy → New deployment → type "Web app":
 *        Execute as: Me    ·    Who has access: Anyone
 *      Copy the Web app URL (…/exec) and send it over; it goes into config.js (rsvpEndpoint).
 *
 * Sheets:
 *   "Гости"    – guest list: you type the names + seats; the code and personal link appear automatically.
 *   "Отговори" – every submitted RSVP is appended here.
 *
 * The guest list never goes into the public website code: the site asks this script
 * for one household by its random code (?g=…).
 */

const SITE_URL = "https://gtodorov9.github.io/marina-georgi/";
const GUESTS = "Гости";
const ANSWERS = "Отговори";
const G = { CODE: 1, NAME: 2, SEATS: 3, LINK: 4, STATUS: 5, UPDATED: 6 }; // 1-based columns

/* ---------- setup & sheet helpers ---------- */

function setup() {
  const ss = SpreadsheetApp.getActive();
  let g = ss.getSheetByName(GUESTS);
  if (!g) {
    const first = ss.getSheets()[0];
    if (first.getLastRow() === 0) { first.setName(GUESTS); g = first; }   // reuse an empty first tab
    else g = ss.insertSheet(GUESTS, 0);
  }
  g.getRange(1, 1, 1, 6).setValues([["Код", "Имена на поканата", "Места", "Личен линк", "Отговор", "Обновено"]]);
  if (g.getLastRow() < 2) g.getRange(2, 2, 1, 2).setValues([["Мария и Иван Иванови (пример)", 2]]);
  styleHeader(g, 6);
  g.setColumnWidths(1, 1, 90); g.setColumnWidth(2, 260); g.setColumnWidth(3, 70);
  g.setColumnWidth(4, 360); g.setColumnWidth(5, 190); g.setColumnWidth(6, 150);
  g.getRange("C2:C").setHorizontalAlignment("center");

  let a = ss.getSheetByName(ANSWERS) || ss.insertSheet(ANSWERS);
  a.getRange(1, 1, 1, 10).setValues([["Време", "Код", "Покана", "Име", "Отговор", "Възрастни", "Деца", "Меню", "Алергии", "Устройство"]]);
  styleHeader(a, 10);
  a.setColumnWidth(1, 150); a.setColumnWidth(3, 220); a.setColumnWidth(4, 200); a.setColumnWidth(8, 260); a.setColumnWidth(9, 200);

  fillCodes();
  SpreadsheetApp.getUi().alert("Готово! Сега: Deploy → New deployment → Web app (Execute as: Me, Access: Anyone).");
}

function styleHeader(sh, n) {
  sh.getRange(1, 1, 1, n).setFontWeight("bold").setBackground("#f6d5b9").setFontColor("#5e3524");
  sh.setFrozenRows(1);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Покана")
    .addItem("Генерирай кодове и линкове", "fillCodes")
    .addToUi();
}

// Typing a name in "Гости" creates its code + link straight away
function onEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() === GUESTS && e.range.getRow() > 1 && e.range.getColumn() <= G.SEATS) fillCodes();
}

function fillCodes() {
  const g = SpreadsheetApp.getActive().getSheetByName(GUESTS);
  const last = g.getLastRow();
  if (last < 2) return;
  const rows = g.getRange(2, 1, last - 1, 4).getValues();
  const used = new Set(rows.map((r) => r[0]).filter(String));
  rows.forEach((r, i) => {
    if (!r[1]) return;                              // no name, skip
    if (!r[0]) { r[0] = newCode(used); used.add(r[0]); }
    if (!r[2]) r[2] = 1;
    r[3] = SITE_URL + "?g=" + r[0];
  });
  g.getRange(2, 1, rows.length, 4).setValues(rows);
}

function newCode(used) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";   // no look-alikes (0/o, 1/l/i)
  let c;
  do { c = Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join(""); } while (used.has(c));
  return c;
}

function findGuest(code) {
  if (!code) return null;
  const g = SpreadsheetApp.getActive().getSheetByName(GUESTS);
  const last = g.getLastRow();
  if (last < 2) return null;
  const rows = g.getRange(2, 1, last - 1, 3).getValues();
  const i = rows.findIndex((r) => String(r[0]).toLowerCase() === String(code).toLowerCase());
  return i < 0 ? null : { row: i + 2, code: rows[i][0], name: rows[i][1], seats: Number(rows[i][2]) || 1 };
}

const json = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

/* ---------- web app ---------- */

// GET ?g=code -> { ok, name, seats }   (one household only)
function doGet(e) {
  const guest = findGuest(e && e.parameter && e.parameter.g);
  return json(guest ? { ok: true, name: guest.name, seats: guest.seats } : { ok: false });
}

// POST (text/plain JSON) -> appends to "Отговори", updates the guest's status
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents || "{}");
    const ss = SpreadsheetApp.getActive();
    const guest = findGuest(d.code);
    const yes = d.attending === "yes";
    ss.getSheetByName(ANSWERS).appendRow([
      new Date(), d.code || "", guest ? guest.name : "", String(d.name || "").slice(0, 120),
      yes ? "Ще дойде" : "Няма да дойде", yes ? Number(d.adults) || 0 : 0, yes ? Number(d.children) || 0 : 0,
      String(d.menu || "").slice(0, 200), String(d.allergies || "").slice(0, 300), String(d.ua || "").slice(0, 120),
    ]);
    if (guest) {
      const g = ss.getSheetByName(GUESTS);
      const people = (Number(d.adults) || 0) + (Number(d.children) || 0);
      g.getRange(guest.row, G.STATUS, 1, 2).setValues([[yes ? "✓ Ще дойдат (" + people + ")" : "✕ Няма да дойдат", new Date()]]);
      g.getRange(guest.row, G.STATUS).setFontColor(yes ? "#2e7d32" : "#9b2f2f");
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
