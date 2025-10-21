CREATE TABLE "conversation_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"company_id" varchar NOT NULL,
	"description" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp;