// createSheet với repository giả (không cần database)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const uploadsRepository = require("./uploads.repository");
const sheetsRepository = require("../sheets/sheets.repository");
const sheetsService = require("../sheets/sheets.service");
const { createSheet, listMySheets, listUserSheets } = require("./uploads.service");

const MIDI_DIR = path.join(__dirname, "../../data/sheets/midi");
const file = (name) => ({ buffer: fs.readFileSync(path.join(MIDI_DIR, name)), originalname: name });
const FIELDS = {
  title: "Für Elise",
  composer: "Beethoven",
  difficulty: "EASY",
  tags: ["classical", "Study"],
  coverColor: "mint",
  visibility: "PUBLIC",
  tracks: undefined,
};

// Giả repository: takenIds = id đang có; failures = lỗi Prisma lần lượt cho các lần create
const fakeRepos = (t, { takenIds = [], failures = [] } = {}) => {
  const created = [];
  t.mock.method(sheetsRepository, "countTags", async () => [{ name: "Classical", count: 3 }, { name: "Pop", count: 2 }]);
  t.mock.method(uploadsRepository, "findIdsStartingWith", async (base) => takenIds.filter((id) => id.startsWith(base)));
  t.mock.method(uploadsRepository, "createSheet", async (data, savedFile) => {
    const failure = failures.shift();
    if (failure) {
      takenIds.push(data.id);
      throw Object.assign(new Error(failure), { code: failure });
    }
    created.push({ data, savedFile });
    const { notes, ...summary } = data;
    return { ...summary, noteCount: notes.length };
  });
  return created;
};

test("tạo bài: chuyển theo track gợi ý, id từ tên, tag theo cách viết có sẵn, gắn người upload", async (t) => {
  const created = fakeRepos(t, { takenIds: ["fur-elise"] });
  const sheet = await createSheet(file("fur-elise.mid"), FIELDS, 7);

  const [{ data, savedFile }] = created;
  assert.equal(data.id, "fur-elise-2");
  assert.deepEqual(data.tags, ["Classical", "Study"]);
  assert.equal(data.uploaderId, 7);
  assert.equal(data.noteCount, 104);
  assert.equal(data.notes.length, 104);
  assert.equal(data.durationSec, 33);
  assert.deepEqual(data.timeSignature, [3, 4]);
  assert.equal(data.bpm, 120);
  assert.deepEqual(
    [data.title, data.composer, data.difficulty, data.coverColor, data.visibility],
    ["Für Elise", "Beethoven", "EASY", "mint", "PUBLIC"],
  );
  assert.equal(savedFile.originalname, "fur-elise.mid");
  assert.equal(sheet.likedByMe, false);
  assert.equal(sheet.notes, undefined);
});

test("chọn track: chỉ lấy nốt của track đã chọn", async (t) => {
  const created = fakeRepos(t);
  await createSheet(file("MerryChristmasMr.Lawrence.mid"), { ...FIELDS, title: "Merry", tracks: [0, 1] }, 1);
  assert.equal(created[0].data.noteCount, 1775);
});

test("2 người cùng tạo 1 id (P2002): thử lại với id kế tiếp", async (t) => {
  const created = fakeRepos(t, { failures: ["P2002"] });
  await createSheet(file("fur-elise.mid"), FIELDS, 1);
  assert.equal(created[0].data.id, "fur-elise-2");
});

test("tài khoản không còn (P2003) -> 401; thử mãi vẫn trùng -> 409", async (t) => {
  fakeRepos(t, { failures: ["P2003"] });
  await assert.rejects(createSheet(file("fur-elise.mid"), FIELDS, 999), { status: 401, code: "UNAUTHORIZED" });
  t.mock.restoreAll();
  fakeRepos(t, { failures: Array(5).fill("P2002") });
  await assert.rejects(createSheet(file("fur-elise.mid"), FIELDS, 1), { status: 409, code: "SHEET_ID_TAKEN" });
});

test("track chọn không có nốt / file hỏng: báo lỗi trước khi lưu", async (t) => {
  const created = fakeRepos(t);
  await assert.rejects(createSheet(file("fur-elise.mid"), { ...FIELDS, tracks: [9] }, 1), { code: "INVALID_TRACKS" });
  await assert.rejects(createSheet({ buffer: Buffer.from("MThd-broken-file"), originalname: "x.mid" }, FIELDS, 1), {
    code: "INVALID_MIDI",
  });
  assert.equal(created.length, 0);
});

test("listMySheets: mọi bài của tôi (cả PRIVATE); listUserSheets: chỉ PUBLIC của người đó", async (t) => {
  const calls = [];
  t.mock.method(sheetsService, "listSheets", async (...args) => (calls.push(args), { data: [], meta: {} }));
  t.mock.method(uploadsRepository, "userExists", async (id) => id === 5);
  const query = { sort: "newest", page: 1, pageSize: 8 };

  await listMySheets(query, 7);
  await listUserSheets(5, query, 7);
  await listUserSheets(5, query, undefined);
  assert.deepEqual(calls, [
    [query, 7, { uploaderId: 7 }],
    [query, 7, { uploaderId: 5, visibility: "PUBLIC" }],
    [query, undefined, { uploaderId: 5, visibility: "PUBLIC" }],
  ]);
  await assert.rejects(listUserSheets(6, query, 7), { status: 404, code: "USER_NOT_FOUND" });
  assert.equal(calls.length, 3);
});