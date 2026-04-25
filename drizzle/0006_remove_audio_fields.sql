-- Remove audio-related columns from articles and drop audio_play_logs table
--> statement-breakpoint
DROP TABLE IF EXISTS "audio_play_logs";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "audio_url";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "audio_transcript";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "audio_duration_sec";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "audio_language";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "audio_play_count";
