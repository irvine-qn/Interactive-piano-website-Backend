const test = require("node:test");
const assert = require("node:assert/strict");
const { parseRegisterBody, parseLoginBody } = require("./auth.schema");

const validBody = {
  displayName: "Nguyen Van A",
  username: "nguyenvana",
  email: "A@Example.com",
  password: "Passw0rdx",
};
const assertValidationError = (run) =>
  assert.throws(run, (error) => error.status === 422 && error.code === "VALIDATION_FAILED");

test("đăng ký hợp lệ, email về chữ thường", () => {
  assert.equal(parseRegisterBody(validBody).email, "a@example.com");
});

test("từ chối username, email và mật khẩu sai", () => {
  assertValidationError(() => parseRegisterBody({ ...validBody, username: "Nguyen A" }));
  assertValidationError(() => parseRegisterBody({ ...validBody, email: "abc" }));
  assertValidationError(() => parseRegisterBody({ ...validBody, password: "password1" }));
});

test("đăng nhập cần đủ thông tin", () => {
  assertValidationError(() => parseLoginBody({ password: "x" }));
  assert.equal(parseLoginBody({ identifier: " ABC ", password: "x" }).identifier, "abc");
});
