// visibleTo / toSheet (không cần database). Quyền xem thật thử với DB: xem WBS U-BE-08.
const test = require("node:test");
const assert = require("node:assert/strict");
const { visibleTo, toSheet } = require("./sheets.repository");

test("visibleTo: khách chỉ thấy PUBLIC, không bao giờ có uploaderId undefined (Prisma coi là không lọc)", () => {
  for (const guest of [undefined, null, 0, NaN]) {
    const where = visibleTo(guest);
    assert.deepEqual(where, { visibility: "PUBLIC" });
    assert.ok(!JSON.stringify(where).includes("uploaderId"));
  }
});

test("visibleTo: người đăng nhập thấy PUBLIC và bài PRIVATE của chính mình", () => {
  assert.deepEqual(visibleTo(7), { OR: [{ visibility: "PUBLIC" }, { uploaderId: 7 }] });
});

test("toSheet: uploader dùng displayName (rỗng thì username), isMine, likedByMe", () => {
  const row = {
    id: "my-song",
    uploaderId: 7,
    uploader: { id: 7, username: "binh", displayName: null },
    likedBy: [{ userId: 7 }],
  };
  assert.deepEqual(toSheet(row, 7), {
    id: "my-song",
    uploaderId: 7,
    uploader: { id: 7, displayName: "binh" },
    isMine: true,
    likedByMe: true,
  });
  assert.equal(toSheet(row, 8).isMine, false);
  assert.equal(toSheet(row, undefined).isMine, false);
  const sample = toSheet({ id: "fur-elise", uploaderId: null, uploader: null }, undefined);
  assert.deepEqual([sample.uploader, sample.isMine, sample.likedByMe], [null, false, false]);
});
