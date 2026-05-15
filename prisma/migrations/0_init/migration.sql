-- CreateTable User
CREATE TABLE [users] (
    [id] NVARCHAR(MAX) NOT NULL,
    [email] NVARCHAR(MAX) NOT NULL,
    [name] NVARCHAR(MAX),
    [google_id] NVARCHAR(MAX),
    [avatar] NVARCHAR(MAX),
    [last_login] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY ([id])
);

-- CreateTable Project
CREATE TABLE [projects] (
    [id] NVARCHAR(MAX) NOT NULL,
    [name] NVARCHAR(MAX) NOT NULL,
    [description] NVARCHAR(MAX),
    [status] NVARCHAR(MAX) NOT NULL DEFAULT 'active',
    [csv_uploaded_at] DATETIME2,
    [default_qr_mode] NVARCHAR(MAX) NOT NULL DEFAULT 'check-in',
    [created_by] NVARCHAR(MAX) NOT NULL,
    [archived_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [projects_pkey] PRIMARY KEY ([id])
);

-- CreateTable ProjectUser
CREATE TABLE [project_users] (
    [id] NVARCHAR(MAX) NOT NULL,
    [project_id] NVARCHAR(MAX) NOT NULL,
    [user_id] NVARCHAR(MAX) NOT NULL,
    [role] NVARCHAR(MAX) NOT NULL,
    [assigned_by] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [project_users_pkey] PRIMARY KEY ([id])
);

-- CreateTable Box
CREATE TABLE [boxes] (
    [id] NVARCHAR(MAX) NOT NULL,
    [project_id] NVARCHAR(MAX) NOT NULL,
    [qr_code] NVARCHAR(MAX) NOT NULL,
    [label] NVARCHAR(MAX),
    [description] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [boxes_pkey] PRIMARY KEY ([id])
);

-- CreateTable BoxStateHistory
CREATE TABLE [box_state_history] (
    [id] NVARCHAR(MAX) NOT NULL,
    [box_id] NVARCHAR(MAX) NOT NULL,
    [state_set_by] NVARCHAR(MAX) NOT NULL,
    [state] NVARCHAR(MAX) NOT NULL,
    [installation_user] NVARCHAR(MAX),
    [change_type] NVARCHAR(MAX) NOT NULL,
    [condition] NVARCHAR(MAX),
    [broken_items] NVARCHAR(MAX),
    [notes] NVARCHAR(MAX),
    [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [box_state_history_pkey] PRIMARY KEY ([id])
);

-- CreateTable BoxInUseSession
CREATE TABLE [box_in_use_sessions] (
    [id] NVARCHAR(MAX) NOT NULL,
    [box_id] NVARCHAR(MAX) NOT NULL,
    [installation_user_id] NVARCHAR(MAX) NOT NULL,
    [activated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [completed_at] DATETIME2,
    [usage_notes] NVARCHAR(MAX),
    CONSTRAINT [box_in_use_sessions_pkey] PRIMARY KEY ([id])
);

-- CreateIndex
CREATE UNIQUE INDEX [users_email_key] ON [users]([email]);

-- CreateIndex
CREATE UNIQUE INDEX [users_google_id_key] ON [users]([google_id]);

-- CreateIndex
CREATE INDEX [users_google_id_idx] ON [users]([google_id]);

-- CreateIndex
CREATE INDEX [projects_status_idx] ON [projects]([status]);

-- CreateIndex
CREATE UNIQUE INDEX [idx_project_user_unique] ON [project_users]([project_id], [user_id]);

-- CreateIndex
CREATE INDEX [project_users_project_id_idx] ON [project_users]([project_id]);

-- CreateIndex
CREATE INDEX [project_users_user_id_idx] ON [project_users]([user_id]);

-- CreateIndex
CREATE UNIQUE INDEX [idx_project_qrcode_unique] ON [boxes]([project_id], [qr_code]);

-- CreateIndex
CREATE INDEX [boxes_project_id_idx] ON [boxes]([project_id]);

-- CreateIndex
CREATE INDEX [box_state_history_box_id_idx] ON [box_state_history]([box_id]);

-- CreateIndex
CREATE INDEX [box_state_history_state_set_by_idx] ON [box_state_history]([state_set_by]);

-- CreateIndex
CREATE INDEX [box_state_history_state_idx] ON [box_state_history]([state]);

-- CreateIndex
CREATE INDEX [box_state_history_created_at_idx] ON [box_state_history]([created_at]);

-- CreateIndex
CREATE INDEX [box_in_use_sessions_box_id_idx] ON [box_in_use_sessions]([box_id]);

-- CreateIndex
CREATE INDEX [box_in_use_sessions_installation_user_id_idx] ON [box_in_use_sessions]([installation_user_id]);

-- CreateIndex
CREATE INDEX [box_in_use_sessions_activated_at_idx] ON [box_in_use_sessions]([activated_at]);

-- AddForeignKey
ALTER TABLE [projects] ADD CONSTRAINT [projects_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [project_users] ADD CONSTRAINT [project_users_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [projects]([id]) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE [project_users] ADD CONSTRAINT [project_users_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [project_users] ADD CONSTRAINT [project_users_assigned_by_fkey] FOREIGN KEY ([assigned_by]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [boxes] ADD CONSTRAINT [boxes_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [projects]([id]) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE [box_state_history] ADD CONSTRAINT [box_state_history_box_id_fkey] FOREIGN KEY ([box_id]) REFERENCES [boxes]([id]) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE [box_state_history] ADD CONSTRAINT [box_state_history_state_set_by_fkey] FOREIGN KEY ([state_set_by]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [box_state_history] ADD CONSTRAINT [box_state_history_installation_user_fkey] FOREIGN KEY ([installation_user]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [box_in_use_sessions] ADD CONSTRAINT [box_in_use_sessions_box_id_fkey] FOREIGN KEY ([box_id]) REFERENCES [boxes]([id]) ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE [box_in_use_sessions] ADD CONSTRAINT [box_in_use_sessions_installation_user_id_fkey] FOREIGN KEY ([installation_user_id]) REFERENCES [users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
