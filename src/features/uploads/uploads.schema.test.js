const test = require("node:test");
const assert = require("node:assert/strict");
const { parseSheetFields, parseUserId } = require("./uploads.schema");

const VALID = { title: "  Golden   Hour ", difficulty: "MEDIUM" };

// Lỗi 422 VALIDATION_FAILED kèm details.field
const failsOn = (body, field, message) =>
  assert.throws(
    () => parseSheetFields(body),
    (error) => error.status === 422 && error.code === "VALIDATION_FAILED" && error.details.field === field && message.test(error.message),
  );

test("giá trị mặc định: composer Unknown, PRIVATE, màu ngẫu nhiên, không tag, track gợi ý", () => {
  const fields = parseSheetFields(VALID);
  assert.deepEqual({ ...fields, coverColor: undefined }, {
    title: "Golden Hour",
    composer: "Unknown",
    difficulty: "MEDIUM",
    tags: [],
    coverColor: undefined,
    visibility: "PRIVATE",
    tracks: undefined,
  });
  assert.ok(["yellow", "pink", "mint", "lavender"].includes(fields.coverColor));
});

test("đọc đủ trường; tag gộp khoảng trắng, bỏ rỗng, bỏ trùng không phân biệt hoa thường", () => {
  const fields = parseSheetFields({
    ...VALID,
    composer: " JVKE ",
    tags: ["Pop", " lo   fi ", "", "POP"],
    coverColor: "mint",
    visibility: "PUBLIC",
    tracks: ["0", "2"],
  });
  assert.deepEqual(fields, {
    title: "Golden Hour",
    composer: "JVKE",
    difficulty: "MEDIUM",
    tags: ["Pop", "lo fi"],
    coverColor: "mint",
    visibility: "PUBLIC",
    tracks: [0, 2],
  });
  assert.deepEqual(parseSheetFields({ ...VALID, tags: "Anime" }).tags, ["Anime"]);
});

test("báo lỗi theo từng trường", () => {
  failsOn({ difficulty: "EASY" }, "title", /Give your sheet a title/);
  failsOn({ ...VALID, title: "   " }, "title", /Give your sheet a title/);
  failsOn({ ...VALID, title: "x".repeat(101) }, "title", /at most 100/);
  failsOn({ ...VALID, title: ["a", "b"] }, "title", /sent once/);
  failsOn({ ...VALID, composer: "x".repeat(101) }, "composer", /at most 100/);
  failsOn({ title: "A" }, "difficulty", /Choose a difficulty/);
  failsOn({ ...VALID, difficulty: "easy" }, "difficulty", /one of: EASY, MEDIUM, HARD, EXPERT/);
  failsOn({ ...VALID, tags: ["a", "b", "c", "d"] }, "tags", /up to 3 tags/);
  failsOn({ ...VALID, tags: "x".repeat(31) }, "tags", /at most 30/);
  failsOn({ ...VALID, coverColor: "red" }, "coverColor", /one of: yellow/);
  failsOn({ ...VALID, visibility: "FOLLOWERS" }, "visibility", /one of: PUBLIC, PRIVATE/);
  assert.throws(() => parseSheetFields({ ...VALID, tracks: "a" }), { code: "INVALID_TRACKS" });
});

test("parseUserId: số nguyên dương, sai dạng thì 404 USER_NOT_FOUND", () => {
  assert.equal(parseUserId("7"), 7);
  for (const bad of ["0", "-1", "abc", "1.5", "1e3", "99999999999", "", " 7"]) {
    assert.throws(() => parseUserId(bad), { status: 404, code: "USER_NOT_FOUND" }, bad);
  }
});