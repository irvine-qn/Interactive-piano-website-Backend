-- CreateTable
CREATE TABLE "sheet_likes" (
    "user_id" INTEGER NOT NULL,
    "sheet_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheet_likes_pkey" PRIMARY KEY ("user_id","sheet_id")
);

-- CreateIndex
CREATE INDEX "sheet_likes_sheet_id_idx" ON "sheet_likes"("sheet_id");

-- AddForeignKey
ALTER TABLE "sheet_likes" ADD CONSTRAINT "sheet_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_likes" ADD CONSTRAINT "sheet_likes_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bỏ số liệu mẫu để lượt xem và lượt thích đếm từ người dùng thật
UPDATE "sheets" SET "views" = 0, "likes" = 0;
