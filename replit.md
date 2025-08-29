# Fi.V App - WhatsApp Customer Service Platform

## Overview

Fi.V App is a modern, web-based, multi-user customer service platform designed for WhatsApp support. The application provides a comprehensive interface for managing customer conversations, user roles, queues, and AI-powered automated responses. Built with React, TypeScript, and a Node.js backend, the platform supports real-time messaging, user management, and customizable branding.

The application follows a full-stack architecture with a React frontend using shadcn/ui components, Express.js backend, and PostgreSQL database with Drizzle ORM. The platform is designed for scalability and supports multiple user roles (admin, supervisor, agent) with different permission levels.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for dynamic theming
- **State Management**: React Query (@tanstack/react-query) for server state, React Context for global app state
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js for data visualization
- **Authentication**: Context-based authentication with localStorage persistence
- **Theming**: Dark/light mode support with automatic OS preference detection

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: connect-pg-simple for PostgreSQL-based sessions
- **Development**: Hot reload with Vite integration
- **Build Process**: esbuild for server bundling, Vite for client bundling
- **Error Handling**: Centralized error middleware with structured responses

### Database Schema Design
- **Users Table**: Stores user information with role-based access (admin, supervisor, agent)
- **Conversations Table**: Manages WhatsApp conversations with status tracking and agent assignment
- **Messages Table**: Stores individual messages with type classification (text, image, audio, video, document)
- **Queues Table**: Configurable conversation queues with working hours and automated responses
- **Settings Table**: Application-wide configuration with key-value pairs
- **AI Agent Config Table**: Stores AI automation settings and welcome messages

### Key Design Patterns
- **Repository Pattern**: Storage interface abstracts database operations for testability
- **Context Providers**: Centralized state management for authentication, settings, and themes
- **Component Composition**: Modular UI components with clear separation of concerns
- **Custom Hooks**: Reusable logic for authentication, theming, and mobile responsiveness
- **Modal System**: Consistent modal patterns for CRUD operations across entities

### Security Architecture
- **Authentication**: Session-based authentication with secure password handling
- **Role-Based Access**: Different UI views and permissions based on user roles
- **Input Validation**: Zod schemas for runtime type checking and validation
- **CORS Protection**: Configured for development and production environments

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database using Neon Database serverless (@neondatabase/serverless)
- **Drizzle Kit**: Database migrations and schema management
- **Connection Pooling**: Built-in connection management for serverless environments

### UI and Styling Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Consistent icon library
- **Chart.js**: Data visualization for reports and analytics
- **Class Variance Authority**: Type-safe component variants

### Development and Build Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking across the entire application
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **ESBuild**: Fast JavaScript bundling for production builds

### Third-Party Integrations
- **WhatsApp Business API**: Intended integration for message handling (not yet implemented)
- **Replit Development**: Special handling for Replit environment with cartographer plugin
- **Google Fonts**: Custom font loading for Inter font family

### State Management and Data Fetching
- **React Query**: Server state management with caching and synchronization
- **React Hook Form**: Form handling with validation resolvers
- **Date-fns**: Date manipulation and formatting utilities

The application is structured to support easy deployment on various platforms while maintaining development flexibility through environment-specific configurations.