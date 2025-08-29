# Fi.V App - Backend Architecture Guidelines

## Overview

This document defines the recommended backend architecture for the Fi.V App WhatsApp customer service platform, focusing on scalability, maintainability, and performance.

## 1. Core Architecture Patterns

### 1.1 Layered Architecture
```
┌─────────────────────────────────────┐
│            API Layer                │  ← Express routes, middleware, validation
├─────────────────────────────────────┤
│         Business Logic Layer       │  ← Services, use cases, business rules
├─────────────────────────────────────┤
│         Data Access Layer          │  ← Repositories, ORM (Drizzle)
├─────────────────────────────────────┤
│         Database Layer              │  ← PostgreSQL with proper indexing
└─────────────────────────────────────┘
```

### 1.2 Repository Pattern
- Abstracts database operations behind interfaces
- Enables easy testing with mock implementations
- Centralizes data access logic
- Current implementation: `IStorage` interface with `DatabaseStorage`

### 1.3 Service Layer Pattern
- Encapsulates business logic
- Coordinates between repositories
- Handles complex business operations
- Recommended structure:
  ```typescript
  // services/
  ├── ConversationService.ts
  ├── UserService.ts
  ├── QueueService.ts
  ├── ReportService.ts
  └── NotificationService.ts
  ```

## 2. Database Design & Multi-tenancy

### 2.1 Multi-tenant Strategy: Row-Level Security (RLS)
```sql
-- Recommended approach for scalability
CREATE POLICY tenant_isolation ON conversations
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 2.2 Schema Design
```sql
-- Core tenant table
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE NOT NULL,
  plan_type tenant_plan NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- All entities include tenant_id
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  contact_phone text NOT NULL,
  contact_name text,
  status conversation_status DEFAULT 'waiting',
  assigned_agent_id uuid REFERENCES users(id),
  queue_id uuid REFERENCES queues(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2.3 Indexing Strategy
```sql
-- Performance-critical indexes
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX idx_queues_tenant_active ON queues(tenant_id, is_active);
```

## 3. API Design Standards

### 3.1 RESTful Conventions
```typescript
// Resource-based URLs
GET    /api/conversations              // List conversations
POST   /api/conversations              // Create conversation
GET    /api/conversations/:id          // Get conversation
PUT    /api/conversations/:id          // Update conversation
DELETE /api/conversations/:id          // Delete conversation

// Nested resources
GET    /api/conversations/:id/messages // Get conversation messages
POST   /api/conversations/:id/messages // Send message
```

### 3.2 Response Format Standardization
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}
```

### 3.3 Error Handling
```typescript
// Centralized error middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('API Error:', err);
  
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details
      }
    });
  }
  
  // Default 500 error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
};
```

## 4. Data Validation & Security

### 4.1 Input Validation with Zod
```typescript
// Always validate at API boundary
export const createConversationSchema = z.object({
  contactPhone: z.string().min(10).max(15),
  contactName: z.string().min(2).max(100),
  queueId: z.string().uuid(),
  tenantId: z.string().uuid()
});

app.post('/api/conversations', validate(createConversationSchema), async (req, res) => {
  const data = req.body; // Now type-safe
  // ... rest of handler
});
```

### 4.2 Authentication & Authorization
```typescript
// Middleware for tenant context
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'No tenant access' });
  }
  
  // Set tenant context for RLS
  await db.execute(sql`SET app.current_tenant = ${tenantId}`);
  next();
};

// Role-based access control
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

## 5. Performance & Scalability

### 5.1 Database Connection Management
```typescript
// Connection pooling configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Health check
export const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT 1');
    return { status: 'healthy', connections: pool.totalCount };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

### 5.2 Caching Strategy
```typescript
// Redis for session and cache management
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache frequent queries
export const getCachedQueueStats = async (tenantId: string) => {
  const cacheKey = `queue_stats:${tenantId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const stats = await calculateQueueStats(tenantId);
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 min cache
  return stats;
};
```

### 5.3 Query Optimization
```typescript
// Use prepared statements and proper indexing
export const getConversationsByQueue = async (queueId: string, limit = 50) => {
  return await db
    .select({
      id: conversations.id,
      contactName: conversations.contactName,
      status: conversations.status,
      agentName: users.name
    })
    .from(conversations)
    .leftJoin(users, eq(conversations.assignedAgentId, users.id))
    .where(eq(conversations.queueId, queueId))
    .orderBy(desc(conversations.createdAt))
    .limit(limit);
};
```

## 6. Monitoring & Logging

### 6.1 Structured Logging
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fiv-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

### 6.2 Performance Monitoring
```typescript
// Request timing middleware
export const timingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};
```

### 6.3 Health Checks & Metrics
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await healthCheck(),
    redis: await checkRedisHealth(),
    whatsapp: await checkWhatsAppConnection(),
    timestamp: new Date().toISOString()
  };
  
  const isHealthy = Object.values(checks).every(check => 
    check.status === 'healthy'
  );
  
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

## 7. Testing Strategy

### 7.1 Unit Testing
```typescript
// Service layer testing
describe('ConversationService', () => {
  let mockStorage: jest.Mocked<IStorage>;
  let service: ConversationService;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    service = new ConversationService(mockStorage);
  });
  
  it('should create conversation with valid data', async () => {
    const input = { contactPhone: '+5511999999999', queueId: 'queue-1' };
    const result = await service.createConversation(input);
    
    expect(result.contactPhone).toBe(input.contactPhone);
    expect(mockStorage.createConversation).toHaveBeenCalledWith(input);
  });
});
```

### 7.2 Integration Testing
```typescript
// API endpoint testing
describe('POST /api/conversations', () => {
  it('should create conversation successfully', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        contactPhone: '+5511999999999',
        contactName: 'Test User',
        queueId: testQueueId
      })
      .expect(201);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data.contactPhone).toBe('+5511999999999');
  });
});
```

## 8. Deployment & DevOps

### 8.1 Environment Configuration
```typescript
// config/index.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  },
  whatsapp: {
    apiKey: process.env.WHATSAPP_API_KEY!,
    webhookUrl: process.env.WHATSAPP_WEBHOOK_URL!,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionSecret: process.env.SESSION_SECRET!,
  }
};
```

### 8.2 Migration Strategy
```typescript
// Use Drizzle for schema migrations
npm run db:generate  // Generate migration files
npm run db:migrate   // Apply migrations
npm run db:push      // Push schema changes (development)
```

### 8.3 Backup & Recovery
```sql
-- Automated daily backups
CREATE OR REPLACE FUNCTION backup_tenant_data(tenant_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Export tenant-specific data
  COPY (SELECT * FROM conversations WHERE tenant_id = tenant_uuid) 
  TO '/backups/conversations_' || tenant_uuid || '_' || current_date || '.csv' 
  WITH CSV HEADER;
END;
$$ LANGUAGE plpgsql;
```

## 9. Security Best Practices

### 9.1 Data Protection
- Always use parameterized queries (Drizzle handles this)
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Hash sensitive data (passwords, API keys)
- Implement audit logging for sensitive operations

### 9.2 Access Control
- Implement proper RBAC (Role-Based Access Control)
- Use JWT tokens with short expiration
- Validate all inputs at API boundaries
- Implement tenant isolation at database level

## 10. Integration Guidelines

### 10.1 WhatsApp Business API
```typescript
// Service abstraction for external APIs
export interface IWhatsAppService {
  sendMessage(to: string, message: string): Promise<void>;
  sendTemplate(to: string, template: string, variables: any[]): Promise<void>;
  getMediaUrl(mediaId: string): Promise<string>;
}

export class WhatsAppBusinessService implements IWhatsAppService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async sendMessage(to: string, message: string) {
    // Implementation
  }
}
```

### 10.2 Event-Driven Architecture
```typescript
// Event system for decoupled components
export interface DomainEvent {
  type: string;
  payload: any;
  timestamp: Date;
  tenantId: string;
}

export class EventBus {
  private handlers = new Map<string, Array<(event: DomainEvent) => void>>();
  
  subscribe(eventType: string, handler: (event: DomainEvent) => void) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  async publish(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }
}
```

## 11. Performance Benchmarks

### 11.1 Target Metrics
- API Response Time: < 200ms (95th percentile)
- Database Query Time: < 50ms (average)
- Concurrent Users: 10,000+ per tenant
- Message Throughput: 1,000 messages/second
- Uptime: 99.9%

### 11.2 Monitoring Tools
- APM: New Relic or DataDog
- Logs: ELK Stack or CloudWatch
- Metrics: Prometheus + Grafana
- Alerting: PagerDuty or similar

## Conclusion

This architecture provides a solid foundation for scaling the Fi.V App to enterprise levels while maintaining code quality, security, and performance. Regular reviews and updates of these guidelines ensure the system evolves with best practices and business requirements.

### Next Steps
1. Implement service layer abstraction
2. Set up comprehensive monitoring
3. Establish CI/CD pipeline with proper testing
4. Implement caching strategy
5. Set up backup and disaster recovery procedures