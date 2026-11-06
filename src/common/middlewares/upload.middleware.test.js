const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const { receiveMidiFile, MAX_MIDI_BYTES } = require("./upload.middleware");
const { errorHandler } = require("./error.middleware");

const FUR_ELISE = fs.readFileSync(path.join(__dirname, "../../data/sheets/midi/fur-elise.mid"));

// App nhỏ chỉ có middleware upload, trả lại những gì nhận được
let baseUrl;
let server;
test.before(async () => {
  const app = express();
  app.post("/upload", receiveMidiFile, (req, res) => {
    res.json({ name: req.file.originalname, size: req.file.size, isHeader: req.file.buffer.subarray(0, 4).toString(), body: req.body });
  });
  app.use(errorHandler);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/upload`;
});
test.after(() => server.close());

const send = async (parts) => {
  const form = new FormData();
  parts.forEach(([field, value, fileName]) =>
    fileName ? form.append(field, new Blob([value]), fileName) : form.append(field, value),
  );
  const res = await fetch(baseUrl, { method: "POST", body: form });
  return { status: res.status, body: await res.json() };
};
const errorCode = (result) => [result.status, result.body.error?.code];

test("nhận file MIDI hợp lệ kèm các trường khác của form", async () => {
  const result = await send([["file", FUR_ELISE, "fur-elise.mid"], ["title", "Für Elise"]]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { name: "fur-elise.mid", size: FUR_ELISE.length, isHeader: "MThd", body: { title: "Für Elise" } });
});

test("giữ đúng tên file tiếng Việt, đuôi viết hoa vẫn nhận", async () => {
  const result = await send([["file", FUR_ELISE, "Bài ca mùa xuân.MIDI"]]);
  assert.equal(result.body.name, "Bài ca mùa xuân.MIDI");
});

test("file quá 1 MB báo 413 FILE_TOO_LARGE", async () => {
  const big = Buffer.concat([FUR_ELISE, Buffer.alloc(MAX_MIDI_BYTES)]);
  assert.deepEqual(errorCode(await send([["file", big, "big.mid"]])), [413, "FILE_TOO_LARGE"]);
});

test("sai đuôi hoặc không phải MIDI báo 415 UNSUPPORTED_FILE", async () => {
  assert.deepEqual(errorCode(await send([["file", FUR_ELISE, "song.mp3"]])), [415, "UNSUPPORTED_FILE"]);
  assert.deepEqual(errorCode(await send([["file", Buffer.from("not a midi"), "song.mid"]])), [415, "UNSUPPORTED_FILE"]);
  assert.deepEqual(errorCode(await send([["file", Buffer.alloc(0), "empty.mid"]])), [415, "UNSUPPORTED_FILE"]);
});

test("không có file báo 400 FILE_REQUIRED", async () => {
  assert.deepEqual(errorCode(await send([["title", "No file"]])), [400, "FILE_REQUIRED"]);
  const json = await fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.deepEqual([json.status, (await json.json()).error.code], [400, "FILE_REQUIRED"]);
});

test("nhiều file hoặc sai tên trường báo 400 UNEXPECTED_FILE", async () => {
  const two = await send([["file", FUR_ELISE, "a.mid"], ["file", FUR_ELISE, "b.mid"]]);
  assert.deepEqual(errorCode(two), [400, "UNEXPECTED_FILE"]);
  assert.deepEqual(errorCode(await send([["midi", FUR_ELISE, "a.mid"]])), [400, "UNEXPECTED_FILE"]);
});

test("request multipart hỏng báo 400 INVALID_UPLOAD, không phải 500", async () => {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=abc" },
    body: '--abc\r\nContent-Disposition: form-data; name="file"; filename="a.mid"\r\n\r\nMThd...',
  });
  assert.deepEqual([res.status, (await res.json()).error.code], [400, "INVALID_UPLOAD"]);
});
