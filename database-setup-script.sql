-- Fi.V Connect - Automatic Database Setup Script
-- This script creates all necessary tables and initial data for a new Fi.V App instance
-- Version: 1.0
-- Created: 2025-08-29

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
    is_online boolean DEFAULT false,
    custom_theme json,
    environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),
    created_at timestamp DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    phone text NOT NULL UNIQUE,
    email text,
    notes text,
    environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Queues table
CREATE TABLE IF NOT EXISTS queues (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    working_hours json,
    message_inside_hours text,
    message_outside_hours text,
    is_active boolean DEFAULT true,
    environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),
    created_at timestamp DEFAULT now()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name text NOT NULL,
    contact_phone text NOT NULL,
    client_id varchar REFERENCES clients(id),
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('in_progress', 'waiting', 'completed', 'closed')),
    assigned_agent_id varchar REFERENCES users(id),
    queue_id varchar REFERENCES queues(id),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    tags json,
    environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),
    last_message_at timestamp DEFAULT now(),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id varchar NOT NULL REFERENCES conversations(id),
    sender_id varchar REFERENCES users(id),
    content text NOT NULL,
    message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
    direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    media_url text,
    environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),
    is_read boolean DEFAULT false,
    sent_at timestamp DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    updated_at timestamp DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id),
    token text NOT NULL,
    ip_address text,
    user_agent text,
    expires_at timestamp NOT NULL,
    created_at timestamp DEFAULT now()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    author_id varchar NOT NULL REFERENCES users(id),
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- AI Agent Config table
CREATE TABLE IF NOT EXISTS ai_agent_config (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    mode text DEFAULT 'chatbot' CHECK (mode IN ('chatbot', 'ai_agent')),
    is_enabled boolean DEFAULT false,
    gemini_api_key text,
    agent_prompt text,
    welcome_message text,
    response_delay integer DEFAULT 3,
    updated_at timestamp DEFAULT now()
);

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL CHECK (type IN ('bug', 'suggestion', 'feature_request', 'complaint', 'compliment')),
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'in_progress', 'resolved', 'closed')),
    submitted_by_id varchar NOT NULL REFERENCES users(id),
    assigned_to_id varchar REFERENCES users(id),
    response text,
    responded_by_id varchar REFERENCES users(id),
    responded_at timestamp,
    category text,
    attachments json,
    tags json,
    votes integer DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Instance Config table
CREATE TABLE IF NOT EXISTS instance_config (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id text NOT NULL,
    instance_key text NOT NULL,
    connect_api_url text NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_payment')),
    billing_status text DEFAULT 'paid' CHECK (billing_status IN ('paid', 'overdue')),
    enabled_features json DEFAULT '{"chat": true, "chatbot": true, "ai_agent": false}'::json,
    last_status_check timestamp,
    last_successful_check timestamp,
    check_interval_minutes integer DEFAULT 60,
    is_locked boolean DEFAULT false,
    lock_message text,
    payment_notification_shown boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Status Check Logs table
CREATE TABLE IF NOT EXISTS status_check_logs (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_config_id varchar NOT NULL REFERENCES instance_config(id),
    check_type text NOT NULL CHECK (check_type IN ('startup', 'scheduled', 'manual')),
    success boolean NOT NULL,
    status_received text,
    billing_status_received text,
    features_received json,
    error_message text,
    response_time integer,
    created_at timestamp DEFAULT now()
);

-- Financial tables (Plans, Subscriptions, Invoices, Payments)
CREATE TABLE IF NOT EXISTS plans (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    currency text NOT NULL DEFAULT 'BRL',
    billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
    features json NOT NULL,
    max_users integer DEFAULT 1,
    max_conversations integer DEFAULT 100,
    storage_limit integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    stripe_product_id text,
    stripe_price_id text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id),
    plan_id varchar NOT NULL REFERENCES plans(id),
    status text NOT NULL CHECK (status IN ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamp,
    current_period_end timestamp,
    cancel_at_period_end boolean DEFAULT false,
    trial_start timestamp,
    trial_end timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id varchar NOT NULL REFERENCES subscriptions(id),
    stripe_invoice_id text,
    number text,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'BRL',
    status text NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    due_date timestamp,
    paid_at timestamp,
    description text,
    invoice_url text,
    download_url text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id varchar NOT NULL REFERENCES invoices(id),
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'BRL',
    status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
    payment_method text,
    description text,
    refunded_amount integer DEFAULT 0,
    failure_reason text,
    paid_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password, role, is_online, environment) 
VALUES ('System Administrator', 'admin@company.com', '$2a$10$8K1p/a9Y8.VW9Fq5d5Q3K.4E4c8Q/2j1.1Q5j9I8e7h6G4d3Z2A1B0', 'admin', true, 'production')
ON CONFLICT (email) DO NOTHING;

-- Insert default queues
INSERT INTO queues (name, description, working_hours, message_inside_hours, message_outside_hours, is_active, environment) 
VALUES 
    ('Technical Support', 'Help with technical issues', '{"days":"Mon-Fri","hours":"9:00-18:00"}', 'Welcome to Technical Support. An agent will be with you shortly.', 'We are currently closed. Please leave a message and we will get back to you.', true, 'production'),
    ('Sales', 'Sales inquiries and quotes', '{"days":"Mon-Sat","hours":"8:00-20:00"}', 'Welcome to Sales! How can we help you today?', 'Our sales team is currently unavailable. Please leave a message.', true, 'production')
ON CONFLICT DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value) 
VALUES 
    ('companyName', 'Fi.V App'),
    ('cnpj', ''),
    ('primaryColor', '#3B82F6'),
    ('secondaryColor', '#64748B'),
    ('whatsappConnected', 'true')
ON CONFLICT (key) DO NOTHING;

-- Insert default AI agent config
INSERT INTO ai_agent_config (mode, is_enabled, welcome_message, response_delay)
VALUES ('chatbot', true, 'Hello! I am your virtual assistant. How can I help you today?', 3)
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_environment ON users(environment);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_environment ON clients(environment);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_environment ON conversations(environment);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_environment ON messages(environment);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;