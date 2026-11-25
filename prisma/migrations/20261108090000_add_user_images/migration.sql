-- Ảnh hồ sơ tạm lưu trong PostgreSQL. Chỉ thêm cột/bảng, dữ liệu cũ giữ nguyên.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" VARCHAR(255),
ADD COLUMN     "background_url" VARCHAR(255);

-- CreateTable
CREATE TABLE "user_images" (
    "user_id" INTEGER NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,

    CONSTRAINT "user_images_pkey" PRIMARY KEY ("user_id","kind")
);

-- AddForeignKey
ALTER TABLE "user_images" ADD CONSTRAINT "user_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
