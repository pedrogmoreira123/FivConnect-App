ALTER TABLE "companies" ADD COLUMN "whatsapp_channel_limit" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "whapi_channel_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "whapi_token" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "provider_type" text DEFAULT 'whapi' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "webhook_url" text;