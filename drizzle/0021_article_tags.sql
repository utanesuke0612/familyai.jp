ALTER TABLE "articles"
ADD COLUMN "tags" text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX "articles_tags_gin_idx"
ON "articles" USING gin ("tags");
