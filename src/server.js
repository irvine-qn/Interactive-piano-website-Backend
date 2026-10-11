const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MIN_NOTE = 24;
const MAX_NOTE = 96;
const frequencies = {};

for (let midiNote = MIN_NOTE; midiNote <= MAX_NOTE; midiNote += 1) {
    const noteName = NOTE_NAMES[midiNote % NOTE_NAMES.length];
    const octave = Math.floor(midiNote / NOTE_NAMES.length) - 1;
    const frequency = 440 * (2 ** ((midiNote - 69) / 12));
    frequencies[`${noteName}${octave}`] = Number(frequency.toFixed(1));
}

app.get("/", (req, res) => {
    res.json({
        message: "Piano Backend is running!"
    });
});

app.get("/api/frequencies", (req, res) => {
    res.json(frequencies);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});