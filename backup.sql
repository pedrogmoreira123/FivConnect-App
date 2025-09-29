--
-- PostgreSQL database dump
--

\restrict JQUZfqOmtXK31vctBLCPy49M4buy3sr92Gt2QJMs7oWr33vGCUNkRpfxrSWPcCD

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_agent_config; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.ai_agent_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    mode text DEFAULT 'chatbot'::text,
    is_enabled boolean DEFAULT false,
    gemini_api_key text,
    agent_prompt text,
    welcome_message text,
    response_delay integer DEFAULT 3,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_agent_config OWNER TO fivuser;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.announcements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author_id character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.announcements OWNER TO fivuser;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.clients (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    notes text,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.clients OWNER TO fivuser;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.companies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    document text,
    plan_id character varying,
    status text DEFAULT 'trial'::text NOT NULL,
    max_users integer DEFAULT 1,
    max_connections integer DEFAULT 1,
    max_queues integer DEFAULT 3,
    trial_ends_at timestamp without time zone,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.companies OWNER TO fivuser;

--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.company_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_id character varying NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.company_settings OWNER TO fivuser;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.conversations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    contact_name text NOT NULL,
    contact_phone text NOT NULL,
    client_id character varying,
    whatsapp_connection_id character varying,
    status text DEFAULT 'waiting'::text NOT NULL,
    assigned_agent_id character varying,
    queue_id character varying,
    priority text DEFAULT 'medium'::text,
    tags json,
    is_group boolean DEFAULT false,
    environment text DEFAULT 'production'::text NOT NULL,
    last_message_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO fivuser;

--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.feedbacks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    submitted_by_id character varying NOT NULL,
    assigned_to_id character varying,
    response text,
    responded_by_id character varying,
    responded_at timestamp without time zone,
    category text,
    attachments json,
    tags json,
    votes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.feedbacks OWNER TO fivuser;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    subscription_id character varying NOT NULL,
    stripe_invoice_id text,
    number text,
    amount integer NOT NULL,
    currency text DEFAULT 'BRL'::text NOT NULL,
    status text NOT NULL,
    due_date timestamp without time zone,
    paid_at timestamp without time zone,
    description text,
    invoice_url text,
    download_url text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO fivuser;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    conversation_id character varying NOT NULL,
    sender_id character varying,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text,
    direction text NOT NULL,
    media_url text,
    environment text DEFAULT 'production'::text NOT NULL,
    is_read boolean DEFAULT false,
    sent_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO fivuser;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    invoice_id character varying NOT NULL,
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'BRL'::text NOT NULL,
    status text NOT NULL,
    payment_method text,
    description text,
    refunded_amount integer DEFAULT 0,
    failure_reason text,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO fivuser;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.plans (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price integer NOT NULL,
    currency text DEFAULT 'BRL'::text NOT NULL,
    billing_interval text NOT NULL,
    features json NOT NULL,
    max_users integer DEFAULT 1,
    max_conversations integer DEFAULT 100,
    storage_limit integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    stripe_product_id text,
    stripe_price_id text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.plans OWNER TO fivuser;

--
-- Name: queues; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.queues (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    working_hours json,
    message_inside_hours text,
    message_outside_hours text,
    is_active boolean DEFAULT true,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.queues OWNER TO fivuser;

--
-- Name: quick_replies; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.quick_replies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    shortcut text NOT NULL,
    message text NOT NULL,
    user_id character varying,
    is_global boolean DEFAULT false,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.quick_replies OWNER TO fivuser;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    token text NOT NULL,
    ip_address text,
    user_agent text,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sessions OWNER TO fivuser;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.settings OWNER TO fivuser;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.subscriptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    plan_id character varying NOT NULL,
    status text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamp without time zone,
    current_period_end timestamp without time zone,
    cancel_at_period_end boolean DEFAULT false,
    trial_start timestamp without time zone,
    trial_end timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.subscriptions OWNER TO fivuser;

--
-- Name: user_companies; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.user_companies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    company_id character varying NOT NULL,
    role text DEFAULT 'agent'::text NOT NULL,
    is_active boolean DEFAULT true,
    is_owner boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_companies OWNER TO fivuser;

--
-- Name: users; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'agent'::text NOT NULL,
    is_online boolean DEFAULT false,
    custom_theme json,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO fivuser;

--
-- Name: whatsapp_connections; Type: TABLE; Schema: public; Owner: fivuser
--

CREATE TABLE public.whatsapp_connections (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    qr_code text,
    status text DEFAULT 'disconnected'::text NOT NULL,
    is_default boolean DEFAULT false,
    session_data json,
    last_seen timestamp without time zone,
    environment text DEFAULT 'production'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_connections OWNER TO fivuser;

--
-- Data for Name: ai_agent_config; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.ai_agent_config (id, mode, is_enabled, gemini_api_key, agent_prompt, welcome_message, response_delay, updated_at) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.announcements (id, title, content, author_id, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.clients (id, name, phone, email, notes, environment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.companies (id, name, email, phone, document, plan_id, status, max_users, max_connections, max_queues, trial_ends_at, environment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.company_settings (id, company_id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.conversations (id, contact_name, contact_phone, client_id, whatsapp_connection_id, status, assigned_agent_id, queue_id, priority, tags, is_group, environment, last_message_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.feedbacks (id, title, description, type, priority, status, submitted_by_id, assigned_to_id, response, responded_by_id, responded_at, category, attachments, tags, votes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.invoices (id, subscription_id, stripe_invoice_id, number, amount, currency, status, due_date, paid_at, description, invoice_url, download_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.messages (id, conversation_id, sender_id, content, message_type, direction, media_url, environment, is_read, sent_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.payments (id, invoice_id, stripe_payment_intent_id, amount, currency, status, payment_method, description, refunded_amount, failure_reason, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.plans (id, name, description, price, currency, billing_interval, features, max_users, max_conversations, storage_limit, is_active, stripe_product_id, stripe_price_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: queues; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.queues (id, name, description, working_hours, message_inside_hours, message_outside_hours, is_active, environment, created_at) FROM stdin;
\.


--
-- Data for Name: quick_replies; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.quick_replies (id, shortcut, message, user_id, is_global, environment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.settings (id, key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.subscriptions (id, user_id, plan_id, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, cancel_at_period_end, trial_start, trial_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.user_companies (id, user_id, company_id, role, is_active, is_owner, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.users (id, name, username, email, password, role, is_online, custom_theme, environment, created_at) FROM stdin;
792b6fce-e9d1-4ffd-a546-be372bbd3f86	Administrador	admin	admin@fivconnect.net	$2b$12$aFnRG.spMvOVdqnN3Xq.sORlZHpug20dnMl9CtxoRi2EeQogf6hpK	admin	f	{}	production	2025-09-22 19:24:36.196485
\.


--
-- Data for Name: whatsapp_connections; Type: TABLE DATA; Schema: public; Owner: fivuser
--

COPY public.whatsapp_connections (id, name, phone, qr_code, status, is_default, session_data, last_seen, environment, created_at, updated_at) FROM stdin;
\.


--
-- Name: ai_agent_config ai_agent_config_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.ai_agent_config
    ADD CONSTRAINT ai_agent_config_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: clients clients_phone_unique; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_phone_unique UNIQUE (phone);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: queues queues_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_pkey PRIMARY KEY (id);


--
-- Name: quick_replies quick_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_pkey PRIMARY KEY (id);


--
-- Name: quick_replies quick_replies_shortcut_unique; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_shortcut_unique UNIQUE (shortcut);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_companies user_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: whatsapp_connections whatsapp_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.whatsapp_connections
    ADD CONSTRAINT whatsapp_connections_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: companies companies_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: company_settings company_settings_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_assigned_agent_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_assigned_agent_id_users_id_fk FOREIGN KEY (assigned_agent_id) REFERENCES public.users(id);


--
-- Name: conversations conversations_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: conversations conversations_queue_id_queues_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_queue_id_queues_id_fk FOREIGN KEY (queue_id) REFERENCES public.queues(id);


--
-- Name: conversations conversations_whatsapp_connection_id_whatsapp_connections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_whatsapp_connection_id_whatsapp_connections_id_fk FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id);


--
-- Name: feedbacks feedbacks_assigned_to_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_assigned_to_id_users_id_fk FOREIGN KEY (assigned_to_id) REFERENCES public.users(id);


--
-- Name: feedbacks feedbacks_responded_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_responded_by_id_users_id_fk FOREIGN KEY (responded_by_id) REFERENCES public.users(id);


--
-- Name: feedbacks feedbacks_submitted_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_submitted_by_id_users_id_fk FOREIGN KEY (submitted_by_id) REFERENCES public.users(id);


--
-- Name: invoices invoices_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id);


--
-- Name: messages messages_conversation_id_conversations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_conversations_id_fk FOREIGN KEY (conversation_id) REFERENCES public.conversations(id);


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: payments payments_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: quick_replies quick_replies_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: subscriptions subscriptions_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_companies user_companies_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: fivuser
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict JQUZfqOmtXK31vctBLCPy49M4buy3sr92Gt2QJMs7oWr33vGCUNkRpfxrSWPcCD

