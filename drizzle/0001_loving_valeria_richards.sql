-- Remove accounts: the ledger is single-user and local-only.
-- Foreign keys and columns first, then the Better Auth tables.
ALTER TABLE "ledger_paste" DROP CONSTRAINT IF EXISTS "ledger_paste_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "referral_note" DROP CONSTRAINT IF EXISTS "referral_note_updated_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "ledger_paste" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "referral_note" DROP COLUMN "updated_by";--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;
