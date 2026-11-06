const test = require("node:test");
const assert = require("node:assert");
const sharp = require("sharp");
const { processImage } = require("./users.images");

const makePng = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: "red" } }).png().toBuffer();

test("avatar được cắt vuông 512px và đổi sang WebP", async () => {
  const output = await processImage("avatar", await makePng(1000, 600));
  const { format, width, height } = await sharp(output).metadata();
  assert.deepStrictEqual({ format, width, height }, { format: "webp", width: 512, height: 512 });
});

test("ảnh bìa không phóng to, ảnh lớn thu về rộng 1600px", async () => {
  const small = await sharp(await processImage("background", await makePng(800, 200))).metadata();
  const large = await sharp(await processImage("background", await makePng(3200, 800))).metadata();
  assert.strictEqual(small.width, 800);
  assert.strictEqual(large.width, 1600);
});

test("file không phải ảnh báo 415 UNSUPPORTED_IMAGE", async () => {
  await assert.rejects(processImage("avatar", Buffer.from("not an image")), {
    status: 415,
    code: "UNSUPPORTED_IMAGE",
  });
});
