// Kiểm thử Feature Upload MIDI với database thật (bổ sung cho `npm test`, vốn không cần DB):
// tạo bài, quyền xem bài PRIVATE, bài đã upload, sửa / xoá.
//   Chạy:  npm run uploads:smoke      (cần Postgres đang chạy và đã `npm run db:deploy` + `npm run db:seed`)
// Tự tạo 2 tài khoản tạm (ký JWT trực tiếp, không cần đăng nhập), chạy server trên cổng ngẫu nhiên,
// cuối cùng xoá mọi bài + tài khoản tạm đã tạo. Chỉ chạy trên DB dev.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jwt = require("jsonwebtoken");
const app = require(path.join(ROOT, "src/app"));
const prisma = require(path.join(ROOT, "src/lib/prisma"));
const { JWT_SECRET } = require(path.join(ROOT, "src/config/env"));

const MIDI = path.join(ROOT, "src/data/sheets/midi/canon-in-d.mid");
const run = Math.random().toString(36).slice(2, 8);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "✔" : "✘"} ${name}${ok ? "" : `\n    ${JSON.stringify(detail)}`}`);
};

const users = [];
const server = await new Promise((resolve) => {
  const s = app.listen(0, () => resolve(s));
});
const api = `http://127.0.0.1:${server.address().port}/api/v1`;

const call = async (method, url, token, { json, form } = {}) => {
  const res = await fetch(api + url, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(json && { "Content-Type": "application/json" }) },
    body: form ?? (json && JSON.stringify(json)),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const upload = (token, fields) => {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(MIDI)]), "canon-in-d.mid");
  Object.entries(fields).forEach(([key, value]) => [].concat(value).forEach((item) => form.append(key, item)));
  return call("POST", "/sheets", token, { form });
};

try {
  // Tài khoản tạm: chủ bài và người khác
  for (const role of ["owner", "other"]) {
    const user = await prisma.user.create({
      data: { username: `smoke_${run}_${role}`, email: `smoke_${run}_${role}@example.com`, passwordHash: "x", displayName: `Smoke ${role}` },
    });
    users.push(user);
  }
  const [owner, other] = users.map((user) => jwt.sign({ sub: user.id, username: user.username, role: "user" }, JWT_SECRET));
  const [ownerUser] = users;
  const sampleCount = await prisma.sheet.count({ where: { uploaderId: null } });

  // 1. Phân tích + tạo bài
  const analyze = await (async () => {
    const form = new FormData();
    form.append("file", new Blob([fs.readFileSync(MIDI)]), "canon-in-d.mid");
    return call("POST", "/uploads/midi/analyze", owner, { form });
  })();
  check("analyze: 200, có track gợi ý, không lưu gì", analyze.status === 200 && analyze.body.suggestedTracks.length > 0, analyze.body);

  const priv = await upload(owner, { title: `Smoke ${run} Private`, difficulty: "EASY", tags: ["classical"] });
  const pub = await upload(owner, { title: `Smoke ${run} Public`, difficulty: "HARD", visibility: "PUBLIC", tags: [`Smoke${run}`] });
  check("tạo bài: 201, mặc định PRIVATE, tag theo cách viết có sẵn, isMine", priv.status === 201 && priv.body.visibility === "PRIVATE"
    && priv.body.isMine === true && priv.body.uploader.id === ownerUser.id && pub.body.visibility === "PUBLIC", priv.body);
  const savedFile = await prisma.sheetFile.findUnique({ where: { sheetId: priv.body.id } });
  check("tạo bài: file gốc lưu nguyên vẹn", savedFile && Buffer.from(savedFile.data).equals(fs.readFileSync(MIDI)), savedFile && savedFile.size);
  const noTitle = await upload(owner, { difficulty: "EASY" });
  check("tạo bài thiếu title: 422 kèm details.field", noTitle.status === 422 && noTitle.body.error.details.field === "title", noTitle.body);

  // 2. Quyền xem bài PRIVATE
  for (const [who, token] of [["khách", null], ["chủ bài", owner], ["người khác", other]]) {
    const list = await call("GET", "/sheets?pageSize=50&sort=newest", token);
    const ids = list.body.data.map((s) => s.id);
    const tags = (await call("GET", "/sheets/tags", token)).body.data.map((t) => t.name);
    check(`Library (${who}): có bài PUBLIC, không có bài PRIVATE`, ids.includes(pub.body.id) && !ids.includes(priv.body.id) && tags.includes(`Smoke${run}`), ids);
  }
  for (const [method, suffix] of [["GET", ""], ["GET", "/score"], ["POST", "/view"], ["POST", "/like"]]) {
    const url = `/sheets/${priv.body.id}${suffix}`;
    const mine = await call(method, url, owner);
    const theirs = await call(method, url, other);
    check(`${method} /sheets/:private${suffix}: chủ bài 200, người khác 404`, mine.status === 200 && theirs.status === 404 && theirs.body.error.code === "SHEET_NOT_FOUND", { mine: mine.status, theirs: theirs.status });
  }

  // 3. Bài đã upload
  const mine = await call("GET", "/users/me/sheets", owner);
  check("/users/me/sheets: cả 2 bài, mới nhất trước", JSON.stringify(mine.body.data.map((s) => s.id)) === JSON.stringify([pub.body.id, priv.body.id]), mine.body);
  const publicOnly = await call("GET", `/users/${ownerUser.id}/sheets`, other);
  check("/users/:id/sheets: chỉ bài PUBLIC", publicOnly.body.data.length === 1 && publicOnly.body.data[0].id === pub.body.id, publicOnly.body);
  const noUser = await call("GET", "/users/2147483647/sheets");
  check("/users/:id/sheets người không tồn tại: 404 USER_NOT_FOUND", noUser.status === 404 && noUser.body.error.code === "USER_NOT_FOUND", noUser.body);

  // 4. Sửa / xoá
  const patched = await call("PATCH", `/sheets/${priv.body.id}`, owner, { json: { title: "Smoke renamed", visibility: "PUBLIC" } });
  check("PATCH chủ bài: 200, id giữ nguyên", patched.status === 200 && patched.body.id === priv.body.id && patched.body.title === "Smoke renamed" && patched.body.visibility === "PUBLIC", patched.body);
  const patchOther = await call("PATCH", `/sheets/${priv.body.id}`, other, { json: { title: "x" } });
  const patchSample = await call("PATCH", "/sheets/fur-elise", owner, { json: { title: "x" } });
  const patchNotes = await call("PATCH", `/sheets/${priv.body.id}`, owner, { json: { notes: [] } });
  check("PATCH người khác / bài mẫu 404, sửa notes 422", patchOther.status === 404 && patchSample.status === 404 && patchNotes.status === 422, { patchOther: patchOther.status, patchSample: patchSample.status, patchNotes: patchNotes.status });
  const delOther = await call("DELETE", `/sheets/${pub.body.id}`, other);
  const del = await call("DELETE", `/sheets/${pub.body.id}`, owner);
  const left = await prisma.sheet.count({ where: { id: pub.body.id } });
  check("DELETE người khác 404, chủ bài 204 và bài mất hẳn", delOther.status === 404 && del.status === 204 && left === 0, { delOther: delOther.status, del: del.status, left });

  // 5. Bài mẫu không bị đụng
  const fur = await call("GET", "/sheets/fur-elise");
  check("bài mẫu vẫn nguyên: title, uploader null", fur.body.title === "Für Elise" && fur.body.uploader === null && (await prisma.sheet.count({ where: { uploaderId: null } })) === sampleCount, fur.body.title);
} catch (error) {
  failures += 1;
  console.error(error);
} finally {
  const ids = users.map((user) => user.id);
  const removed = ids.length ? await prisma.sheet.deleteMany({ where: { uploaderId: { in: ids } } }) : { count: 0 };
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(`Đã dọn: ${removed.count} bài, ${ids.length} tài khoản tạm.`);
  server.close();
  await prisma.$disconnect();
  console.log(failures ? `${failures} kiểm tra lỗi` : "Tất cả kiểm tra đều đạt");
  process.exitCode = failures ? 1 : 0;
}
