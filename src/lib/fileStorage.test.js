const test = require("node:test");
const assert = require("node:assert/strict");
const { createFileStorage } = require("./fileStorage");

// db giả thay cho Prisma (transaction client cũng có cùng dạng), ghi nhận các lệnh gọi
const fakeDb = (stored = null) => {
  const calls = [];
  return {
    calls,
    sheetFile: {
      upsert: async (args) => calls.push(["upsert", args]),
      findUnique: async (args) => (calls.push(["findUnique", args]), stored),
      deleteMany: async (args) => calls.push(["deleteMany", args]),
    },
  };
};

const storage = createFileStorage("postgres");

test("FILE_STORAGE không hỗ trợ thì báo lỗi ngay", () => {
  assert.throws(() => createFileStorage("ftp"), /FILE_STORAGE "ftp" is not supported/);
});

test("save ghi file, kích thước và tên gốc (ghi đè nếu đã có)", async () => {
  const db = fakeDb();
  await storage.save("my-song", Buffer.from("MThd-data"), { originalName: "My Song.mid", db });
  const [[method, args]] = db.calls;
  assert.equal(method, "upsert");
  assert.deepEqual(args.where, { sheetId: "my-song" });
  assert.equal(args.create.size, 9);
  assert.equal(args.create.originalName, "My Song.mid");
  assert.deepEqual(args.update, { data: args.create.data, originalName: "My Song.mid", size: 9 });
});

test("save nhận Uint8Array, tên quá dài giữ phần cuối (còn đuôi .mid)", async () => {
  const db = fakeDb();
  await storage.save("x", new Uint8Array([1, 2, 3]), { originalName: `${"a".repeat(300)}.mid`, db });
  const { create } = db.calls[0][1];
  assert.ok(Buffer.isBuffer(create.data));
  assert.equal(create.originalName.length, 255);
  assert.ok(create.originalName.endsWith(".mid"));
});

test("save từ chối dữ liệu không phải file", async () => {
  await assert.rejects(() => storage.save("x", "not a buffer", { db: fakeDb() }), TypeError);
});

test("read trả Buffer, không có file thì null", async () => {
  const file = await storage.read("x", { db: fakeDb({ data: new Uint8Array([77, 84]), originalName: "a.mid", size: 2 }) });
  assert.ok(Buffer.isBuffer(file.data));
  assert.deepEqual({ ...file, data: [...file.data] }, { data: [77, 84], originalName: "a.mid", size: 2 });
  assert.equal(await storage.read("x", { db: fakeDb(null) }), null);
});

test("remove không lỗi khi chưa có file", async () => {
  const db = fakeDb();
  await storage.remove("x", { db });
  assert.deepEqual(db.calls, [["deleteMany", { where: { sheetId: "x" } }]]);
});
