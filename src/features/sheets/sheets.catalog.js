// Danh mục sheet tạm thời (chưa có DB). Mỗi mục trỏ tới file JSON nốt trong src/data/sheets/.
// Khi có DB, chỉ cần thay file này bằng repository, service và controller giữ nguyên.
module.exports = [
  {
    id: "merry-christmas-mr-lawrence",
    title: "Merry Christmas Mr. Lawrence",
    composer: "Ryuichi Sakamoto",
    difficulty: "MEDIUM",
    tags: ["Movie", "Classical"],
    createdAt: "2026-10-23T00:00:00.000Z",
    dataFile: "../../data/sheets/merry-christmas-mr-lawrence.json",
  },
];
