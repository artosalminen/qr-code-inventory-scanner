-- CreateTable User
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "google_id" TEXT,
    "avatar" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable Project
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "csv_uploaded_at" TIMESTAMP(3),
    "default_qr_mode" TEXT NOT NULL DEFAULT 'check-in',
    "created_by" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProjectUser
CREATE TABLE "project_users" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assigned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable Box
CREATE TABLE "boxes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable BoxStateHistory
CREATE TABLE "box_state_history" (
    "id" TEXT NOT NULL,
    "box_id" TEXT NOT NULL,
    "state_set_by" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "installation_user" TEXT,
    "change_type" TEXT NOT NULL,
    "condition" TEXT,
    "broken_items" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_state_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable BoxInUseSession
CREATE TABLE "box_in_use_sessions" (
    "id" TEXT NOT NULL,
    "box_id" TEXT NOT NULL,
    "installation_user_id" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "usage_notes" TEXT,

    CONSTRAINT "box_in_use_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_google_id_idx" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "idx_project_user_unique" ON "project_users"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_users_project_id_idx" ON "project_users"("project_id");

-- CreateIndex
CREATE INDEX "project_users_user_id_idx" ON "project_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_project_qrcode_unique" ON "boxes"("project_id", "qr_code");

-- CreateIndex
CREATE INDEX "boxes_project_id_idx" ON "boxes"("project_id");

-- CreateIndex
CREATE INDEX "box_state_history_box_id_idx" ON "box_state_history"("box_id");

-- CreateIndex
CREATE INDEX "box_state_history_state_set_by_idx" ON "box_state_history"("state_set_by");

-- CreateIndex
CREATE INDEX "box_state_history_state_idx" ON "box_state_history"("state");

-- CreateIndex
CREATE INDEX "box_state_history_created_at_idx" ON "box_state_history"("created_at");

-- CreateIndex
CREATE INDEX "box_in_use_sessions_box_id_idx" ON "box_in_use_sessions"("box_id");

-- CreateIndex
CREATE INDEX "box_in_use_sessions_installation_user_id_idx" ON "box_in_use_sessions"("installation_user_id");

-- CreateIndex
CREATE INDEX "box_in_use_sessions_activated_at_idx" ON "box_in_use_sessions"("activated_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "box_state_history" ADD CONSTRAINT "box_state_history_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "box_state_history" ADD CONSTRAINT "box_state_history_state_set_by_fkey" FOREIGN KEY ("state_set_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_state_history" ADD CONSTRAINT "box_state_history_installation_user_fkey" FOREIGN KEY ("installation_user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_in_use_sessions" ADD CONSTRAINT "box_in_use_sessions_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "boxes"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "box_in_use_sessions" ADD CONSTRAINT "box_in_use_sessions_installation_user_id_fkey" FOREIGN KEY ("installation_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
