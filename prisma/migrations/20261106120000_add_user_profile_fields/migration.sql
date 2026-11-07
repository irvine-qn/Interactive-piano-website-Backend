-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" VARCHAR(160),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "favorite_artists" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "favorite_genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "instagram" VARCHAR(30),
ADD COLUMN     "level" VARCHAR(20),
ADD COLUMN     "show_practice_stats" BOOLEAN NOT NULL DEFAULT true;
