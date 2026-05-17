-- DropForeignKey
ALTER TABLE "box_in_use_sessions" DROP CONSTRAINT "box_in_use_sessions_box_id_fkey";

-- DropForeignKey
ALTER TABLE "box_state_history" DROP CONSTRAINT "box_state_history_box_id_fkey";

-- DropForeignKey
ALTER TABLE "boxes" DROP CONSTRAINT "boxes_project_id_fkey";

-- DropForeignKey
ALTER TABLE "project_users" DROP CONSTRAINT "project_users_project_id_fkey";

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_state_history" ADD CONSTRAINT "box_state_history_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_in_use_sessions" ADD CONSTRAINT "box_in_use_sessions_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_project_qrcode_unique" RENAME TO "boxes_project_id_qr_code_key";

-- RenameIndex
ALTER INDEX "idx_project_user_unique" RENAME TO "project_users_project_id_user_id_key";
