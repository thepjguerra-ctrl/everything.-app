# EVERYTHING. App — Working Rules for Claude Code

## What this project is
A free downloadable perk/tool, built on the "d[Ai]ly life" codebase — a
brain-dump-to-structured-plan productivity tool for creative people.
Single-file React app (CDN React, Babel, no build step), using localStorage
for all data. Positioned under "Experiments/Tools" on the EVERYTHING. studio
site — not the main business identity.

## Hard constraints — do not violate
- **Web-only.** No mobile-specific layout work unless explicitly asked.
- **No accounts, no server.** All data lives in the browser via localStorage.
  Never introduce a backend, database, or auth flow without being asked first.
- **No real AI-sorting claims.** The "AI sorting" framing was dropped —
  sorting is deterministic, not model-driven. Don't reintroduce AI-powered
  language in UI copy or code comments.
- **No hardcoded personal data.** A past version accidentally shipped Pj's
  real contacts/projects in a rewrite/soften table. Before any release build,
  grep for personal names, emails, or project-specific strings and flag them.

## Working style
- Incremental edits only. Don't restructure files or rename things unless
  asked — this mirrors the studio site's CLAUDE.md rule.
- No unrequested redesigns. If you see a UI/UX improvement, say so and wait
  — don't just implement it.
- Show diffs before finalizing a change so Pj can review what actually moved.
- Direct conversational iteration — no relaying through other tools mid-task.

## Data-safety rule — non-negotiable
Any change that imports, uploads, or reads outside data into this app —
including anything touching import/export, backup, or restore logic —
must run the `pre-release-check` skill first, and must pass it before
the change is applied. This exists because of a past full data-loss
incident on this app. Do not skip this step even for a fix that looks
small or self-contained.

## Known cleanup checklist (pre-release)
- [ ] Remove hardcoded personal data from rewrite/soften tables
- [ ] Update storage naming (localStorage keys) to be release-safe
- [ ] Reorganize index.html + assets folder for a clean handoff
- [ ] Reduce starting nav to a few core items; rest becomes addable
      extensions from Settings
- [ ] Give export/backup its own findable section in the UI
- [ ] Add a footer link back to the EVERYTHING. studio site

## Design system (carried over from the redesign)
- Editorial type system: Cormorant Garamond, DM Mono, Lora
- Three-screen navigation max at launch

## Not in scope right now
- Mobile app / phone-to-laptop sync — real interest exists but not committed;
  don't build toward this unless asked directly.
- Any monetization, accounts, or analytics — this is a free give-away tool.

## Release intent
Built to hand to real people first (sisters, roommate), who can edit it
themselves to fit their own needs. Optimize for "easy to fork and modify,"
not "polished SaaS product."
