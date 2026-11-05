const test = require("node:test");
const assert = require("node:assert/strict");
const { parseListQuery } = require("./sheets.schema");

test("giá trị mặc định của danh sách", () => {
  const query = parseListQuery({});
  assert.equal(query.sort, "popular");
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, 8);
});

test("pageSize lớn bị giới hạn", () => {
  assert.equal(parseListQuery({ pageSize: "1000" }).pageSize, 50);
});

test("từ chối tham số sai", () => {
  const isValidationError = (error) => error.status === 422;
  assert.throws(() => parseListQuery({ sort: "bad" }), isValidationError);
  assert.throws(() => parseListQuery({ difficulty: "bad" }), isValidationError);
  assert.throws(() => parseListQuery({ page: "0" }), isValidationError);
});
