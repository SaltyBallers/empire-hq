# Development Process Summary

## Overview

Our development process centers on **Trello** for project management, **JSON PRDs** as the execution source of truth, and a clear separation of responsibilities between Bill (product) and Zak (execution).

---

## 🗂️ Trello Workflow

**Board:** [The Empire 🏝️](https://trello.com/b/eYF9lpNR/the-empire)

### Lists (Kanban Flow)

| List | Purpose | Owner |
|------|---------|-------|
| 📥 **Inbox** | Raw ideas, feature requests | Bill creates |
| 🎯 **Up Next** | Curated & planned, awaiting approval | Zak curates → Bill reviews |
| 🔨 **In Progress** | Active development | Zak executes |
| 👀 **Review** | Complete, awaiting approval | Bill reviews |
| ✅ **Done** | Shipped | Archive weekly |

### Card Lifecycle

```
Bill creates idea → 📥 Inbox
        ↓
Zak curates (adds Plan, Open Questions) → 🎯 Up Next
        ↓
Bill reviews, answers questions, approves → 🔨 In Progress
        ↓
Zak executes, tests, commits → 👀 Review
        ↓
Bill approves (or sends back with feedback) → ✅ Done
```

### Card Template

Every card follows this structure:

```markdown
### Goals
What we're trying to achieve

### User Stories
- US-1: As a user, I want X so that Y
- US-2: As a user, I want A so that B

### Acceptance Criteria
- ✅ Criterion 1
- ✅ Criterion 2
- ⚠️ Criterion 3 (not yet done)

### Out of Scope
- Things we're NOT doing

### Plan
(Zak adds this during curation)
- Technical approach
- Components/files affected

### Open Questions
(Zak adds, Bill answers in comments)
- Question 1?
- Question 2?
```

### Responsibilities

| Domain | Bill | Zak |
|--------|------|-----|
| **Goals** | ✅ Defines | Executes |
| **User Stories** | ✅ Writes | Implements |
| **Acceptance Criteria** | ✅ Sets | Validates |
| **Out of Scope** | ✅ Defines | Respects strictly |
| **Plan** | Reviews | ✅ Creates |
| **Open Questions** | ✅ Answers | ✅ Asks |
| **Technical Details** | Informed | ✅ Owns |

---

## 📋 PRD (Product Requirements Document)

### Purpose
JSON PRDs are the **execution source of truth**. Trello is for human collaboration; PRDs drive development.

### Location
`~/Documents/Surfballers/prds/prd-{cardNumber}-{slug}.json`

### When Created
When a card moves to **In Progress**, Zak creates the PRD.

### Structure

```json
{
  "project": "Surfballers",
  "trelloCardNumber": 42,
  "branchName": "feature/42-hall-of-fame-ui",
  "title": "Hall of Fame UI Changes",
  "status": "in_progress",
  "userStories": [
    {
      "id": "US-001",
      "title": "Champion cards with opponent",
      "acceptanceCriteria": [...],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### Key Fields Zak Updates During Development

| Field | When Updated |
|-------|--------------|
| `userStories[].passes` | When all acceptance criteria met |
| `userStories[].notes` | Learnings during implementation |
| `status` | As card moves through lists |

---

## 🔄 Development Cycle

### 1. Inbox → Up Next (Curation)

**Trigger:** New card appears in Inbox

**Zak's actions:**
1. Read the card description
2. Research codebase as needed
3. Add **Plan** section (technical approach)
4. Add **Open Questions** for Bill
5. Move card to Up Next
6. *Do NOT ask permission — just curate*

### 2. Up Next → In Progress (Approval)

**Trigger:** Bill moves card to In Progress

**Before starting:**
1. Read card description
2. **Read ALL card comments** (Bill's answers, directives)
3. Check if Bill modified the card directly

### 3. In Progress (Execution)

**Steps:**
1. Create JSON PRD: `prd-{num}-{slug}.json`
2. Create feature branch: `feature/{num}-{slug}`
3. Implement user stories in priority order
4. Update PRD `passes` and `notes` as you go
5. Commit with card references: `Card #42: Description`
6. Run pre-review checklist
7. Move to Review when checklist passes

### 4. Review → Done (or back to In Progress)

**If approved:** Bill moves to Done

**If changes needed:** Bill moves back to In Progress with feedback in comments

**On iteration:** Always re-read comments before continuing work

---

## 🧪 Testing Requirements

### Mandatory for Every Feature

| Type | Tool | Coverage Target |
|------|------|-----------------|
| **Unit Tests** | Jest + React Native Testing Library | 80% |
| **E2E Mobile** | Maestro | Critical flows |
| **E2E Web** | Playwright | Critical flows |

### Global Acceptance Criteria (Auto-Include)

Every user story implicitly includes:
- ✅ Works on iOS, Android, and Web
- ✅ UI is responsive across breakpoints
- ✅ Follows brand color themes
- ✅ Unit tests written and passing
- ✅ E2E tests for critical flows

### Pre-Review Checklist

Before moving ANY card to Review, run:
```bash
cd ~/Projects/surfballers-app
./scripts/ready-for-review.sh {card-number}
```

**Checks:**
- TypeScript compiles
- Unit tests pass
- Vercel is live
- Manual confirmations (stories implemented, tested, committed)

---

## 🚀 Deployment

### Frontend (Surfballers App)

| Environment | Branch | URL |
|-------------|--------|-----|
| **Production** | `main` | https://surfballers-app.vercel.app |
| **Preview** | Feature branches | Auto-generated Vercel URLs |

**Deploy process:**
1. Push to feature branch → Vercel preview deploy
2. Merge to `main` → Vercel production deploy
3. Automatic (no manual steps needed)

### Backend (Xano)

| Environment | Branch | URL Suffix |
|-------------|--------|------------|
| **Production** | `main` | (none) |
| **Development** | `v2` | `:v2` |

**Deploy process:**
1. Develop/test on `v2` branch
2. Push via Xano Metadata API
3. Test on dev: `api:q3SNIe9-:v2/endpoint`
4. Merge to `main` in Xano Dashboard (or push to main via API)
5. Verify on prod: `api:q3SNIe9-/endpoint`

### Xano CI/CD Pipeline

For backend changes:
```bash
# 1. Seed dev database
./skills/xano-ci-cd/scripts/seed.sh

# 2. Run tests against dev
./skills/xano-ci-cd/scripts/test.sh

# 3. Deploy to production (after Bill approval)
./skills/xano-ci-cd/scripts/deploy.sh
```

---

## 📁 Key Locations

| What | Where |
|------|-------|
| Frontend code | `~/Projects/surfballers-app` |
| Backend code (local) | `~/Documents/Projects/surfballers-xano` |
| PRDs | `~/Documents/Surfballers/prds/` |
| Trello sync | `~/Documents/Surfballers/the-empire-trello/` |
| Reference docs | `~/Documents/Surfballers/app-data/application-api-notes/` |
| Memory/context | `~/clawd/memory/` |

---

## 🔑 Key Rules

1. **Stay in your lane** — Bill defines what, Zak defines how
2. **Comments are canon** — Always read card comments before working
3. **PRD = source of truth** — Trello is for collaboration, PRD drives execution
4. **Test before review** — Checklist must pass before moving to Review
5. **Data-first debugging** — Check data exists before assuming code is broken
6. **Small increments** — Keep features focused, respect Out of Scope
7. **Auto-curate Inbox** — Don't ask, just review and move to Up Next
