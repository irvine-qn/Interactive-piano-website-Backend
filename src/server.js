const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MIN_NOTE = 24;
const MAX_NOTE = 96;
const MIN_BPM = 30;
const MAX_BPM = 240;
const DEFAULT_BPM = 120;
const KEYBOARD_KEYS = [
    "1", "!", "2", "@", "3", "4", "$", "5", "%", "6", "^", "7",
    "8", "*", "9", "(", "0", "q", "Q", "w", "W", "e", "E", "r",
    "t", "T", "y", "Y", "u", "i", "I", "o", "O", "p", "P", "a",
    "s", "S", "d", "D", "f", "g", "G", "h", "H", "j", "J", "k",
    "l", "L", "z", "Z", "x", "c", "C", "v", "V", "b", "B", "n",
    "m",
];

const notes = Array.from({ length: MAX_NOTE - MIN_NOTE + 1 }, (_, index) => {
    const midi = MIN_NOTE + index;
    const name = `${NOTE_NAMES[midi % NOTE_NAMES.length]}${Math.floor(midi / 12) - 1}`;
    const frequency = Number((440 * (2 ** ((midi - 69) / 12))).toFixed(1));
    return {
        midi,
        name,
        frequency,
        keyboardKey: KEYBOARD_KEYS[index] ?? null,
    };
});

const frequencies = Object.fromEntries(
    notes.map(({ name, frequency }) => [name, frequency]),
);

app.get("/", (req, res) => {
    res.json({
        message: "Piano Backend is running!"
    });
});

app.get("/api/frequencies", (req, res) => {
    res.json(frequencies);
});

app.get("/api/piano", (req, res) => {
    res.json({
        minBpm: MIN_BPM,
        maxBpm: MAX_BPM,
        defaultBpm: DEFAULT_BPM,
        minMidiNote: MIN_NOTE,
        maxMidiNote: MAX_NOTE,
        notes,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});