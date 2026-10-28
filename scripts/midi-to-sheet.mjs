// Tool chuyển file MIDI thành JSON nốt nhạc cho thư viện sheet (dùng để seed dữ liệu).
//   Xem các track:  node scripts/midi-to-sheet.mjs <file.mid> --inspect
//   Convert:        node scripts/midi-to-sheet.mjs <file.mid> [--tracks 0,1] [--out <file.json>]
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import midiPkg from "@tonejs/midi";

const { Midi } = midiPkg;

// Giới hạn 88 phím đàn (A0 - C8)
const PIANO_MIN_MIDI = 21;
const PIANO_MAX_MIDI = 108;
// Track đơn thì chia tay theo cao độ: từ C4 trở lên là tay phải
const HAND_SPLIT_MIDI = 60;
// GM program 0-7 là họ piano
const MAX_PIANO_PROGRAM = 7;

const round = (value, digits = 4) => Number(value.toFixed(digits));

export const readMidi = (filePath) => new Midi(fs.readFileSync(filePath));

export const describeTracks = (midi) =>
  midi.tracks.map((track, index) => {
    const pitches = track.notes.map((n) => n.midi);
    const total = pitches.reduce((sum, p) => sum + p, 0);
    return {
      index,
      name: track.name,
      channel: track.channel,
      program: track.instrument.number,
      instrument: track.instrument.name,
      percussion: track.instrument.percussion,
      noteCount: pitches.length,
      minMidi: pitches.length ? Math.min(...pitches) : null,
      maxMidi: pitches.length ? Math.max(...pitches) : null,
      avgMidi: pitches.length ? round(total / pitches.length, 1) : null,
    };
  });

// Chỉ dùng khi không khai báo track: lấy các track piano có nốt, bỏ track trống/drum
export const pickDefaultTracks = (trackInfos) =>
  trackInfos
    .filter((t) => t.noteCount > 0 && !t.percussion && t.program <= MAX_PIANO_PROGRAM)
    .map((t) => t.index);

// Nhiều track: track có cao độ trung bình thấp nhất là tay trái, còn lại là tay phải.
// Một track: chia theo HAND_SPLIT_MIDI.
const buildHandResolver = (selectedInfos) => {
  if (selectedInfos.length === 1) {
    return (_trackIndex, midi) => (midi >= HAND_SPLIT_MIDI ? "right" : "left");
  }
  const leftTrack = selectedInfos.reduce((low, t) => (t.avgMidi < low.avgMidi ? t : low));
  return (trackIndex) => (trackIndex === leftTrack.index ? "left" : "right");
};

export const convertMidi = (midi, { tracks } = {}) => {
  const trackInfos = describeTracks(midi);
  const trackIndexes = tracks?.length ? tracks : pickDefaultTracks(trackInfos);

  if (!trackIndexes.length) {
    throw new Error("Không tìm thấy track piano, hãy chỉ định bằng --tracks");
  }
  const selectedInfos = trackIndexes.map((index) => {
    const info = trackInfos[index];
    if (!info || info.noteCount === 0) {
      throw new Error(`Track ${index} không tồn tại hoặc không có nốt`);
    }
    return info;
  });

  const resolveHand = buildHandResolver(selectedInfos);
  const seen = new Set();
  const notes = [];

  trackIndexes.forEach((trackIndex) => {
    midi.tracks[trackIndex].notes.forEach((note) => {
      if (note.midi < PIANO_MIN_MIDI || note.midi > PIANO_MAX_MIDI) return;

      // Khử nốt trùng (cùng cao độ, cùng thời điểm) giữa các track
      const key = `${note.midi}-${note.time.toFixed(3)}`;
      if (seen.has(key)) return;
      seen.add(key);

      notes.push({
        midi: note.midi,
        name: note.name,
        time: round(note.time),
        duration: round(note.duration),
        velocity: round(note.velocity),
        hand: resolveHand(trackIndex, note.midi),
      });
    });
  });

  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  const { tempos, timeSignatures, keySignatures } = midi.header;
  const key = keySignatures[0];
  return {
    metadata: {
      bpm: tempos.length ? Math.round(tempos[0].bpm) : 120,
      timeSignature: timeSignatures.length ? timeSignatures[0].timeSignature : [4, 4],
      keySignature: key ? `${key.key} ${key.scale}` : null,
      tracks: trackIndexes,
    },
    notes,
  };
};

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
    console.table(describeTracks(midi).filter((t) => t.noteCount > 0));
    return;
  }

  const sheet = convertMidi(midi, { tracks: args.tracks });
  const left = sheet.notes.filter((n) => n.hand === "left").length;
  console.log(`Tracks ${sheet.metadata.tracks.join(",")}: ${sheet.notes.length} nốt (trái ${left}, phải ${sheet.notes.length - left})`);

  if (args.out) {
    fs.writeFileSync(args.out, `${JSON.stringify(sheet, null, 2)}\n`);
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
