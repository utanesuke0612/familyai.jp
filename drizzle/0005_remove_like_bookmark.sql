-- Drop like / bookmark tables and remove like_count column
--> statement-breakpoint
DROP TABLE IF EXISTS "article_bookmarks";--> statement-breakpoint
DROP TABLE IF EXISTS "article_likes";--> statement-breakpoint
ALTER TABLE "articles" DROP COLUMN IF EXISTS "like_count";
