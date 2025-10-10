ALTER TABLE "conversations" ADD COLUMN "protocol_number" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "is_finished" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "finished_by" varchar;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_message" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "last_message_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "external_id" varchar;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "processed_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_finished_by_users_id_fk" FOREIGN KEY ("finished_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_protocol_number_unique" UNIQUE("protocol_number");