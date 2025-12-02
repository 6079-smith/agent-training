# Phase 3 Complete: Database Layer Migration

## Overview

Successfully established database connection, ran migrations, created query helpers, and built a health check API endpoint. All 6 database tables created and seeded with initial data.

---

## Accomplishments

### **1. Query Helper Functions** ✅

Enhanced `lib/db.ts` with 7 utility functions:

```typescript
// Execute query and return full QueryResult
query<T>(text: string, params?: any[]): Promise<QueryResult<T>>

// Get single row or null
queryOne<T>(text: string, params?: any[]): Promise<T | null>

// Get array of rows
queryMany<T>(text: string, params?: any[]): Promise<T[]>

// Execute statement, return affected row count
execute(text: string, params?: any[]): Promise<number>

// Check database health
healthCheck(): Promise<{ healthy: boolean, message: string, latency?: number }>

// Get pool statistics
getPoolStats(): { totalCount, idleCount, waitingCount } | null

// Execute function in transaction
withTransaction<T>(fn: (client) => Promise<T>): Promise<T>
```

**Features:**
- TypeScript generics for type-safe queries
- Automatic query logging in development
- Error handling and logging
- Connection pool management
- Transaction support with automatic rollback

---

### **2. Database Migrations** ✅

Successfully ran migrations creating 6 tables:

| Table | Purpose | Rows Seeded |
|-------|---------|-------------|
| `knowledge_base` | Category-based knowledge storage | 0 |
| `prompt_versions` | Prompt version history | 0 |
| `test_cases` | Test case definitions | 0 |
| `test_results` | Test execution results | 0 |
| `evaluator_rules` | Evaluation rules | 6 |
| `wizard_progress` | Wizard state tracking | 0 |

**Evaluator Rules Seeded:**
1. Greeting Detection
2. Empathy Check
3. Solution Provided
4. Clarity Check
5. Professional Tone
6. Call-to-Action

**Migration Script:** `scripts/migrate.mjs`
- ES Module format (.mjs extension)
- Manual .env.local loading
- CREATE TABLE IF NOT EXISTS (idempotent)
- Automatic rule seeding
- Error handling and logging

---

### **3. Health Check API** ✅

Created `/api/health` endpoint for monitoring:

**Endpoint:** `GET /api/health`

**Response (Success - 200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T18:36:46.389Z",
  "database": {
    "connected": true,
    "latency": 1039,
    "tables": [
      "evaluator_rules",
      "knowledge_base",
      "prompt_versions",
      "test_cases",
      "test_results",
      "wizard_progress"
    ],
    "tableCount": 6
  },
  "pool": {
    "totalCount": 1,
    "idleCount": 1,
    "waitingCount": 0
  }
}
```

**Response (Failure - 503):**
```json
{
  "status": "unhealthy",
  "database": {
    "healthy": false,
    "message": "Connection error message"
  }
}
```

**Features:**
- Database connectivity check
- Query latency measurement
- Table enumeration
- Connection pool statistics
- Force-dynamic rendering (no caching)

---

## Issues Resolved

### **Issue 1: Environment Variable Conflict** 🔧

**Problem:**
- System environment variable `DATABASE_URL` pointed to `C:\Program Files\PostgreSQL\17\bin`
- Overrode `.env.local` file
- Caused "client password must be a string" error

**Root Cause:**
- Windows PostgreSQL installation set system-wide `DATABASE_URL`
- Next.js loads system env vars before `.env.local`
- System var took precedence

**Solution:**
1. Renamed `.env.local` variable to `POSTGRES_URL`
2. Updated `lib/db.ts` to check both:
   ```typescript
   const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL
   ```
3. Updated migration script to use `POSTGRES_URL`

**Result:** ✅ Connection successful, no conflicts

---

### **Issue 2: ES Module Configuration** 🔧

**Problem:**
- Migration script used `import` statements
- Node.js required `"type": "module"` in package.json
- Adding `"type": "module"` broke Next.js config

**Root Cause:**
- Next.js expects CommonJS for `next.config.js`
- Can't have both ES modules and CommonJS in same project

**Solution:**
1. Removed `"type": "module"` from `package.json`
2. Renamed `scripts/migrate.js` → `scripts/migrate.mjs`
3. Updated npm script: `"db:migrate": "node scripts/migrate.mjs"`
4. Kept `next.config.js` as CommonJS

**Result:** ✅ Both migration script and Next.js work correctly

---

### **Issue 3: dotenv Loading in ES Modules** 🔧

**Problem:**
- `dotenv.config()` wasn't loading `.env.local` properly
- Environment variables not available in migration script

**Solution:**
Manual file reading and parsing:
```javascript
import { readFileSync } from 'fs'
import * as dotenv from 'dotenv'

const envPath = join(__dirname, '../.env.local')
const envConfig = dotenv.parse(readFileSync(envPath))
Object.keys(envConfig).forEach((key) => {
  process.env[key] = envConfig[key]
})
```

**Result:** ✅ Environment variables loaded correctly

---

## Files Created/Modified

### **Created:**
1. `app/api/health/route.ts` - Health check endpoint (47 lines)

### **Modified:**
1. `lib/db.ts` - Added 7 query helper functions (+95 lines)
2. `.env.local` - Renamed DATABASE_URL → POSTGRES_URL
3. `scripts/migrate.js` → `scripts/migrate.mjs` - ES module format
4. `package.json` - Updated db:migrate script
5. `MIGRATION.md` - Added Phase 3 documentation

---

## Database Schema

### **knowledge_base**
```sql
CREATE TABLE knowledge_base (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
)
```

### **prompt_versions**
```sql
CREATE TABLE prompt_versions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
)
```

### **test_cases**
```sql
CREATE TABLE test_cases (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email_thread TEXT NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  subject VARCHAR(500),
  order_number VARCHAR(100),
  expected_behavior TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### **test_results**
```sql
CREATE TABLE test_results (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
  prompt_version_id INTEGER REFERENCES prompt_versions(id),
  response TEXT NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  evaluation_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### **evaluator_rules**
```sql
CREATE TABLE evaluator_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL,
  pattern TEXT,
  weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### **wizard_progress**
```sql
CREATE TABLE wizard_progress (
  id SERIAL PRIMARY KEY,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## Usage Examples

### **Query Helper Examples**

```typescript
import { query, queryOne, queryMany, execute } from '@/lib/db'

// Get all prompt versions
const prompts = await queryMany<PromptVersion>(
  'SELECT * FROM prompt_versions WHERE is_active = $1',
  [true]
)

// Get single test case
const testCase = await queryOne<TestCase>(
  'SELECT * FROM test_cases WHERE id = $1',
  [testCaseId]
)

// Insert new knowledge base entry
const rowsAffected = await execute(
  'INSERT INTO knowledge_base (category, key, value) VALUES ($1, $2, $3)',
  ['greeting', 'formal', 'Good morning, how may I assist you?']
)

// Raw query with full result
const result = await query('SELECT COUNT(*) as count FROM test_cases')
console.log(result.rows[0].count)
```

### **Transaction Example**

```typescript
import { withTransaction } from '@/lib/db'

await withTransaction(async (client) => {
  // Create prompt version
  const promptResult = await client.query(
    'INSERT INTO prompt_versions (name, system_prompt, user_prompt) VALUES ($1, $2, $3) RETURNING id',
    [name, systemPrompt, userPrompt]
  )
  
  // Create test result
  await client.query(
    'INSERT INTO test_results (prompt_version_id, test_case_id, response) VALUES ($1, $2, $3)',
    [promptResult.rows[0].id, testCaseId, response]
  )
  
  // Both queries committed together, or rolled back on error
})
```

---

## Testing

### **Migration Test**
```bash
npm run db:migrate
```

**Expected Output:**
```
Loading .env from: C:\dev\agent-traning\.env.local
Connection string loaded successfully
Connecting to database...
Running database migrations...
Migrations completed successfully!
Seeded evaluator rules
Database setup complete!
```

### **Health Check Test**
```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
- Status: 200 OK
- 6 tables listed
- Connection latency < 2000ms
- Pool showing active connections

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Migration Time | ~2 seconds |
| Health Check Latency | ~1000ms (first call) |
| Health Check Latency | ~50ms (subsequent) |
| Connection Pool Size | 5 max connections |
| Tables Created | 6 |
| Evaluator Rules Seeded | 6 |

---

## Next Steps

**Phase 4: API Routes Migration** (2-3 days)

Convert Express routes to Next.js API Routes:
1. Generator endpoint (`/api/generator`)
2. Evaluator endpoint (`/api/evaluator`)
3. Prompt management (`/api/prompts`)
4. Test cases (`/api/test-cases`)
5. Knowledge base (`/api/knowledge`)
6. Wizard progress (`/api/wizard`)

---

## Verification Checklist

✅ Database connection established  
✅ All 6 tables created  
✅ Evaluator rules seeded (6 rules)  
✅ Query helpers working  
✅ Health check endpoint responding  
✅ Connection pool configured  
✅ Transaction support available  
✅ Environment variables loaded correctly  
✅ No system env var conflicts  
✅ Migration script idempotent  

**Status:** Phase 3 Complete - Ready for Phase 4
