// Kiểm thử hồi quy cho Auth API (register/login): chụp response làm mốc, sau khi sửa code thì so lại.
//   Chụp mốc:  node scripts/auth-regression.mjs --record  <file.json> [--base http://localhost:5000] [--existing user:pass]
//   So sánh:   node scripts/auth-regression.mjs --compare <file.json> [--base http://localhost:5000] [--existing user:pass]
// Mỗi lần chạy tạo vài tài khoản mới (hậu tố ngẫu nhiên) trong DB đang dùng, nên chỉ chạy trên DB dev.
// --existing: tài khoản đã có sẵn trong DB, kiểm tra vẫn đăng nhập được (vd. tài khoản tạo từ bản cũ).
import fs from "node:fs";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const mode = args.includes("--record") ? "record" : args.includes("--compare") ? "compare" : null;
const file = option(mode === "record" ? "--record" : "--compare");
const base = (option("--base") ?? "http://localhost:5000").replace(/\/$/, "");
const existing = option("--existing");
if (!mode || !file) {
  console.error("Cách dùng: node scripts/auth-regression.mjs --record|--compare <file.json> [--base url] [--existing user:pass]");
  process.exit(1);
}

const run = Math.random().toString(36).slice(2, 8);
const PASSWORD = "Password1";
const main = { displayName: "Regression Tester", username: `reg${run}`, email: `Reg${run}@Example.COM`, password: PASSWORD };

const send = async (path, body, { raw = false } = {}) => {
  const res = await fetch(`${base}/api/v1/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

// Thay các giá trị đổi theo mỗi lần chạy bằng ký hiệu cố định, đồng thời kiểm tra chúng hợp lệ
const problems = [];
const normalize = (name, response) => {
  const text = JSON.stringify(response).replaceAll(run, "<run>");
  const out = JSON.parse(text);
  const body = out.body;
  if (body?.accessToken) {
    const parts = body.accessToken.split(".");
    let payload = null;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    } catch {
      problems.push(`${name}: accessToken không phải JWT`);
    }
    if (payload) {
      if (payload.sub !== response.body.user?.id) problems.push(`${name}: token.sub (${payload.sub}) khác user.id (${response.body.user?.id})`);
      body.accessToken = `<jwt sub=user.id username=${payload.username?.replaceAll(run, "<run>")} role=${payload.role} ttl=${payload.exp - payload.iat}s>`;
    }
  }
  if (body?.user) {
    if (!Number.isInteger(body.user.id)) problems.push(`${name}: user.id không phải số nguyên`);
    if (Number.isNaN(Date.parse(body.user.createdAt))) problems.push(`${name}: user.createdAt không phải ngày hợp lệ`);
    body.user.id = "<id>";
    body.user.createdAt = "<iso-date>";
  }
  return out;
};

const cases = [
  // ---- register
  ["register: thành công (email viết hoa → lưu chữ thường)", () => send("/register", main)],
  ["register: displayName/username có khoảng trắng hai đầu được trim", () =>
    send("/register", { displayName: "  Spaced Name  ", username: `  sp${run}  `, email: `sp${run}@example.com`, password: PASSWORD })],
  ["register: trùng username", () => send("/register", { ...main, email: `other${run}@example.com` })],
  ["register: trùng email (khác hoa thường)", () => send("/register", { ...main, username: `other${run}`, email: `REG${run}@example.com` })],
  ["register: thiếu displayName", () => send("/register", { ...main, displayName: undefined })],
  ["register: username chỉ có khoảng trắng", () => send("/register", { ...main, username: "   " })],
  ["register: thiếu email", () => send("/register", { ...main, email: undefined })],
  ["register: thiếu password", () => send("/register", { ...main, password: undefined })],
  ["register: displayName là số (không phải chuỗi)", () => send("/register", { ...main, displayName: 123 })],
  ["register: username có chữ hoa", () => send("/register", { ...main, username: `Bad${run}` })],
  ["register: username có khoảng trắng ở giữa", () => send("/register", { ...main, username: `bad ${run}` })],
  ["register: username dài 51 ký tự", () => send("/register", { ...main, username: "a".repeat(51) })],
  ["register: displayName dài 101 ký tự", () => send("/register", { ...main, displayName: "x".repeat(101) })],
  ["register: email sai định dạng", () => send("/register", { ...main, username: `e1${run}`, email: "not-an-email" })],
  ["register: email dài 256 ký tự", () => send("/register", { ...main, username: `e2${run}`, email: `${"a".repeat(244)}@example.com` })],
  ["register: password không có chữ hoa", () => send("/register", { ...main, username: `p1${run}`, password: "password1" })],
  ["register: password không có số", () => send("/register", { ...main, username: `p2${run}`, password: "Password" })],
  ["register: password ngắn hơn 8 ký tự", () => send("/register", { ...main, username: `p3${run}`, password: "Pass1" })],
  ["register: body rỗng", () => send("/register", {})],
  ["register: body không phải JSON hợp lệ", () => send("/register", "{bad json", { raw: true })],
  // ---- login
  ["login: bằng username", () => send("/login", { identifier: main.username, password: PASSWORD })],
  ["login: bằng email", () => send("/login", { identifier: `reg${run}@example.com`, password: PASSWORD })],
  ["login: email viết hoa vẫn đăng nhập được", () => send("/login", { identifier: `REG${run}@EXAMPLE.COM`, password: PASSWORD })],
  ["login: username viết hoa vẫn đăng nhập được", () => send("/login", { identifier: main.username.toUpperCase(), password: PASSWORD })],
  ["login: sai mật khẩu", () => send("/login", { identifier: main.username, password: "Wrong1234" })],
  ["login: mật khẩu phân biệt hoa thường", () => send("/login", { identifier: main.username, password: PASSWORD.toLowerCase() })],
  ["login: tài khoản không tồn tại", () => send("/login", { identifier: `nobody${run}`, password: PASSWORD })],
  ["login: thiếu identifier", () => send("/login", { password: PASSWORD })],
  ["login: thiếu password", () => send("/login", { identifier: main.username })],
];
if (existing) {
  const [user, pass] = existing.split(":");
  cases.push(["login: tài khoản có sẵn trong DB (--existing)", async () => {
    const res = await send("/login", { identifier: user, password: pass });
    // Tài khoản có sẵn khác nhau giữa các máy: chỉ giữ kết quả đăng nhập được hay không
    return { status: res.status, body: { loggedIn: Boolean(res.body?.accessToken), username: res.body?.user?.username === user ? "<existing>" : res.body?.user?.username } };
  }]);
}

const results = {};
for (const [name, fn] of cases) results[name] = normalize(name, await fn());

if (mode === "record") {
  fs.writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  for (const [name, r] of Object.entries(results)) console.log(`[${r.status}] ${name}`);
  console.log(`\nĐã lưu mốc ${cases.length} trường hợp vào ${file}`);
} else {
  const baseline = JSON.parse(fs.readFileSync(file, "utf8"));
  let diff = 0;
  for (const [name, r] of Object.entries(results)) {
    const expected = baseline[name];
    const same = JSON.stringify(expected) === JSON.stringify(r);
    if (!same) diff++;
    console.log(`${same ? "SAME" : "DIFF"} [${r.status}] ${name}`);
    if (!same) console.log(`     mốc: ${JSON.stringify(expected)}\n     nay: ${JSON.stringify(r)}`);
  }
  const missing = Object.keys(baseline).filter((name) => !(name in results));
  missing.forEach((name) => console.log(`MISSING ${name} (có trong mốc nhưng không chạy)`));
  console.log(`\n${cases.length - diff}/${cases.length} giống mốc${missing.length ? `, ${missing.length} thiếu` : ""}`);
  if (diff || missing.length) process.exitCode = 1;
}
if (problems.length) {
  console.log("\nGiá trị không hợp lệ:\n  " + problems.join("\n  "));
  process.exitCode = 1;
}
