CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"categories" text[] NOT NULL,
	"roles" text[] NOT NULL,
	"thumbnail_url" text,
	"is_pro" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"body" text NOT NULL,
	"roles" text[] NOT NULL,
	"categories" text[] NOT NULL,
	"level" varchar(20) DEFAULT 'beginner' NOT NULL,
	"audio_url" text,
	"audio_transcript" text,
	"audio_duration_sec" integer,
	"audio_language" varchar(10),
	"audio_play_count" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "audio_play_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_hash" varchar(64),
	"played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_article_unique" UNIQUE("user_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"image" text,
	"auth_provider" varchar(20) DEFAULT 'local' NOT NULL,
	"password_hash" text,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"preferred_role" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audio_play_logs" ADD CONSTRAINT "audio_play_logs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_play_logs" ADD CONSTRAINT "audio_play_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_view_count_idx" ON "articles" USING btree ("view_count");--> statement-breakpoint
CREATE INDEX "articles_is_featured_idx" ON "articles" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "audio_play_logs_article_id_idx" ON "audio_play_logs" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "audio_play_logs_played_at_idx" ON "audio_play_logs" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks" USING btree ("user_id");