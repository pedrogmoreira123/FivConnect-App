CREATE TABLE "chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"client_id" varchar NOT NULL,
	"agent_id" varchar,
	"company_id" varchar NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"protocol_number" integer,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"last_message_at" timestamp,
	"environment" text DEFAULT 'production' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "chat_id" text;