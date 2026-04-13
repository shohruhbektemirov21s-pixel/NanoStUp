-- Admin subscription management: web users, plan catalog, managed subs, audit log

CREATE TYPE "AdminManagedSubStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "AdminManagedSubSource" AS ENUM ('PURCHASED', 'MANUAL');

CREATE TABLE "web_users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "password_hash" TEXT,
    "first_name" VARCHAR(120) NOT NULL DEFAULT '',
    "last_name" VARCHAR(120) NOT NULL DEFAULT '',
    "role" VARCHAR(32) NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "linked_telegram_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_users_email_key" ON "web_users"("email");
CREATE UNIQUE INDEX "web_users_phone_key" ON "web_users"("phone");
CREATE UNIQUE INDEX "web_users_linked_telegram_user_id_key" ON "web_users"("linked_telegram_user_id");
CREATE INDEX "web_users_email_idx" ON "web_users"("email");
CREATE INDEX "web_users_phone_idx" ON "web_users"("phone");
CREATE INDEX "web_users_is_active_idx" ON "web_users"("is_active");

ALTER TABLE "web_users" ADD CONSTRAINT "web_users_linked_telegram_user_id_fkey" FOREIGN KEY ("linked_telegram_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "managed_subscription_plans" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "price_minor" INTEGER NOT NULL,
    "discount_price_minor" INTEGER,
    "billing_period_days" INTEGER NOT NULL DEFAULT 30,
    "generation_limit" INTEGER,
    "export_limit" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "managed_subscription_plans_slug_key" ON "managed_subscription_plans"("slug");
CREATE INDEX "managed_subscription_plans_is_active_sort_order_idx" ON "managed_subscription_plans"("is_active", "sort_order");

CREATE TABLE "managed_subscriptions" (
    "id" TEXT NOT NULL,
    "telegram_user_id" TEXT,
    "web_user_id" TEXT,
    "billing_account_id" TEXT,
    "plan_slug" VARCHAR(64) NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "status" "AdminManagedSubStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AdminManagedSubSource" NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "price_applied_minor" INTEGER,
    "duration_days" INTEGER,
    "admin_note" TEXT,
    "granted_by_actor" VARCHAR(256) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managed_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "managed_subscriptions_telegram_user_id_status_idx" ON "managed_subscriptions"("telegram_user_id", "status");
CREATE INDEX "managed_subscriptions_web_user_id_status_idx" ON "managed_subscriptions"("web_user_id", "status");
CREATE INDEX "managed_subscriptions_starts_at_ends_at_idx" ON "managed_subscriptions"("starts_at", "ends_at");

ALTER TABLE "managed_subscriptions" ADD CONSTRAINT "managed_subscriptions_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_subscriptions" ADD CONSTRAINT "managed_subscriptions_web_user_id_fkey" FOREIGN KEY ("web_user_id") REFERENCES "web_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "managed_subscriptions" ADD CONSTRAINT "managed_subscriptions_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "billing_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "actor" VARCHAR(256) NOT NULL,
    "target_telegram_user_id" TEXT,
    "target_web_user_id" TEXT,
    "managed_subscription_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at" DESC);
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at" DESC);

ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_telegram_user_id_fkey" FOREIGN KEY ("target_telegram_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_web_user_id_fkey" FOREIGN KEY ("target_web_user_id") REFERENCES "web_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_managed_subscription_id_fkey" FOREIGN KEY ("managed_subscription_id") REFERENCES "managed_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
