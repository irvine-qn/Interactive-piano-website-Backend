-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "sheet_id" TEXT NOT NULL,
    "note_count" INTEGER NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_user_id_created_at_idx" ON "practice_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_sessions_sheet_id_idx" ON "practice_sessions"("sheet_id");

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
