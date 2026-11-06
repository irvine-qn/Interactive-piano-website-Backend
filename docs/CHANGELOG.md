# Nhật ký thay đổi – Backend

Ghi các thay đổi quan trọng theo ngày (mới nhất ở trên). Chỉ ghi những gì người khác trong team cần biết. Chi tiết từng việc xem commit hoặc WBS (`TASK_DECOMPOSITION.md` ở repo FrontEnd).
Mục **Cần làm sau khi pull** là các lệnh phải chạy trên máy của bạn.

---

## 2026-11-06 – Nhận file upload (U-BE-05, Bình)

- Thêm thư viện `multer` và middleware `src/common/middlewares/upload.middleware.js` (`receiveMidiFile`): nhận đúng 1 file MIDI ở trường `file` (≤ 1 MB, đuôi `.mid`/`.midi`, bắt đầu bằng `MThd`), giữ tên file tiếng Việt. Chưa gắn vào route nào (làm ở U-BE-06).
- Lỗi: `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE`, `400 FILE_REQUIRED`, `400 UNEXPECTED_FILE`, `400 INVALID_UPLOAD`.

**Cần làm sau khi pull:** `npm install`.

## 2026-11-06 – Database cho bài upload (U-BE-04, Bình)

- Migration `add_sheet_uploads`: `sheets` thêm `uploader_id` (FK `users`, null = bài mẫu) và `visibility` (`PUBLIC` | `PRIVATE`, bài cũ là PUBLIC); bảng mới `sheet_files` lưu file MIDI gốc. Chỉ thêm cột/bảng, không đổi dữ liệu cũ. API chưa đổi.
- Thêm `src/lib/fileStorage.js` (`save`, `read`, `remove`) và biến `FILE_STORAGE` (mặc định `postgres`).
- Model `User` chỉ thêm quan hệ `uploadedSheets` (không thêm cột vào bảng `users`).

**Cần làm sau khi pull:** `npm run db:deploy` (hoặc `npm run db:migrate`), thêm `FILE_STORAGE=postgres` vào `.env` (không thêm cũng được, mặc định là `postgres`).

## 2026-11-06 – Engine MIDI chịu được file lạ (U-BE-02, Bình)

- `midiToSheet.js` kiểm tra file (header `MThd`, file hỏng), giới hạn 20 000 nốt / 20 phút, chịu được track không có tên nhạc cụ. Lỗi là `ApiError` 422: `INVALID_MIDI`, `INVALID_TRACKS`, `NO_NOTES`, `MIDI_TOO_LARGE`.
- Gợi ý track tốt hơn: bỏ track quá nhỏ so với track chính (khớp 8/9 bài mẫu thay vì 7/9), không có track piano thì gợi ý mọi track không phải trống.
- `convertMidi` trả thêm `warnings` (`OUT_OF_RANGE_NOTES`, `ZERO_LENGTH_NOTES`, `TEMPO_CHANGES`). Tool seed in cảnh báo ra màn hình, JSON chỉ lưu `metadata` + `notes`.
- Nốt dài 0 giây được kéo thành 0.05 s. Sửa 1 nốt của `chasing-kou` (C#3 ở giây 88.7 trước đây không nhìn thấy trên waterfall).

**Cần làm sau khi pull:** `npm run db:seed` (cập nhật `chasing-kou`, giữ nguyên lượt xem và lượt thích).

## 2026-11-06 – Engine MIDI dùng chung (U-BE-01, Bình)

- Lõi chuyển MIDI → nốt chuyển sang `src/features/uploads/midiToSheet.js` (CommonJS), dùng chung cho tool seed và Feature Upload sắp làm. `scripts/midi-to-sheet.mjs` chỉ còn phần đọc file và dòng lệnh. Kết quả 9 bài mẫu không đổi.
- Sửa `npm run sheets:build` bị lỗi vì đường dẫn file MIDI của Merry Christmas trong `catalog.json` sai.
- Xoá `src/data/sheets/convertMidi.mjs` (bản cũ, đã được thay hoàn toàn).
- Thêm test hồi quy `midiToSheet.test.js` (chạy trong `npm test`).

**Cần làm sau khi pull:** không cần lệnh gì thêm.

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
