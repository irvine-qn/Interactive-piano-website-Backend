const test = require("node:test");
const assert = require("node:assert");
const { parseProfileBody } = require("./users.schema");

const isValidationError = (error) => error.code === "VALIDATION_FAILED";

test("giu cac truong cho phep va bo qua truong khac", () => {
  const result = parseProfileBody({
    displayName: " An ",
    role: "admin",
    email: "x@y.z",
    username: "hack",
    passwordHash: "x",
  });
  assert.strictEqual(result.displayName, "An");
  for (const field of ["role", "email", "username", "passwordHash"]) {
    assert.ok(!(field in result));
  }
});

test("chuoi rong xoa gia tri, khong gui thi giu nguyen", () => {
  const result = parseProfileBody({ displayName: "An", city: "  ", instagram: "", level: "" });
  assert.strictEqual(result.city, null);
  assert.strictEqual(result.instagram, null);
  assert.strictEqual(result.level, null);
  assert.strictEqual(result.country, undefined);
});

test("instagram bo dau @ va tu choi link", () => {
  assert.strictEqual(parseProfileBody({ displayName: "An", instagram: "@an.piano" }).instagram, "an.piano");
  assert.throws(() => parseProfileBody({ displayName: "An", instagram: "javascript:alert(1)" }), isValidationError);
});

test("tu choi du lieu sai", () => {
  const invalid = [
    {},
    { displayName: "  " },
    { displayName: "An", bio: "a".repeat(161) },
    { displayName: "An", level: "GOD" },
    { displayName: "An", favoriteGenres: "Jazz" },
    { displayName: "An", favoriteArtists: Array.from({ length: 11 }, (_, i) => `a${i}`) },
    { displayName: "An", showPracticeStats: "yes" },
  ];
  for (const body of invalid) {
    assert.throws(() => parseProfileBody(body), isValidationError);
  }
});
