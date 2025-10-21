CREATE TABLE "message_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'geral' NOT NULL,
	"company_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"variables" json,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
