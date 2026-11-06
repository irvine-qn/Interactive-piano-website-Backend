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
| Tùy chọn | Có token hợp lệ thì `likedByMe`, `isMine` theo người dùng đó và người upload xem được bài `PRIVATE` của mình. Không có hoặc sai token vẫn trả `200` như khách |
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
| 400 | `FILE_REQUIRED` | Upload không gửi file |
| 400 | `UNEXPECTED_FILE` | Upload gửi nhiều file hoặc sai tên trường (phải là `file`) |
| 400 | `INVALID_UPLOAD` | Request multipart hỏng |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai token, hoặc tài khoản trong token không còn tồn tại |
| 401 | `INVALID_CREDENTIALS` | Sai tài khoản hoặc mật khẩu |
| 404 | `NOT_FOUND` | Route không tồn tại |
| 404 | `USER_NOT_FOUND` | Người dùng không tồn tại (`/users/:id/sheets`) |
| 404 | `SHEET_NOT_FOUND` | Bài nhạc không tồn tại, hoặc là bài `PRIVATE` của người khác (trả giống hệt để không lộ là có bài) |
| 409 | `USERNAME_TAKEN` | Username đã được dùng |
| 409 | `EMAIL_TAKEN` | Email đã được dùng |
| 409 | `SHEET_ID_TAKEN` | Không tạo được id cho bài (rất hiếm, nhiều người cùng tạo bài cùng tên), gửi lại là được |
| 413 | `FILE_TOO_LARGE` | File upload lớn hơn 1 MB |
| 415 | `UNSUPPORTED_FILE` | File upload không phải MIDI (sai đuôi hoặc không bắt đầu bằng `MThd`) |
| 422 | `VALIDATION_FAILED` | Dữ liệu gửi lên không hợp lệ. Ở `POST /sheets` có `details.field` là tên trường bị lỗi |
| 422 | `INVALID_MIDI` | File MIDI hỏng, không đọc được |
| 422 | `INVALID_TRACKS` | Danh sách track sai định dạng, hoặc track không tồn tại / không có nốt |
| 422 | `NO_NOTES` | Các track đã chọn không có nốt nào trong 88 phím |
| 422 | `MIDI_TOO_LARGE` | Bài quá 20 000 nốt hoặc quá 20 phút |
| 500 | `INTERNAL_ERROR` | Lỗi server, thường do PostgreSQL chưa chạy |

## Danh sách endpoint

| Method | Đường dẫn | Xác thực | Mô tả |
| --- | --- | --- | --- |
| POST | `/auth/register` | Không | Đăng ký |
| POST | `/auth/login` | Không | Đăng nhập |
| GET | `/piano` | Không | Cấu hình đàn và bảng phím |
| GET | `/frequencies` | Không | Tần số theo tên nốt |
| GET | `/sheets` | Tùy chọn | Danh sách bài nhạc |
| GET | `/sheets/tags` | Không | Danh sách thể loại |
| GET | `/sheets/:id` | Tùy chọn | Chi tiết bài nhạc |
| GET | `/sheets/:id/score` | Tùy chọn | Bản nhạc đã chuyển sang vị trí trên khuông |
| POST | `/sheets/:id/view` | Tùy chọn | Tăng lượt xem |
| POST | `/sheets/:id/like` | Bắt buộc | Thích hoặc bỏ thích |
| POST | `/uploads/midi/analyze` | Bắt buộc | Phân tích file MIDI trước khi tạo bài (không lưu gì) |
| POST | `/sheets` | Bắt buộc | Tạo bài từ file MIDI |
| PATCH | `/sheets/:id` | Bắt buộc | Sửa thông tin bài của mình |
| DELETE | `/sheets/:id` | Bắt buộc | Xoá bài của mình |
| GET | `/users/me/sheets` | Bắt buộc | Bài tôi đã upload (cả `PRIVATE`) |
| GET | `/users/:id/sheets` | Tùy chọn | Bài `PUBLIC` của một người dùng (trang profile) |

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
    "createdAt": "2026-11-05T07:00:00.000Z"
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
| `visibility` | string | `PUBLIC` hoặc `PRIVATE` (chỉ người upload thấy) |
| `uploaderId` | number hoặc null | `null` = bài mẫu |
| `uploader` | object hoặc null | `{ id, displayName }` của người upload (chưa đặt tên hiển thị thì là username), `null` = bài mẫu |
| `isMine` | boolean | Bài do người đang đăng nhập upload |

**Quyền xem (U-BE-08):** `GET /sheets` và `GET /sheets/tags` chỉ tính bài `PUBLIC` (kể cả với người upload; bài `PRIVATE` của tôi xem ở danh sách bài đã upload). `GET /sheets/:id`, `/score`, `/view`, `/like` với bài `PRIVATE` của người khác trả `404 SHEET_NOT_FOUND`.

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

## Uploads

Upload bài là 2 bước: phân tích file (`/uploads/midi/analyze`, không lưu gì) để người dùng xem và sửa lựa chọn track, rồi tạo bài (`POST /sheets`, gửi lại file cùng thông tin bài). Gửi file bằng `multipart/form-data`, trường `file`, đuôi `.mid`/`.midi`, tối đa 1 MB.

### POST `/uploads/midi/analyze`

**Xác thực:** bắt buộc.

**Form:**

| Trường | Bắt buộc | Mô tả |
| --- | --- | --- |
| `file` | Có | File MIDI |
| `tracks` | Không | Các track đang chọn, vd `0,1` (hoặc nhiều trường `tracks`). Không gửi thì dùng track gợi ý. Gọi lại khi người dùng đổi lựa chọn để số nốt, thời lượng, độ khó và cảnh báo tính theo các track đó |

**Thành công: `200`**

```json
{
  "fileName": "fur-elise.mid",
  "suggestedTitle": "Fur Elise",
  "suggestedDifficulty": "EASY",
  "bpm": 120,
  "timeSignature": [3, 4],
  "keySignature": "C major",
  "durationSec": 33,
  "noteCount": 104,
  "tracks": [
    {
      "index": 0,
      "name": "",
      "instrument": "acoustic grand piano",
      "program": 0,
      "isPiano": true,
      "isPercussion": false,
      "noteCount": 86,
      "minNote": "C4",
      "maxNote": "F5",
      "suggested": true
    }
  ],
  "suggestedTracks": [0, 1],
  "selectedTracks": [0, 1],
  "warnings": []
}
```

- `tracks`: chỉ các track có nốt. `instrument` có thể `null`. `suggested` = được gợi ý chọn (track piano, bỏ track trống và track quá nhỏ so với track chính).
- `suggestedTitle`: lấy từ tên file (tên ghi trong file MIDI thường rỗng hoặc là tên nhạc cụ).
- `suggestedDifficulty`: ước lượng từ mật độ nốt (khớp 8/9 bài mẫu), người dùng sửa được.
- `warnings`: `[{ code, count, message }]`, `message` hiện thẳng lên giao diện. Mã: `OUT_OF_RANGE_NOTES` (nốt ngoài 88 phím bị bỏ), `ZERO_LENGTH_NOTES` (nốt dài 0 giây được kéo thành 50 ms), `TEMPO_CHANGES` (bài đổi tempo, bản nhạc có thể lệch ô nhịp), `NO_PIANO_TRACK` (không có track piano, đang gợi ý nhạc cụ khác).

**Lỗi:** `401 UNAUTHORIZED`, `400 FILE_REQUIRED` / `UNEXPECTED_FILE` / `INVALID_UPLOAD`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE`, `422 INVALID_MIDI` / `INVALID_TRACKS` / `NO_NOTES` / `MIDI_TOO_LARGE`.

### POST `/sheets`

**Xác thực:** bắt buộc. Người gửi là người upload (`uploaderId`).

**Form:**

| Trường | Bắt buộc | Mô tả |
| --- | --- | --- |
| `file` | Có | File MIDI (như ở analyze) |
| `title` | Có | 1-100 ký tự (khoảng trắng thừa được gộp) |
| `composer` | Không | Tối đa 100 ký tự. Trống thì là `Unknown` |
| `difficulty` | Có | `EASY` / `MEDIUM` / `HARD` / `EXPERT` |
| `tags` | Không | Tối đa 3 tag, mỗi tag 1-30 ký tự, gửi nhiều trường `tags`. Trùng (không phân biệt hoa thường) thì bỏ; trùng tag đã có trong Library thì dùng cách viết đã có (`pop` thành `Pop`) |
| `coverColor` | Không | `yellow` / `pink` / `mint` / `lavender`. Không gửi thì chọn ngẫu nhiên |
| `visibility` | Không | `PUBLIC` / `PRIVATE`, mặc định `PRIVATE` |
| `tracks` | Không | Track đã chọn (như ở analyze). Không gửi thì dùng track gợi ý |

Bài và file gốc được lưu cùng lúc (lỗi thì không lưu gì). `id` tạo từ `title`: bỏ dấu tiếng Việt, ký tự khác chữ / số thành `-`, không còn chữ / số nào thì là `untitled`; trùng thì thêm `-2`, `-3` (`fur-elise-2`). Riêng `tags` đổi thành `tags-2` vì trùng đường dẫn `/sheets/tags`.

**Thành công: `201`**, đối tượng Sheet (như ở danh sách) kèm `visibility`, `uploaderId`:

```json
{
  "id": "fur-elise-2",
  "title": "Für Elise",
  "subtitle": null,
  "composer": "Ludwig van Beethoven",
  "difficulty": "EASY",
  "tags": ["Classical"],
  "bpm": 120,
  "timeSignature": [3, 4],
  "keySignature": "C major",
  "durationSec": 33,
  "noteCount": 104,
  "views": 0,
  "likes": 0,
  "coverColor": "mint",
  "createdAt": "2026-11-06T13:00:00.000Z",
  "visibility": "PUBLIC",
  "uploaderId": 3,
  "likedByMe": false
}
```

**Lỗi:** như analyze, thêm `422 VALIDATION_FAILED` (vd `{ "code": "VALIDATION_FAILED", "message": "Give your sheet a title.", "details": { "field": "title" } }`; `message` hiện thẳng lên giao diện) và `409 SHEET_ID_TAKEN`.

### PATCH `/sheets/:id`

**Xác thực:** bắt buộc, chỉ người upload. Bài của người khác, bài mẫu hoặc bài không tồn tại đều trả `404 SHEET_NOT_FOUND`.

**Body (JSON):** chỉ gửi trường muốn đổi, cùng luật với lúc tạo bài: `title`, `composer` (rỗng thành `Unknown`), `difficulty`, `tags` (mảng, tối đa 3), `coverColor`, `visibility`. Không đổi được nốt, file hay `id` (đổi tên bài thì `id` giữ nguyên, link cũ vẫn mở được). Gửi trường khác thì `422 VALIDATION_FAILED` với `details.field` là trường đó.

```json
{ "title": "Golden Hour (Piano)", "visibility": "PUBLIC" }
```

**Thành công: `200`**, đối tượng Sheet sau khi sửa.

**Lỗi:** `400 INVALID_JSON`, `401 UNAUTHORIZED`, `404 SHEET_NOT_FOUND`, `422 VALIDATION_FAILED`.

### DELETE `/sheets/:id`

**Xác thực:** bắt buộc, chỉ người upload (như `PATCH`). Xoá bài, file MIDI gốc và các lượt thích của bài.

**Thành công: `204`**, không có nội dung.

**Lỗi:** `401 UNAUTHORIZED`, `404 SHEET_NOT_FOUND`.

### GET `/users/me/sheets`

**Xác thực:** bắt buộc. Mọi bài người đang đăng nhập đã upload, cả `PUBLIC` và `PRIVATE`.

**Query:** giống `GET /sheets` (`q`, `difficulty`, `tag`, `sort`, `page`, `pageSize`), nhưng `sort` mặc định là `newest`.

**Thành công: `200`**, dạng giống `GET /sheets`: `{ "data": [Sheet...], "meta": { "page", "pageSize", "total", "totalPages" } }`.

**Lỗi:** `401 UNAUTHORIZED`, `422 VALIDATION_FAILED`.

### GET `/users/:id/sheets`

**Xác thực:** tùy chọn (chỉ ảnh hưởng `likedByMe`, `isMine`). Các bài `PUBLIC` mà người dùng `:id` đã upload, kể cả khi người xem là chính người đó (bài `PRIVATE` của mình xem ở `/users/me/sheets`). Dùng cho trang profile.

**Query và response:** như `/users/me/sheets`.

**Lỗi:** `404 USER_NOT_FOUND` (người dùng không tồn tại, hoặc `:id` không phải số nguyên dương), `422 VALIDATION_FAILED`.
