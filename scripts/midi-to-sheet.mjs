// Tool chuyển file MIDI thành JSON nốt nhạc cho thư viện sheet (dùng để seed dữ liệu).
//   Xem các track:  node scripts/midi-to-sheet.mjs <file.mid> --inspect
//   Convert:        node scripts/midi-to-sheet.mjs <file.mid> [--tracks 0,1] [--out <file.json>]
// Lõi chuyển đổi nằm ở src/features/uploads/midiToSheet.js (dùng chung với tính năng upload),
// file này chỉ đọc file và xử lý tham số dòng lệnh.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import engine from "../src/features/uploads/midiToSheet.js";

const { parseMidi, describeTracks, pickDefaultTracks, convertMidi } = engine;

export { describeTracks, pickDefaultTracks, convertMidi };

export const readMidi = (filePath) => parseMidi(fs.readFileSync(filePath));

const parseArgs = (argv) => {
  const args = { file: null, inspect: false, tracks: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--inspect") args.inspect = true;
    else if (arg === "--tracks") args.tracks = argv[++i].split(",").map(Number);
    else if (arg === "--out") args.out = argv[++i];
    else args.file = arg;
  }
  return args;
};

const runCli = () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file) {
    console.error("Cách dùng: node scripts/midi-to-sheet.mjs <file.mid> [--inspect] [--tracks 0,1] [--out file.json]");
    process.exit(1);
  }

  const midi = readMidi(args.file);
  if (args.inspect) {
    const infos = describeTracks(midi);
    console.table(infos.filter((t) => t.noteCount > 0));
    console.log(`Track gợi ý: ${pickDefaultTracks(infos).join(",") || "(không có)"}`);
    return;
  }

  const { metadata, notes, warnings } = convertMidi(midi, { tracks: args.tracks });
  const left = notes.filter((n) => n.hand === "left").length;
  console.log(`Tracks ${metadata.tracks.join(",")}: ${notes.length} nốt (trái ${left}, phải ${notes.length - left})`);
  warnings.forEach(({ message }) => console.warn(`⚠ ${message}`));

  if (args.out) {
    fs.writeFileSync(args.out, `${JSON.stringify({ metadata, notes }, null, 2)}\n`);
    console.log(`Đã lưu: ${path.resolve(args.out)}`);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(`Lỗi: ${error.message}`);
    process.exit(1);
  }
}
