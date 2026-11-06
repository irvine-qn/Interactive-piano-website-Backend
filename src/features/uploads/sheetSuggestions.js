// Gợi ý thông tin bài từ file upload. Chỉ là gợi ý: người dùng xem và sửa ở form tạo bài.
const path = require("path");

const MAX_TITLE_LENGTH = 100;
const FALLBACK_TITLE = "Untitled";

// Tên bài lấy từ TÊN FILE. Tên ghi trong file MIDI không dùng được: đo trên 9 file mẫu thì luôn rỗng
// hoặc là tên nhạc cụ ("Grand Piano", "MIDI out #3").
//   "fur-elise.mid" -> "Fur Elise", "MerryChristmasMr.Lawrence.mid" -> "Merry Christmas Mr Lawrence"
const suggestTitle = (fileName) => {
  // Bỏ đuôi bằng regex: path.extname(".mid") trả "" (coi là file ẩn) nên tên ".mid" sẽ thành "Mid"
  const words = path
    .basename(String(fileName || ""))
    .replace(/\.[^.]*$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // tách chữ dính liền kiểu camelCase
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!words) return FALLBACK_TITLE;
  // Tên viết thường toàn bộ thì viết hoa chữ đầu mỗi từ; tên đã có chữ hoa thì giữ nguyên ý người đặt
  const title = words === words.toLowerCase() ? words.replace(/(^|\s)(\p{L})/gu, (m, space, letter) => space + letter.toUpperCase()) : words;
  return title.slice(0, MAX_TITLE_LENGTH).trim();
};

// ===== Gợi ý độ khó =====
// Hiệu chỉnh bằng 9 bài mẫu đã gán độ khó tay (catalog.json):
// - EASY tách bạch: cả 3 bài EASY < 5 nốt/giây và hợp âm thường chỉ 2 nốt, mọi bài khác đều vượt.
// - MEDIUM / HARD không tách được bằng số liệu (bài HARD duy nhất là flower-dance nằm lẫn giữa các bài MEDIUM),
//   kích thước hợp âm cũng không phản ánh độ khó (merry-christmas hợp âm lớn nhất nhưng chậm).
//   Ngưỡng HARD / EXPERT vì vậy là ước lượng vượt ra ngoài dữ liệu mẫu. Kết quả: đúng 8/9 bài mẫu.
const CHORD_GAP_SECONDS = 0.03; // nốt bắt đầu cách nhau <= 30 ms tính là 1 lần nhấn (giống sheets.score.js)
const EASY_MAX_NOTES_PER_SECOND = 5;
const EASY_MAX_CHORD_SIZE = 3;
const HARD_MIN_NOTES_PER_SECOND = 12;
const HARD_MIN_PRESSES_PER_SECOND = 7;
const EXPERT_MIN_NOTES_PER_SECOND = 18;
const EXPERT_MIN_PRESSES_PER_SECOND = 10;
const TYPICAL_CHORD_PERCENTILE = 0.95; // bỏ vài hợp âm lớn hiếm gặp (vd hợp âm kết bài)

const measureDifficulty = (notes) => {
  const start = Math.min(...notes.map((n) => n.time));
  const end = Math.max(...notes.map((n) => n.time + n.duration));
  const seconds = Math.max(end - start, 1);
  const chordSizes = [];
  let lastTime = -Infinity;
  [...notes]
    .sort((a, b) => a.time - b.time)
    .forEach((note) => {
      if (note.time - lastTime <= CHORD_GAP_SECONDS) {
        chordSizes[chordSizes.length - 1] += 1;
      } else {
        chordSizes.push(1);
        lastTime = note.time;
      }
    });
  chordSizes.sort((a, b) => a - b);
  return {
    notesPerSecond: notes.length / seconds,
    pressesPerSecond: chordSizes.length / seconds,
    typicalChordSize: chordSizes[Math.floor((chordSizes.length - 1) * TYPICAL_CHORD_PERCENTILE)],
  };
};

const estimateDifficulty = (notes) => {
  if (!notes.length) return "EASY";
  const { notesPerSecond, pressesPerSecond, typicalChordSize } = measureDifficulty(notes);
  if (notesPerSecond >= EXPERT_MIN_NOTES_PER_SECOND || pressesPerSecond >= EXPERT_MIN_PRESSES_PER_SECOND) return "EXPERT";
  if (notesPerSecond >= HARD_MIN_NOTES_PER_SECOND || pressesPerSecond >= HARD_MIN_PRESSES_PER_SECOND) return "HARD";
  if (notesPerSecond < EASY_MAX_NOTES_PER_SECOND && typicalChordSize <= EASY_MAX_CHORD_SIZE) return "EASY";
  return "MEDIUM";
};

module.exports = { suggestTitle, estimateDifficulty, measureDifficulty };
