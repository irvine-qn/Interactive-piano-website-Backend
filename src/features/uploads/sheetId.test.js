const test = require("node:test");
const assert = require("node:assert/strict");
const { toSlug, pickFreeId } = require("./sheetId");

// Cùng các ca với test toSlug của FE (features/upload/utils/sheetDetails.test.js): 2 bên phải ra cùng id
test("toSlug giống FE: bỏ dấu tiếng Việt, ký tự lạ thành -, rỗng thì untitled", () => {
  assert.equal(toSlug("  Đêm Lao Xao (Piano)! "), "dem-lao-xao-piano");
  assert.equal(toSlug("Für Elise"), "fur-elise");
  assert.equal(toSlug("あの夏"), "untitled");
  assert.equal(toSlug("Merry Christmas Mr. Lawrence"), "merry-christmas-mr-lawrence");
});

test("pickFreeId: id trống thì dùng, trùng thì thêm -2, -3", () => {
  assert.equal(pickFreeId("canon-in-d", []), "canon-in-d");
  assert.equal(pickFreeId("canon-in-d", ["canon-in-d"]), "canon-in-d-2");
  assert.equal(pickFreeId("canon-in-d", ["canon-in-d", "canon-in-d-2", "canon-in-d-major"]), "canon-in-d-3");
});

test("pickFreeId: id trùng route cố định /sheets/tags thì đổi sang tags-2", () => {
  assert.equal(pickFreeId("tags", []), "tags-2");
});
