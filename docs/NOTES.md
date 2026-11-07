# Ghi chú kỹ thuật – Backend

Những điều cần biết khi làm việc với repo này: thay đổi lớn, quy ước, lỗi dễ gặp và việc còn mở.
Hướng dẫn cài đặt, chạy server và tài liệu API nằm ở [README](../README.md). Lịch sử thay đổi theo ngày: [CHANGELOG](CHANGELOG.md).

> Khi một thay đổi ảnh hưởng tới người khác trong team (đổi API, đổi cách tạo bảng, cần chạy lệnh mới sau khi pull...), ghi thêm vào file này và `CHANGELOG.md`.

---

## 0. Ai phụ trách phần nào

| Phần | Phụ trách | Ghi chú |
| --- | --- | --- |
| Auth (`features/auth/*`: register, login, JWT) | **Quỳnh** | Bình **không sửa** logic Auth. Riêng `users.repository.js` đã được Bình chuyển sang Prisma (C-07C), giữ nguyên tên hàm và dạng dữ liệu trả về |
| Cấu hình piano cho Home (`features/workspace/*`: `/api/v1/piano`, `/api/v1/frequencies`) | **Quỳnh** | Tên thư mục là `workspace` nhưng đây là API của **Home**, không phải trang Piano Workspace |
| Sheets (`features/sheets/*`, `src/data/sheets/*`, `scripts/midi-to-sheet.mjs`, `scripts/build-sheets.mjs`) và engine MIDI / upload (`features/uploads/*`) | **Bình** | Quỳnh **không sửa** |
| Database: Docker, Prisma (`prisma/*`, `prisma.config.js`, `src/lib/prisma.js`), `scripts/auth-regression.mjs` | **Bình** | Thêm bảng mới thì tạo migration theo mục 2, báo cho người kia |
| User profile + User edit profile (API đọc/sửa thông tin người dùng, ảnh avatar) | **Quỳnh** | Bình **không sửa** |
| User upload sheet (`features/uploads/*`, kể cả `/users/me/sheets`, `/users/:id/sheets`), `src/lib/fileStorage.js`, `scripts/uploads-smoke.mjs` | **Bình** | Quỳnh **không sửa**. Trang profile lấy bài của một người qua `GET /users/:id/sheets` (đã có) |
| Bài đã lưu của người dùng | Chưa phân công | |
| `src/app.js`, `src/server.js`, `src/config/env.js`, `src/common/*` | Cả hai | Chỉ sửa nếu không làm hỏng route của người kia |

> Phân công giữa **Nguyễn Thanh Bình** và **Nguyễn Thị Ngọc Quỳnh**. Khi đọc tài liệu này để làm việc, chỉ làm phần của người đang được giao; phần của người kia thì không sửa, cần đổi thì báo để người đó làm.

## 1. Thay đổi lớn cần biết khi pull

### 1.1 Auth đổi từ `pg` thuần sang Prisma (2026-11-04)

Feature Auth ban đầu (Quỳnh làm) dùng `pg` thuần. Hai người đã thống nhất chuyển sang Prisma để cả dự án chỉ dùng một cách truy cập DB; Bình thực hiện việc chuyển đổi (C-07A → C-07D).

| | Trước (pg thuần) | Bây giờ (Prisma) |
| --- | --- | --- |
| Kết nối DB | `src/config/database.js` tạo `Pool` của `pg` | `src/lib/prisma.js` (Prisma Client dùng chung, qua `@prisma/adapter-pg`) |
| Tạo bảng `users` | `createUsersTable()` chạy `CREATE TABLE IF NOT EXISTS` lúc server khởi động | Migration `prisma/migrations/20261104095754_add_users` (model `User`, `@@map("users")`) |
| Truy vấn | SQL viết tay trong `users.repository.js` | `prisma.user.*` trong `users.repository.js` |

Những gì **giữ nguyên** để không ảnh hưởng code Auth của Quỳnh:

- Tên bảng và tên cột y như cũ (`password_hash`, `display_name`, `is_verified`, `created_at`...). Model Prisma ánh xạ bằng `@map`.
- `users.repository.js` giữ nguyên tên hàm (`findByUsernameOrEmail`, `findByIdentifier`, `createUser`), tham số và **dạng dữ liệu trả về** (object snake_case như `SELECT *` của `pg`, xem hàm `toRow`). Vì vậy `auth.service.js`, `auth.controller.js`, `auth.schema.js` **không phải sửa**.
- API `/api/v1/auth/register`, `/api/v1/auth/login` giữ nguyên request/response. Đã so sánh trước/sau bằng `scripts/auth-regression.mjs` (xem README › Auth › Regression test).
- Package `pg` vẫn còn trong `dependencies` vì Prisma adapter cần nó. **Đừng xoá.**

Đã bỏ: `src/config/database.js`, hàm `createUsersTable()` và lời gọi nó trong `server.js`.

**Việc phải làm sau khi pull** nếu DB trên máy bạn đã có sẵn bảng `users` do server cũ tạo: `npm run db:migrate` sẽ báo *Drift detected … All data will be lost*. **Không trả lời `y`**. Làm theo bảng ở README mục 6.3 (thường chỉ cần `npm run db:deploy` một lần). Dữ liệu tài khoản cũ được giữ nguyên.

### 1.2 Tất cả API nằm dưới `/api/v1` (2026-10-28)

`src/app.js` mount mọi route dưới `/api/v1` (`/api/v1/piano`, `/api/v1/sheets`, `/api/v1/auth/...`). FE gọi qua axios với `baseURL = ${VITE_API_URL}/api/v1`. API mới cũng phải theo quy ước này (README mục 13).

### 1.3 Sheet đọc từ PostgreSQL (2026-10-29)

Trước đây sheet là file JSON đọc trực tiếp. Bây giờ bảng `sheets` (Prisma) là nguồn dữ liệu; file trong `src/data/sheets/` chỉ là **dữ liệu mẫu để seed** (`npm run db:seed`). Sửa một bài mẫu thì sửa JSON/catalog rồi seed lại. Seed chạy lại được nhiều lần, không mất `views`/`likes`.

---

## 2. Quy ước Database / Prisma

- **Mọi bảng chỉ được tạo bằng migration Prisma.** Không chạy `CREATE TABLE` lúc server khởi động.
- Đổi `schema.prisma` thì tạo migration mới: `npm run db:migrate -- --name <ten_thay_doi>`, rồi commit cả thư mục migration.
- Prisma 7 **không tự chạy `prisma generate`** sau `migrate dev`, và **không tự seed** sau `migrate reset`. Repo đã có `postdb:migrate`/`postdb:deploy` để tự generate; sau `migrate reset` nhớ chạy `npm run db:seed`.
- Gặp lời nhắc reset kèm *All data will be lost*: **không đồng ý**. Hầu hết trường hợp dùng `npm run db:deploy` hoặc `npx prisma migrate resolve --applied <tên_migration>` là đủ (README 6.3).
- Khoá chính `users.id` là số tự tăng (`SERIAL`), còn `sheets.id` là slug chữ (`fur-elise`).
- File MIDI gốc của bài upload (`sheet_files`) **chỉ đọc/ghi qua `src/lib/fileStorage.js`**, không gọi `prisma.sheetFile` trực tiếp: khi deploy sẽ chuyển sang Cloud.
- Truy vấn bài theo người xem **luôn dùng `visibleTo(userId)`** (`sheets.repository.js`). Đừng tự viết `{ uploaderId: userId }`: khách có `userId` là `undefined` và Prisma coi `undefined` là *không lọc*, lộ mọi bài `PRIVATE`. API mới đọc bài theo id thì gắn `optionalAuth` để người upload mở được bài `PRIVATE` của mình.

## 3. Dữ liệu bài nhạc (`sheets.notes`) – FE phụ thuộc vào định dạng này

Mỗi nốt: `{ midi, name, time, duration, velocity, hand }`.

- `time` và `duration` tính bằng **giây ở tốc độ gốc** của bài. `notes` sắp theo `time`.
- `hand` là `left` hoặc `right`. FE tô màu theo tay (phải cam, trái xanh dương).
- Trường `bpm` của sheet **phải đúng BPM gốc**: Workspace dùng nó để đổi tốc độ phát (0.5x–1.5x) và hiển thị BPM thực tế. BPM sai thì BPM hiển thị cũng sai, còn tốc độ thì không bị ảnh hưởng.
- Tên nốt dạng `C4`, `F#3` (dấu thăng `#`, không dùng giáng). FE tra phím theo tên này.
- Sửa engine `src/features/uploads/midiToSheet.js` thì chạy `npm test`: test so **từng nốt** của 9 bài mẫu với JSON đã lưu. Cố ý đổi bài mẫu thì chạy lại `npm run sheets:build` + `npm run db:seed`.
- Engine và route upload nhận file của người dùng: **không tin dữ liệu vào**. Câu lỗi (`ApiError`) hiện thẳng lên giao diện nên viết tiếng Anh dễ hiểu. Mã lỗi: `docs/api.md`.
- Route upload: `receiveMidiFile` đặt **sau** `requireAuth`. Trường chữ của form trong `req.body` luôn là chuỗi (nhiều trường cùng tên thành mảng), phải tự kiểm tra kiểu.
- Id bài upload tạo ở `src/features/uploads/sheetId.js` (`toSlug`) **phải giống `toSlug` của FE** (`features/upload/utils/sheetDetails.js`): bìa vẽ theo id, Preview ở `/upload` đoán id theo cách này. Thêm route cố định mới dưới `/sheets/<chữ>` thì thêm `<chữ>` vào `RESERVED_IDS`, nếu không bài cùng tên sẽ không mở được.
- Seed bỏ qua id đã thuộc về bài người dùng upload. Thêm bài mẫu mới thì kiểm tra log seed.
- `GET /users/me/sheets`, `/users/:id/sheets` nằm ở `uploads.routes.js` (Bình), không ở `features/users`. Quỳnh thêm route `/users/...` cho profile thì không khai báo trùng 2 đường dẫn này; route `/users/me/...` luôn khai báo trước `/users/:id/...`.
- `findMany(query, userId, scope)` của `sheets.repository.js`: `scope` không được chứa giá trị `undefined` (vd `{ uploaderId: undefined }` thành không lọc, trả bài của mọi người).
- Gợi ý track (`pickDefaultTracks`) chỉ đúng 8/9 bài mẫu: luôn để người dùng xác nhận track, đừng tự lưu theo gợi ý.

## 4. Lỗi dễ gặp khi chạy local

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| API trả `500 INTERNAL_ERROR`, FE báo không tải được bài/đăng nhập không được | Container `fiano-postgres` đang tắt (tắt Docker Desktop, khởi động lại máy) | `docker compose up -d` (hoặc `docker start fiano-postgres`), chờ `healthy` |
| `db:migrate` đòi reset, báo mất dữ liệu | DB tạo trước khi có migration `add_users` | README 6.3, **không** đồng ý reset |
| Không khởi động được Postgres, lỗi port 5432 | Máy đã có Postgres khác | Đổi `POSTGRES_PORT` và port trong `DATABASE_URL` cho giống nhau |
| Code báo thiếu field/model Prisma sau khi pull | Chưa generate lại client | `npm run db:generate` (hoặc `npm install`) |
| Đăng ký/đăng nhập trả `500`, log server có `secretOrPrivateKey must have a value` | Thiếu `JWT_SECRET` trong `.env` (không có giá trị mặc định) | Copy từ `.env.example` và đặt chuỗi ngẫu nhiên |

## 5. Kiểm tra trước khi tạo PR

1. `npx prisma migrate status` → `Database schema is up to date!`
2. `npm start`, mở `http://localhost:5000` → `{ "message": "Piano Backend is running!" }`
3. Thử `GET /api/v1/piano`, `GET /api/v1/sheets`, `GET /api/v1/sheets/tags`, `GET /api/v1/sheets/fur-elise`.
4. `npm test` (không cần DB). Có sửa sheets / uploads: `npm run uploads:smoke` (cần DB đang chạy, tự dọn dữ liệu thử).
5. Có sửa Auth: chạy `scripts/auth-regression.mjs --compare` với baseline chụp trước khi sửa.
6. Có thêm/đổi API: cập nhật README mục *Available API* và `docs/api.md`.

## 6. Việc còn mở

- **Upload MIDI**: Backend xong. Còn lưu file trên Cloud khi deploy (U-BE-12: thêm driver cho `fileStorage.js`, dùng chung dịch vụ với ảnh hồ sơ, cần thống nhất dịch vụ).
- **Ảnh hồ sơ:** đang tạm lưu trong PostgreSQL (`user_images`), client chỉ dùng URL. Khi deploy chuyển sang Cloud.
- **Bài đã lưu của người dùng**: chưa phân công.
- **Kết quả đánh giá code (2026-11-07):** AU-01 → AU-17 trong `TASK_DECOMPOSITION.md` (repo FrontEnd). **Chưa nên deploy công khai** khi chưa có rate limit, hạn mức upload và giới hạn CORS (AU-03 → AU-05).
