# CS Agent Prompt Optimizer

A local web application for optimizing your Make.com Customer Service Agent prompts through iterative testing and AI-powered evaluation.

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
npm run install:all
```

### 2. Configure Environment

The `.env` file in `/server` is already configured with your API keys.

### 3. Run Database Migrations

```bash
cd server
npm run db:migrate
```

### 4. Start the Application

```bash
npm run dev
```

This starts both the backend (http://localhost:3001) and frontend (http://localhost:5173).

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

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: Neon (Serverless Postgres)
- **AI**: Claude 3.5 Sonnet (Anthropic)

## Project Structure

```
agent-traning/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # Page components
│       └── lib/            # API client
├── server/                 # Express backend
│   └── src/
│       ├── routes/         # API routes
│       ├── services/       # Claude integration
│       └── db/             # Database connection & migrations
└── package.json            # Root package with dev scripts
```

## API Endpoints

- `GET /api/health` - Health check
- `GET/POST /api/prompts` - Prompt version CRUD
- `GET/POST /api/test-cases` - Test case CRUD
- `GET/POST /api/knowledge-base` - Knowledge base CRUD
- `POST /api/generator/run` - Generate agent response
- `POST /api/evaluator/evaluate` - Evaluate a response
- `GET /api/evaluator/rules` - Get evaluation rules
