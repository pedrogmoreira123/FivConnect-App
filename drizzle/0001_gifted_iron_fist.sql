ALTER TABLE "clients" ADD COLUMN "company_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "company_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "connection_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "instance_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "profile_picture_url" text;