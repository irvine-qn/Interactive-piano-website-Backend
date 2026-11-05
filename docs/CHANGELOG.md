# Nhật ký thay đổi – Backend

Ghi các thay đổi quan trọng theo ngày (mới nhất ở trên). Chỉ ghi những gì người khác trong team cần biết. Chi tiết từng việc xem commit hoặc WBS (`TASK_DECOMPOSITION.md` ở repo FrontEnd).
Mục **Cần làm sau khi pull** là các lệnh phải chạy trên máy của bạn.

---

## 2026-11-05 – Chuyển nốt sang bản nhạc

- Thêm `sheets.score.js` và `GET /api/v1/sheets/:id/score`: tính ô nhịp, trường độ và vị trí trên khuông từ số MIDI của từng nốt.

**Cần làm sau khi pull:** khởi động lại server.

## 2026-11-05 – Lượt xem và lượt thích thật

- Thêm bảng `sheet_likes` và `POST /api/v1/sheets/:id/like` (bắt buộc đăng nhập). API danh sách và chi tiết sheet trả thêm `likedByMe`.
- Bỏ số `views`, `likes` mẫu trong `catalog.json`. Migration `add_sheet_likes` đưa hai cột này về 0.
- Thêm `src/common/middlewares/auth.middleware.js` (`requireAuth`, `optionalAuth`).

**Cần làm sau khi pull:** `npm install`, `npm run db:deploy`, rồi khởi động lại server.

## 2026-11-05

- Thêm thư mục `docs/` (`NOTES.md`, `CHANGELOG.md`) để ghi chú kỹ thuật và nhật ký thay đổi.

## 2026-11-04 – Auth chuyển sang Prisma (C-06A, C-07A → C-07D)

- Merge `develop` (Feature Auth của Quỳnh) vào nhánh `sheet-library` (Bình). Mọi route, kể cả `/api/v1/auth`, đều nằm dưới `/api/v1`.
- Thêm model `User` và migration `20261104095754_add_users` (dùng `IF NOT EXISTS` để DB cũ đã có bảng `users` không bị lỗi).
- `users.repository.js` dùng Prisma, giữ nguyên tên hàm và dạng dữ liệu trả về. Bỏ `src/config/database.js` và `createUsersTable()`.
- Thêm script `db:deploy` và `scripts/auth-regression.mjs` (so sánh response Auth trước/sau khi sửa).
- README: thêm tài liệu Auth API và mục 6.3 *Updating an Existing Database After Pulling*.

**Cần làm sau khi pull:** `npm install`, rồi làm theo README 6.3. Nếu DB đã có bảng `users` từ server cũ thì thường là `npm run db:deploy`. **Không** đồng ý reset khi Prisma hỏi.

## 2026-10-29 – Sheet Library API (L-BE-06 → L-BE-11)

- Seed bài mẫu vào bảng `sheets` (`npm run db:seed`); API sheet đọc từ PostgreSQL qua `sheets.repository.js`.
- `GET /api/v1/sheets`: tìm kiếm, lọc độ khó và thể loại, sắp xếp `popular | likes | newest | title`, phân trang.
- Thêm `GET /api/v1/sheets/tags` và `POST /api/v1/sheets/:id/view` (tăng lượt xem).
- Tìm kiếm coi `%`, `_` là ký tự thường; body JSON sai trả `400 INVALID_JSON`.

**Cần làm sau khi pull:** `npm install`, `npm run db:migrate`, `npm run db:seed`.

## 2026-10-28 – Hạ tầng DB và `/api/v1` (C-01, L-BE-01 → L-BE-05)

- Tất cả route chuyển sang prefix `/api/v1` (FE đổi `baseURL` cùng lúc).
- PostgreSQL 16 chạy bằng `docker compose` (container `fiano-postgres`, volume `fiano-pgdata`).
- Cài Prisma 7 (`prisma-client-js` + `@prisma/adapter-pg`), model `Sheet`, migration `init_sheets`.
- Công cụ `scripts/midi-to-sheet.mjs` + `npm run sheets:build`: chuyển 9 bài MIDI mẫu sang JSON (chia tay trái/phải).

**Cần làm sau khi pull:** cài Docker Desktop, tạo `.env` từ `.env.example`, `docker compose up -d`, `npm install`, `npm run db:migrate`, `npm run db:seed`.
