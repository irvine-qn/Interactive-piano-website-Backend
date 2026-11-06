# Fiano Backend API

Tài liệu các API đang có trong code Backend. Hướng dẫn cài đặt xem [README](../README.md).

## Thông tin chung

| Mục | Giá trị |
| --- | --- |
| Base URL (local) | `http://localhost:5000/api/v1` |
| Định dạng | JSON |
| Xác thực | `Authorization: Bearer <accessToken>` |
| Thời hạn token | Theo biến môi trường `JWT_EXPIRES_IN` |

Riêng kiểm tra server nằm ngoài Base URL: `GET http://localhost:5000/` trả `{ "message": "Piano Backend is running!" }`.

### Mức xác thực

| Mức | Hành vi |
| --- | --- |
| Không | Không cần token |
| Tùy chọn | Có token hợp lệ thì `likedByMe` theo người dùng đó. Không có hoặc sai token vẫn trả `200`, `likedByMe` là `false` |
| Bắt buộc | Không có hoặc sai token trả `401 UNAUTHORIZED` |

### Định dạng lỗi

```json
{
  "error": {
    "code": "SHEET_NOT_FOUND",
    "message": "Sheet \"nope\" not found"
  }
}
```

| HTTP | `code` | Khi nào |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Body không phải JSON hợp lệ |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai token, hoặc tài khoản trong token không còn tồn tại |
| 401 | `INVALID_CREDENTIALS` | Sai tài khoản hoặc mật khẩu |
| 404 | `NOT_FOUND` | Route không tồn tại |
| 404 | `SHEET_NOT_FOUND` | Bài nhạc không tồn tại |
| 409 | `USERNAME_TAKEN` | Username đã được dùng |
| 409 | `EMAIL_TAKEN` | Email đã được dùng |
| 422 | `VALIDATION_FAILED` | Dữ liệu gửi lên không hợp lệ |
| 500 | `INTERNAL_ERROR` | Lỗi server, thường do PostgreSQL chưa chạy |

## Danh sách endpoint

| Method | Đường dẫn | Xác thực | Mô tả |
| --- | --- | --- | --- |
| POST | `/auth/register` | Không | Đăng ký |
| POST | `/auth/login` | Không | Đăng nhập |
| GET | `/users/me` | Bắt buộc | Thông tin tài khoản đang đăng nhập |
| PUT | `/users/profile` | Bắt buộc | Cập nhật hồ sơ |
| GET | `/piano` | Không | Cấu hình đàn và bảng phím |
| GET | `/frequencies` | Không | Tần số theo tên nốt |
| GET | `/sheets` | Tùy chọn | Danh sách bài nhạc |
| GET | `/sheets/tags` | Không | Danh sách thể loại |
| GET | `/sheets/liked` | Bắt buộc | Danh sách bài người dùng đã thích |
| GET | `/sheets/:id` | Tùy chọn | Chi tiết bài nhạc |
| GET | `/sheets/:id/score` | Không | Bản nhạc đã chuyển sang vị trí trên khuông |
| POST | `/sheets/:id/view` | Không | Tăng lượt xem |
| POST | `/sheets/:id/like` | Bắt buộc | Thích hoặc bỏ thích |

---

## Auth

### POST `/auth/register`

| Trường | Kiểu | Bắt buộc | Ràng buộc |
| --- | --- | --- | --- |
| `displayName` | string | Có | Tối đa 100 ký tự |
| `username` | string | Có | Chỉ chữ thường và số, tối đa 50 ký tự |
| `email` | string | Có | Email hợp lệ, tối đa 255 ký tự, được chuyển về chữ thường |
| `password` | string | Có | Ít nhất 8 ký tự, có 1 chữ hoa và 1 chữ số |

```json
{
  "displayName": "Nguyen Van A",
  "username": "nguyenvana",
  "email": "a@example.com",
  "password": "Passw0rdx"
}
```

**Thành công: `201`**

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": 1,
    "username": "nguyenvana",
    "email": "a@example.com",
    "displayName": "Nguyen Van A",
    "role": "user",
    "isVerified": false,
    "createdAt": "2026-11-05T07:00:00.000Z",
    "bio": null,
    "city": null,
    "country": null,
    "instagram": null,
    "level": null,
    "favoriteGenres": [],
    "favoriteArtists": [],
    "showPracticeStats": true
  }
}
```

**Lỗi:** `400 INVALID_JSON`, `409 USERNAME_TAKEN`, `409 EMAIL_TAKEN`, `422 VALIDATION_FAILED`.

### POST `/auth/login`

| Trường | Kiểu | Bắt buộc | Ghi chú |
| --- | --- | --- | --- |
| `identifier` | string | Có | Username hoặc email, được chuyển về chữ thường |
| `password` | string | Có | |

```json
{
  "identifier": "nguyenvana",
  "password": "Passw0rdx"
}
```

**Thành công: `200`**, cùng dạng với response của đăng ký.

**Lỗi:** `400 INVALID_JSON`, `401 INVALID_CREDENTIALS`, `422 VALIDATION_FAILED`.

---

## Users

### GET `/users/me`

**Thành công: `200`**, cùng dạng với `user` trong response của đăng ký.

**Lỗi:** `401 UNAUTHORIZED`.

### PUT `/users/profile`

Chỉ nhận các trường dưới đây, trường khác bị bỏ qua. Trường không gửi thì giữ nguyên, chuỗi rỗng thì xoá giá trị.

| Trường | Kiểu | Bắt buộc | Ràng buộc |
| --- | --- | --- | --- |
| `displayName` | string | Có | Tối đa 100 ký tự |
| `bio` | string | Không | Tối đa 160 ký tự |
| `city` | string | Không | Tối đa 100 ký tự |
| `country` | string | Không | Tối đa 100 ký tự |
| `instagram` | string | Không | Tên tài khoản, chỉ chữ, số, `.`, `_`, tối đa 30 ký tự. Có thể gửi kèm `@` |
| `level` | string | Không | `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `PROFESSIONAL` |
| `favoriteGenres` | string[] | Không | Tối đa 10 mục, mỗi mục tối đa 50 ký tự |
| `favoriteArtists` | string[] | Không | Tối đa 10 mục, mỗi mục tối đa 50 ký tự |
| `showPracticeStats` | boolean | Không | |

**Thành công: `200`**, cùng dạng với `user` trong response của đăng ký.

**Lỗi:** `400 INVALID_JSON`, `401 UNAUTHORIZED`, `422 VALIDATION_FAILED`.

---

## Piano

### GET `/piano`

Cấu hình đàn và bảng phím. Ví dụ dưới đây đã rút gọn các mảng.

**Thành công: `200`**

```json
{
  "minBpm": 30,
  "maxBpm": 240,
  "defaultBpm": 120,
  "minMidiNote": 24,
  "maxMidiNote": 96,
  "notes": [
    { "midi": 24, "name": "C1", "frequency": 32.7, "keyboardKey": "1" }
  ],
  "practiceKeys": {
    "zones": {
      "left": [{ "code": "KeyZ", "label": "Z", "offset": 0 }],
      "right": [{ "code": "KeyQ", "label": "Q", "offset": 0 }]
    },
    "chordKeys": {
      "left": [{ "code": "KeyA", "label": "A", "name": "major", "intervals": [0, 4, 7] }],
      "right": [{ "code": "Digit1", "label": "1", "name": "major", "intervals": [0, 4, 7] }]
    },
    "octaveRange": { "min": 0, "max": 7 }
  }
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `notes[].keyboardKey` | Bảng phím cũ dùng Shift, có thể là `null`. Giao diện hiện dùng `practiceKeys` |
| `practiceKeys.zones` | `left` là Zone 1, `right` là Zone 2 |
| `zones.*[].code` | Giá trị `KeyboardEvent.code` |
| `zones.*[].label` | Chữ hiển thị trên phím |
| `zones.*[].offset` | Số nửa cung tính từ nốt Đô đầu Zone |
| `chordKeys.*[].intervals` | Số nửa cung của các nốt trong hợp âm, tính từ nốt gốc |
| `chordKeys.*[].name` | `major`, `minor` hoặc `seventh` |
| `octaveRange` | Giới hạn vị trí Zone |

### GET `/frequencies`

**Thành công: `200`**. Ví dụ đã rút gọn.

```json
{
  "C1": 32.7,
  "C#1": 34.6
}
```

---

## Sheets

### Đối tượng Sheet

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | string | Slug, ví dụ `fur-elise` |
| `title` | string | |
| `subtitle` | string hoặc null | |
| `composer` | string | |
| `difficulty` | string | `EASY`, `MEDIUM`, `HARD`, `EXPERT` |
| `tags` | string[] | |
| `bpm` | number | BPM gốc của bài |
| `timeSignature` | number[] | `[tử số, mẫu số]` |
| `keySignature` | string hoặc null | |
| `durationSec` | number | Thời lượng, tính từ nốt cuối của bài |
| `noteCount` | number | |
| `views` | number | |
| `likes` | number | |
| `coverColor` | string | `yellow`, `pink`, `mint`, `lavender` |
| `createdAt` | string | ISO 8601 |
| `likedByMe` | boolean | |

### GET `/sheets`

**Xác thực:** tùy chọn.

| Query | Kiểu | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `q` | string | | Tìm theo tên bài hoặc tác giả, không phân biệt hoa thường |
| `difficulty` | string | | `EASY`, `MEDIUM`, `HARD`, `EXPERT` |
| `tag` | string | | So khớp chính xác, lấy từ `/sheets/tags` |
| `sort` | string | `popular` | `popular`, `likes`, `newest`, `title` |
| `page` | integer | `1` | Từ 1 trở lên |
| `pageSize` | integer | `8` | Từ 1 trở lên, lớn hơn 50 thì tính là 50 |

**Thành công: `200`**

```json
{
  "data": [
    {
      "id": "flower-dance",
      "title": "Flower Dance",
      "subtitle": null,
      "composer": "DJ Okawari",
      "difficulty": "HARD",
      "tags": ["Nu-jazz"],
      "bpm": 100,
      "timeSignature": [4, 4],
      "keySignature": null,
      "durationSec": 255,
      "noteCount": 2118,
      "views": 7,
      "likes": 0,
      "coverColor": "lavender",
      "createdAt": "2026-10-28T08:00:00.000Z",
      "likedByMe": false
    }
  ],
  "meta": { "page": 1, "pageSize": 1, "total": 9, "totalPages": 9 }
}
```

**Lỗi:** `422 VALIDATION_FAILED`.

### GET `/sheets/tags`

**Thành công: `200`**. Sắp theo số bài giảm dần, rồi theo tên.

```json
{
  "data": [
    { "name": "Contemporary Classical", "count": 3 },
    { "name": "Classical", "count": 2 }
  ]
}
```

### GET `/sheets/liked`

**Xác thực:** bắt buộc. Query và response giống `GET /sheets`, chỉ gồm các bài người dùng đang thích.

**Lỗi:** `401 UNAUTHORIZED`, `422 VALIDATION_FAILED`.

### GET `/sheets/:id`

**Xác thực:** tùy chọn. Trả toàn bộ trường của Sheet, thêm `notes` và `chords`. Ví dụ đã rút gọn các mảng.

**Thành công: `200`**

```json
{
  "id": "fur-elise",
  "title": "Für Elise",
  "bpm": 120,
  "timeSignature": [3, 4],
  "likedByMe": false,
  "notes": [
    { "hand": "right", "midi": 76, "name": "E5", "time": 1, "duration": 0.2365, "velocity": 0.5039 }
  ],
  "chords": [
    {
      "index": 0,
      "time": 1,
      "octaves": { "left": 3, "right": 4 },
      "zoneMoves": { "left": 0, "right": 0 },
      "notes": [
        {
          "name": "E5",
          "hand": "right",
          "midi": 76,
          "duration": 0.2365,
          "velocity": 0.5039,
          "required": true,
          "shortcut": "P"
        }
      ]
    }
  ]
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `notes[].time`, `duration` | Tính bằng giây ở tốc độ gốc của bài |
| `notes[].hand` | `left` hoặc `right` |
| `chords` | Các nốt bắt đầu cách nhau không quá 30 ms được gom thành một hợp âm |
| `chords[].octaves` | Vị trí của từng Zone khi chơi hợp âm này |
| `chords[].zoneMoves` | Số quãng mỗi Zone dời so với hợp âm trước |
| `chords[].notes[].required` | Nốt người chơi phải nhấn, tối đa 4 nốt mỗi hợp âm |
| `chords[].notes[].shortcut` | Phím máy tính của nốt phải nhấn, các nốt còn lại là `null` |

**Lỗi:** `404 SHEET_NOT_FOUND`.

### GET `/sheets/:id/score`

Chuyển nốt của bài sang vị trí trên khuông nhạc. Kết quả được tính mỗi lần gọi, không lưu vào database. Ví dụ đã rút gọn các mảng.

**Thành công: `200`**

```json
{
  "beats": 3,
  "beatUnit": 4,
  "keySignature": "C",
  "slotsPerMeasure": 12,
  "measureSeconds": 1.5,
  "measures": [
    {
      "index": 0,
      "treble": [
        { "slot": 0, "length": 8, "duration": "h", "isRest": true, "tieToNext": false, "notes": [] },
        {
          "slot": 8,
          "length": 2,
          "duration": "8",
          "isRest": false,
          "tieToNext": false,
          "notes": [
            { "midi": 76, "name": "E5", "key": "e/5", "accidental": null, "staffStep": 3 }
          ]
        }
      ],
      "bass": [
        { "slot": 0, "length": 12, "duration": "hd", "isRest": true, "tieToNext": false, "notes": [] }
      ]
    }
  ]
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `slot`, `length` | Vị trí và độ dài trong ô nhịp, tính theo nốt móc đôi |
| `duration` | `w`, `hd`, `h`, `qd`, `q`, `8d`, `8`, `16` |
| `keySignature` | Hoá biểu theo giọng trưởng, lấy từ dữ liệu bài hoặc suy ra từ nốt |
| `tieToNext` | Nốt được nối với nốt kế tiếp của cùng khuông |
| `name` | Tên nốt theo dấu thăng, dùng để so với `notes` và `chords` |
| `key` | Cao độ viết theo hoá biểu, định dạng VexFlow |
| `accidental` | Dấu cần ghi trước nốt: `#`, `b`, `n` (dấu bình), hoặc `null` |
| `staffStep` | Số dòng và khe tính từ dòng giữa của khuông |

**Lỗi:** `404 SHEET_NOT_FOUND`.

### POST `/sheets/:id/view`

Tăng lượt xem thêm 1. Không cần body.

**Thành công: `200`**

```json
{ "views": 8 }
```

**Lỗi:** `404 SHEET_NOT_FOUND`.

### POST `/sheets/:id/like`

**Xác thực:** bắt buộc. Chưa thích thì thành thích, đã thích thì bỏ thích. Không cần body.

**Thành công: `200`**

```json
{ "liked": true, "likes": 1 }
```

**Lỗi:** `401 UNAUTHORIZED`, `404 SHEET_NOT_FOUND`.
