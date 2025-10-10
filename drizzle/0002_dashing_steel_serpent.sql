CREATE TABLE "channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"provider_name" text NOT NULL,
	"provider_token_encrypted" text NOT NULL,
	"phone_number" text,
	"status" text DEFAULT 'inactive' NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "quoted_message_id" varchar;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "status" text DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "updated_at" timestamp DEFAULT now();