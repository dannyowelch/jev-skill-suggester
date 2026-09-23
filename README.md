# Jev Skill Suggester

Interactive demo showing how [TypeSafe Jev](https://typesafe.ai) picks which agent skill to load for a request using a two-stage ranking system: wide Choice over the full skill roster plus Noul gate checks, then shortlist rerank with per-skill fit Nouls.

**Inspired by:**
- [X bookmark from @dani_avila7](https://x.com/dani_avila7/status/2101885477158547753)
- [TypeSafe Cookbook: Skill Suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md)

## What This Demonstrates

Instead of loading every skill into an agent's context, Jev efficiently selects **at most one** skill by:

1. **Call 1: Wide Rank** - Choice question over all skills (name → short description) + three gate Nouls to determine if any skill is needed
   - Gate nouls: `acts_on_user_system`, `would_follow_documented_procedure`, `prose_suffices` (inverted)
   - If mean gate score < 0.30, suggest nothing

2. **Call 2: Shortlist Rerank** - Top 3 candidates get richer criteria (full description + excerpt), plus per-skill "fit" Nouls
   - If best fit < 0.30, reject all and suggest nothing

The UI shows both ranking stages, probabilities, fit scores, token usage, and the final `<skill_relevance>` injection block.

## Getting Started

### Prerequisites

- Node.js 18+ 
- TypeSafe API key from [typesafe.ai](https://typesafe.ai)

### Installation

```bash
npm install
```

### Configuration

Set your TypeSafe API key in one of two ways:

1. **UI field** (recommended) - Enter your key in the "TypeSafe API Key" input. It's stored in browser localStorage.

2. **Environment variable** (optional fallback) - Create `.env.local`:
   ```
   TYPESAFE_API_KEY=sk-...
   ```

**Important:** Never commit real API keys. The UI-provided key takes precedence over the environment variable.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## Usage

1. Enter your TypeSafe API key
2. Type a user request or click a sample request button:
   - **Clear match** - "What are the latest updates in Next.js 15?"
   - **Ambiguous** - "Create a slide deck for Series A fundraising" (tests PowerPoint vs pitch-deck disambiguation)
   - **No skill fits** - "Explain map vs flatMap in JavaScript"
3. Click **Run Suggestion**
4. View the two-stage ranking results:
   - Wide rank shows gate score and top probabilities
   - Rerank shows shortlist fit scores and final winner (if any)
   - Suggested skill injection block appears if a skill is selected

You can also edit the skill roster to add/remove/modify skills and see how ranking changes.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **TypeSafe Jev API** (jev-latest model)

## Architecture

- `/app/page.tsx` - Main UI component with two-stage ranking logic
- `/app/api/typesafe/route.ts` - API route handler that proxies TypeSafe calls (keeps API key server-side)
- `/app/types.ts` - TypeScript definitions for TypeSafe API requests/responses

## TypeSafe API Integration

The demo follows the exact TypeSafe HTTP API specification:

```typescript
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <key>
Content-Type: application/json

{
  "state": { "request": "...", "recent_context": "" },
  "model": "jev-latest",
  "questions": {
    "which": {
      "type": "choice",
      "instructions": "...",
      "criteria": { "skill-name": "description", ... }
    },
    "gate::name": {
      "type": "noul",
      "instructions": "..."
    }
  }
}
```

Responses return:
- Choice: `{ type: "choice", choice, probabilities, confidence }`
- Noul: `{ type: "noul", noul: number }`

## Related Demos

- [jev-abstention-checker](https://github.com/dannyowelch/jev-abstention-checker)
- [jev-bulk-classifier](https://github.com/dannyowelch/jev-bulk-classifier)

## License

MIT
