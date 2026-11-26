# Nhật ký thay đổi – Backend

Ghi các thay đổi quan trọng theo ngày (mới nhất ở trên). Chỉ ghi những gì người khác trong team cần biết. Chi tiết từng việc xem commit hoặc WBS (`TASK_DECOMPOSITION.md` ở repo FrontEnd).
Mục **Cần làm sau khi pull** là các lệnh phải chạy trên máy của bạn.

---

## 2026-11-26 – Chuẩn bị deploy (Railway + Neon)

- **Gửi email qua Resend:** `src/lib/mailer.js` có thêm cách gửi qua HTTP API của Resend (`RESEND_API_KEY`), ưu tiên hơn SMTP. Railway gói Hobby chặn cổng SMTP nên production dùng Resend. Cách gửi SMTP cũ và in ra console khi chạy local giữ nguyên.
- **CORS theo domain:** `CORS_ORIGIN` (danh sách cách nhau dấu phẩy). Bỏ trống thì cho mọi domain như trước.
- **Rate limit sau proxy:** `TRUST_PROXY` (số proxy đứng trước server). Bỏ trống hoặc `0` thì như trước.
- **Production** (`NODE_ENV=production`) không khởi động khi thiếu `CORS_ORIGIN`, hoặc thiếu cả `RESEND_API_KEY` lẫn `SMTP_HOST`.

**Cần làm sau khi pull:** không bắt buộc. Có thể thêm `CORS_ORIGIN=`, `TRUST_PROXY=0`, `RESEND_API_KEY=` vào `.env` theo `.env.example` (bỏ trống thì chạy như cũ).

## 2026-11-20 – Xác thực email, quên mật khẩu, rate limit và lint

- **API mới** (chi tiết `docs/api.md` › Auth): `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/verify-email/resend` (cần đăng nhập). Đăng ký thành công thì tự gửi email xác thực.
- **Quên mật khẩu** chỉ gửi cho tài khoản đã xác thực email, chưa xác thực trả `403 EMAIL_NOT_VERIFIED` (`README_main.md` mục 3.5). Link đặt lại hạn 30 phút, link xác thực hạn 24 giờ, mỗi link dùng một lần.
- **Database:** migration `add_auth_tokens` (bảng `auth_tokens`, enum `AuthTokenType`). Chỉ lưu mã băm SHA-256 của token. Chỉ thêm bảng, dữ liệu cũ giữ nguyên.
- **Gửi email:** `src/lib/mailer.js` (Nodemailer). Biến môi trường mới: `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (xem `.env.example`). Để trống `SMTP_HOST` thì email được in ra console. `NODE_ENV=production` mà thiếu `SMTP_HOST` thì server không khởi động.
- **Rate limit** (`express-rate-limit`): mọi route `/auth/*` tối đa 20 request / 15 phút / IP, vượt thì `429 TOO_MANY_REQUESTS`.
- **Lint:** thêm ESLint 9 (`eslint.config.js`, lệnh `npm run lint`). Sửa 1 biến thừa trong `scripts/uploads-smoke.mjs`.
- **Dọn dẹp:** xoá các thư mục trống `src/common/utils`, `src/features/auth/strategies`, `src/features/collections`, `src/features/sheets/helpers`, `src/types`.

**Cần làm sau khi pull:** `npm install`, `npm run db:deploy` (đã gồm `prisma generate`), thêm các biến mới vào `.env` theo `.env.example`, rồi khởi động lại server.

## 2026-11-07 – Ảnh hồ sơ, lịch sử chơi và dọn sau merge

- **Ảnh hồ sơ:** thêm API tải, xoá và lấy ảnh `avatar` / `background`. Nhận file bằng `multer`, `sharp` kiểm tra và đổi sang WebP, tạm lưu trong PostgreSQL (bảng `user_images`, migration `add_user_images`). User trả thêm `avatarUrl`, `backgroundUrl`.
- **Lịch sử chơi:** `GET /sheets/practice-history` trả thêm `composer`, `coverColor`.
- **Migration lệch thứ tự:** sau khi gộp `upload-midi` và `profile`, máy đã chạy migration của `profile` có thể thiếu `add_sheet_uploads`, làm API sheet trả 500 (`P2022`, thiếu cột `sheets.visibility`). Chạy `npm run db:deploy`, **không** đồng ý nếu Prisma đòi reset.

**Cần làm sau khi pull:** `npm install`, `npm run db:deploy`, `npm run db:seed`, rồi khởi động lại server.

## 2026-11-06 – Upload MIDI (Bình)

Người dùng tải file MIDI lên thành bài nhạc chơi được ở Workspace. Phần Backend đã xong, trừ lưu file trên Cloud (làm khi deploy).

- **Database:** migration `add_sheet_uploads` (`sheets` thêm `uploader_id`, `visibility`; bảng mới `sheet_files` chứa file MIDI gốc). Chỉ thêm cột / bảng, dữ liệu cũ giữ nguyên.
- **Thư viện, biến môi trường:** thêm `multer`; `FILE_STORAGE` (mặc định `postgres`, không khai báo cũng được).
- **API mới** (chi tiết `docs/api.md` › Uploads): `POST /uploads/midi/analyze`, `POST /sheets`, `PATCH /sheets/:id`, `DELETE /sheets/:id`, `GET /users/me/sheets`, `GET /users/:id/sheets` (cho trang profile).
- **Đổi hành vi API cũ:** bài `PRIVATE` chỉ người upload xem được: không có trong `GET /sheets`, `/sheets/tags`; người khác mở thì `404`. Sheet trả thêm `visibility`, `uploaderId`, `uploader`, `isMine`. `/sheets/:id/score` và `/view` nhận token (không bắt buộc).
- **Engine MIDI** dời sang `src/features/uploads/midiToSheet.js` (dùng chung cho seed và upload), xoá `src/data/sheets/convertMidi.mjs`. Bài mẫu `chasing-kou` sửa 1 nốt dài 0 giây.
- **Seed** không ghi đè bài người dùng upload nếu trùng id.
- **Kiểm thử:** `npm test` (không cần DB) và `npm run uploads:smoke` (chạy với DB thật, tự dọn dữ liệu).

**Cần làm sau khi pull:** `npm install`, `npm run db:deploy`, `npm run db:seed`.

## 2026-11-06 – API người dùng (Quỳnh)

- Thêm `GET /api/v1/users/me`, trả thông tin tài khoản đang đăng nhập. Không cần migration.

## 2026-11-05 – Hoá biểu, dấu nối và test

- `/sheets/:id/score` trả thêm `keySignature` và `tieToNext`. `accidental` có thể là `#`, `b`, `n` hoặc `null`.
- Thêm `npm test` (`node:test`), file test đặt cạnh code.

## 2026-11-05 – Lệnh dev

- Thêm `npm run dev`: server tự khởi động lại khi sửa code. `npm start` giữ nguyên.

## 2026-11-05 – Phím Practice hai tay

- `GET /api/v1/piano` trả thêm `practiceKeys`: hai vùng phím không dùng Shift (`zones`) và phím giữ để chơi hợp âm (`chordKeys`). Cả Home và Practice đều dùng.
- `chords` có thêm `octaves`, `required` (tối đa 4 nốt cần nhấn mỗi hợp âm) và `shortcut` (phím máy tính của nốt cần nhấn).

**Cần làm sau khi pull:** khởi động lại server.

## 2026-11-05 – Chuyển nốt sang bản nhạc

- `GET /api/v1/sheets/:id` trả thêm `chords`: các nhóm nốt người chơi phải nhấn trong chế độ Play, FE không tự gom nốt.
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
