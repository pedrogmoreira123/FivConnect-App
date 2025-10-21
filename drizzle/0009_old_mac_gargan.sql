CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"action" text NOT NULL,
	"user_id" varchar,
	"company_id" varchar NOT NULL,
	"old_values" json,
	"new_values" json,
	"metadata" json,
	"ip_address" text,
	"user_agent" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auto_assign_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"conditions" json NOT NULL,
	"actions" json NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
