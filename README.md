# CS Agent Prompt Optimizer

A Next.js web application for optimizing your Make.com Customer Service Agent prompts through iterative testing and AI-powered evaluation.

## Features

- **Training Wizard** - Guided Q&A to teach the AI Evaluator about your business context
- **Prompt Editor** - Create and version control System/User prompts
- **Test Suite** - Import email examples as repeatable test cases
- **Playground** - Test prompts against emails in real-time
- **AI Evaluator** - Automatic scoring using Claude with your business rules
- **Results Dashboard** - Track scores and compare prompt versions
- **Export** - Copy optimized prompts to paste into Make.com

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL=your_postgresql_connection_string

# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-opus-4-5
```

### 3. Run Database Migrations

```bash
npm run db:migrate
```

### 4. Start the Application

```bash
npm run dev
```

This starts the Next.js development server at http://localhost:3000

## Usage Workflow

1. **Complete the Training Wizard** (`/wizard`)
   - Answer questions about your business, policies, and known failure patterns
   - This teaches the AI Evaluator what to check for

2. **Import Your Current Prompts** (`/prompts`)
   - Create a new version with your Make.com System and User prompts
   - Set it as the active version

3. **Add Test Cases** (`/tests`)
   - Import historical email examples
   - Tag them by type (refund, shipping, escalation, etc.)

4. **Test in the Playground** (`/playground`)
   - Paste an email and generate a response
   - Click "Evaluate" to get an AI score and rule checks

5. **Iterate and Improve**
   - Edit prompts based on evaluation feedback
   - Create new versions to compare
   - Track improvements in Results

6. **Export to Make.com**
   - Copy the optimized prompts from the Prompt Editor
   - Paste into your Make.com Agent configuration

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **AI**: Claude (Anthropic)
- **Styling**: CSS Modules + CSS Variables
- **Icons**: Lucide React

## Project Structure

```
agent-traning/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── api/                # API routes
├── lib/                    # Business logic
│   └── db.ts               # Database connection
├── components/             # React components
├── styles/                 # CSS Modules
│   └── theme.css           # Global styles & CSS variables
├── types/                  # TypeScript types
│   ├── database.ts         # Database models
│   └── api.ts              # API response types
├── scripts/                # Utility scripts
│   └── migrate.js          # Database migrations
├── public/                 # Static assets
└── package.json            # Dependencies & scripts
```

## API Endpoints

- `GET /api/health` - Health check
- `GET/POST /api/prompts` - Prompt version CRUD
- `GET/POST /api/test-cases` - Test case CRUD
- `GET/POST /api/knowledge-base` - Knowledge base CRUD
- `POST /api/generator/run` - Generate agent response
- `POST /api/evaluator/evaluate` - Evaluate a response
- `GET /api/evaluator/rules` - Get evaluation rules
