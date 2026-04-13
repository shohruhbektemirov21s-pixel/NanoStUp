-- Admin: chek tasdiqlash, Telegram notify, billing token
ALTER TABLE "billing_accounts" ADD COLUMN IF NOT EXISTS "notify_telegram_id" TEXT;

ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "tokens_granted" INTEGER;
ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "plan_tier_granted" TEXT;
ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "billing_months_granted" INTEGER;
ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP(3);
ALTER TABLE "receipt_verifications" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

CREATE INDEX IF NOT EXISTS "receipt_verifications_approval_status_idx" ON "receipt_verifications"("approval_status");
