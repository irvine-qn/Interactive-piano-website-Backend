// Convert toàn bộ bài trong src/data/sheets/catalog.json ra src/data/sheets/<id>.json
// Chạy lệnh: npm run sheets:build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readMidi, convertMidi } from "./midi-to-sheet.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHEETS_DIR = path.join(__dirname, "../src/data/sheets");

const catalog = JSON.parse(fs.readFileSync(path.join(SHEETS_DIR, "catalog.json"), "utf8"));

const summary = catalog.map((entry) => {
  const midi = readMidi(path.join(SHEETS_DIR, entry.midiFile));
  const { metadata, notes, warnings } = convertMidi(midi, { tracks: entry.tracks });
  const sheet = { metadata, notes };
  fs.writeFileSync(path.join(SHEETS_DIR, `${entry.id}.json`), `${JSON.stringify(sheet, null, 2)}\n`);
  warnings.forEach(({ message }) => console.warn(`⚠ ${entry.id}: ${message}`));

  const left = sheet.notes.filter((n) => n.hand === "left").length;
  const end = sheet.notes.reduce((max, n) => Math.max(max, n.time + n.duration), 0);
  return {
    id: entry.id,
    tracks: sheet.metadata.tracks.join(","),
    notes: sheet.notes.length,
    left,
    right: sheet.notes.length - left,
    bpm: sheet.metadata.bpm,
    durationSec: Math.ceil(end),
  };
});

console.table(summary);
