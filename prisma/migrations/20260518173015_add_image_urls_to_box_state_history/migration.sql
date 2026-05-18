-- AlterTable
ALTER TABLE "box_state_history" ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
