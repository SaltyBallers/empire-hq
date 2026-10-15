# AGENTS.md — empire-hq

This file is the canonical instruction set for any agent or subagent working in this repo. It is loaded automatically on session start.

# Project Conventions

## PRDs and Reviews — required locations

This product keeps all planning and review artifacts inside the repo:

- **PRDs**     → `docs/PRD/PRD-{number}-{slug}.md`
- **Reviews**  → `docs/Reviews/YYYY-MM-DD-{number}-{slug}-{reviewer}.md`

`Reviews/` holds **any** review — code (Maya), architecture (Atlas), data/schema (Forge), observability (Sentinel), UX (Pixel), etc. The `{reviewer}` suffix is the agent's lowercase name.

### Rules (every agent and subagent)

1. **Every code-touching card MUST have a PRD in `docs/PRD/`** before implementation begins. If none exists, create one or escalate to Bill.
2. **Reviewing agents MUST `Write` their full review to `docs/Reviews/`** before yielding their turn. The inline Report Back is a summary; the full review is the file.
3. **The mandatory Report Back MUST include a `Written to:` line** with the absolute path to the review file, so the orchestrator can verify and locate it.
4. **PRDs and Reviews are markdown** (`.md`). Frontmatter for structured fields, prose for narrative.
5. **Filenames:**
   - PRD: `PRD-{number}-{slug}.md`
   - Review: `YYYY-MM-DD-{number}-{slug}-{reviewer}.md`
6. **Never write PRDs or Reviews outside this repo.** The repo is the single source of truth.

Pre-existing JSON PRDs in `docs/PRD/` are legacy; leave them as-is. New PRDs are markdown.
