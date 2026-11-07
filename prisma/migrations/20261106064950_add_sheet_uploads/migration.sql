-- Feature User upload sheet (U-BE-04): người upload, quyền xem và file MIDI gốc.
-- Chỉ thêm cột/bảng: 9 bài mẫu nhận visibility = PUBLIC, uploader_id = NULL, dữ liệu cũ giữ nguyên.

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "sheets" ADD COLUMN     "uploader_id" INTEGER,
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "sheet_files" (
    "sheet_id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheet_files_pkey" PRIMARY KEY ("sheet_id")
);

-- CreateIndex
CREATE INDEX "sheets_uploader_id_idx" ON "sheets"("uploader_id");

-- AddForeignKey
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_files" ADD CONSTRAINT "sheet_files_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
