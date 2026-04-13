-- Telegram Mini App profile + auth source + managed subscription acquisition channel

CREATE TYPE "UserAuthSource" AS ENUM ('TELEGRAM', 'WEB', 'BOTH');
CREATE TYPE "SubscriptionAcquisitionChannel" AS ENUM ('TELEGRAM_MINI_APP', 'WEBSITE', 'ADMIN');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegram_photo_url" VARCHAR(1024);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "auth_source" "UserAuthSource" NOT NULL DEFAULT 'TELEGRAM';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mini_app_last_opened_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegram_linked_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "miniapp_session_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "managed_subscriptions" ADD COLUMN IF NOT EXISTS "acquisition_channel" "SubscriptionAcquisitionChannel";

CREATE INDEX IF NOT EXISTS "managed_subscriptions_acquisition_channel_idx" ON "managed_subscriptions"("acquisition_channel");
