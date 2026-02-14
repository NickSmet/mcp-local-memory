# Specification Framework (Generic)

A lightweight documentation system for software projects that prioritizes maintainability and LLM-assisted development.

## Philosophy

**Problem:** Documentation gets stale when it lives far from code. Developers don't update docs that are separated from the code they change.

**Solution:** Co-locate specifications with the code they describe. A spec file in the same directory as the code is more likely to stay current.

**LLM Context:** This framework is designed to work well with LLM coding assistants. Specs provide focused context without requiring the LLM to read all source files.

---

## Project-Specific Conventions

This document uses placeholders. Replace them with your project's actual paths and document the choices in `AGENTS.md`:

- `<docs_root>`: documentation root (default is `docs/`)
- `<backend_root>`: backend or library code root
- `<routes_root>`: route or endpoint code root (if applicable)
- `<frontend_root>`: UI or client code root (if applicable)

## Core Concepts

### 1. Co-located Specs (SPEC.md)

Every significant module gets a `SPEC.md` file in its directory. Define your project-specific spec roots in `AGENTS.md` (examples: `<backend_root>`, `<routes_root>`, `<service_root>`).

```
<backend_root>/auth/
├── SPEC.md          ← What it does, interfaces, behavior
├── auth-client.<ext>
├── auth-state.<ext>
└── index.ts
```

**What goes in SPEC.md:**
- Overview (1-2 paragraphs)
- Architecture diagram (ASCII)
- Interfaces (language-appropriate types or schemas)
- Behavior (flows, state machines)
- Configuration (env vars, options)
- Error handling
- Examples
- Dependencies (links to other specs)
- Status (Planned / Outline / Complete)

**What does NOT go in SPEC.md:**
- Implementation details (that's what code is for)
- Tutorials or guides
- Historical decisions (use ADRs for that)

### 2. Test Plans (SPEC-TEST.md)

Each SPEC.md can have a companion SPEC-TEST.md that defines what should be tested:

```
<backend_root>/auth/
├── SPEC.md
├── SPEC-TEST.md     ← Test plan
├── __tests__/
│   ├── auth-client.test.<ext>
│   └── auth-state.test.<ext>
└── ...
```

**Test philosophy:** Pragmatic, not exhaustive.
- Frontend integration tests catch "we broke the feature"
- Minimal unit tests for pure logic
- Skip external services, platform edge cases

**SPEC-TEST.md structure:**
- Test scenarios table (what to test, priority)
- Example test code (copy-paste ready)
- What we're NOT testing (explicit)
- Regression test protocol

### 3. Navigation Spine (<docs_root>/)

Central docs provide navigation and cross-cutting concerns:

```
<docs_root>/
├── SPEC-INDEX.md      ← Master index of all specs
├── ARCHITECTURE.md    ← System overview
├── LLM-CONTEXT.md     ← Quick LLM onboarding
├── external-apis/     ← External API contracts (upstream)
├── features/          ← Cross-cutting feature quick references
└── work-in-progress/  ← Features under development
```

### 4. Feature Quick References (<docs_root>/features/)

Cross-cutting features that span multiple modules can get a quick reference doc:

```
<docs_root>/features/
├── FEATURE-A.md
├── FEATURE-B.md
└── FEATURE-C.md
```

**Purpose:**
- One-stop overview for cross-cutting features
- Links to all related specs across the codebase
- Quick reference tables (for users, devs, AI)
- Critical implementation patterns
- Common gotchas and debugging tips

**Status:** Feature docs can be written during integration (🔶 Beta) or after shipping (✅ Complete). Keep the status field current so readers know how “final” the doc is.

**What goes in feature docs:**
- Overview: What the feature does
- Quick reference for users and developers
- Table of all related specs (locations + purpose)
- Table of all related code files
- Critical patterns and implementation notes
- Testing instructions

**What does NOT go in feature docs:**
- Implementation details (those go in co-located SPEC.md files)
- Full specification (distributed across module specs)
- Historical/WIP information (use work-in-progress/ for that)

**When to create a feature doc:**
- Feature spans 3+ modules/directories
- Has both frontend and backend components
- Needs to be discoverable as a cohesive unit
- Will be referenced by AI/developers frequently

### 5. Work-in-Progress (<docs_root>/work-in-progress/)

Features under development get their own folder:

```
<docs_root>/work-in-progress/
├── README.md                    ← WIP index
└── feature-name/
    ├── TASKS.md                 ← Implementation tasks
    ├── SPEC-UPDATES-NEEDED.md   ← Changes to existing specs
    └── external-api-specs.md    ← Draft external contracts (promote to <docs_root>/external-apis/ when shipped)
```

When feature ships:
1. Update the internal specs
2. Archive or delete WIP docs
3. Update SPEC-INDEX.md

**Default rule:** If a feature touches multiple modules/specs (or needs coordination across frontend/backend), start in `<docs_root>/work-in-progress/<feature-name>/` and treat it as the working area until the design stabilizes. Avoid “live editing” multiple co-located specs as the primary WIP surface.

### 6. External Contracts (<docs_root>/external-apis/)

Some behaviors are defined by upstream services outside this repo (third-party APIs, services, or platform backends). Document those contracts in:

- `<docs_root>/external-apis/`

**Rules:**
- External contract docs describe the upstream API: endpoints, headers, payloads, response shapes/statuses, and any invariants the app relies on.
- Any module/route spec that depends on an upstream API must link to the relevant external contract doc(s).

---

## File Templates

Use your project's language for code samples in templates. The `text` blocks below are placeholders.

### SPEC.md Template

```markdown
# [Module Name] Specification

## Overview

[1-2 paragraphs: what this module does and why it exists]

**Key principle:** [One sentence summary of the design philosophy]

## Architecture

```
[ASCII diagram showing file structure and data flow]
```

## Interfaces

```text
interface MainInterface {
  // Key types used by this module
}
```

## Behavior

### [Main Flow Name]

```
1. Step one
   └── Sub-step
2. Step two
```

### [Secondary Flow]

[Description]

## Configuration

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VAR_NAME` | What it does | `example-value` |

## Error Handling

| Error | Handling |
|-------|----------|
| [Error type] | [How it's handled] |

## Examples

### [Example Name]

```text
// Example code
```

## Dependencies

- [Link to other specs this depends on]

## Status

**[Planned / Outline / Complete]** - [Brief note]

## Related Specifications

- [Links to related specs]
```

### SPEC-TEST.md Template

```markdown
# [Module Name] Test Plan

Maps to: [SPEC.md](./SPEC.md)

## Test Philosophy

**Approach:** [e.g., Frontend integration tests with mocked backends]

**Why:** Catches the bugs that matter most:
- [Bug type 1]
- [Bug type 2]

**What we skip:**
- [Thing 1]
- [Thing 2]

---

## Frontend Integration Tests

**Location:** `<frontend_tests_root>/[component]/__tests__/`

### Test Scenarios

| Scenario | What it tests | Priority |
|----------|---------------|----------|
| [Scenario 1] | [What it verifies] | High |
| [Scenario 2] | [What it verifies] | Medium |

### Implementation

```text
// Example test code
describe('[Component]', () => {
  it('[test description]', async () => {
    // Test implementation
  });
});
```

---

## Backend Unit Tests

**Location:** `<backend_tests_root>/[module]/__tests__/`

| Function | Test? | Why |
|----------|-------|-----|
| `functionName()` | Yes | [Reason] |
| `otherFunction()` | No | [Reason to skip] |

---

## What We're NOT Testing

| Area | Reason |
|------|--------|
| [Area 1] | [Why we skip it] |

---

## Regression Test Protocol

When a bug is found:
1. Add failing test that reproduces the issue
2. Fix the bug
3. Verify test passes
4. Add note below

### Regression Tests

*None yet - add as bugs are discovered.*

---

## Running Tests

```bash
<test command> -- [module-name]
```
```

### SPEC-INDEX.md Template

```markdown
# Specification Index

**Purpose:** Quick reference to all specs in the codebase.
**Last updated:** [Date]

---

## Cross-Cutting Features (<docs_root>/features/)

| Feature Doc | Components | Status |
|-------------|------------|--------|
| `<docs_root>/features/[FEATURE].md` | [Components] | [Status] |

---

## Co-located Specs (code roots)

### [Category 1]

| Spec | Domain | Status |
|------|--------|--------|
| `path/to/SPEC.md` | [Domain] | ✅ Complete |
| `path/to/SPEC.md` | [Domain] | 🔶 Outline |
| `path/to/SPEC.md` | [Domain] | ⬜ Planned |

### [Category 2]

[Same table format]

---

## Work in Progress

| Document | Purpose | Status |
|----------|---------|--------|
| `<docs_root>/work-in-progress/[feature]/` | [Purpose] | [Status] |

---

## Central Docs

| Document | Purpose |
|----------|---------|
| `<docs_root>/ARCHITECTURE.md` | System overview |
| `<docs_root>/features/` | Cross-cutting feature quick references |
| `<docs_root>/SPEC-INDEX.md` | This file |

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete - ready for reference |
| 🔶 | Outline - structure defined, implementation pending |
| ⬜ | Planned - not yet started |
| (update pending) | Spec exists but needs updates for new feature |
```

### LLM-CONTEXT.md Template

```markdown
# Quick Context for LLM Sessions

**Purpose:** Fast onboarding for new LLM sessions. Read this first.

## What This Project Does

[2-3 sentences explaining the project]

## Tech Stack

- [Framework]
- [Language]
- [Key libraries]

## Key Paths

| Path | Purpose |
|------|---------|
| `[frontend_root]/` | UI components |
| `[backend_root]/` | Backend logic |
| `[routes_root]/` | API routes |

## Documentation

- **Specs:** Co-located `SPEC.md` files (see `<docs_root>/SPEC-INDEX.md`)
- **Architecture:** `<docs_root>/ARCHITECTURE.md`
- **Features:** Quick references in `<docs_root>/features/`
- **WIP Features:** `<docs_root>/work-in-progress/`

## Current Focus

[What's being worked on right now]

## Commands

```bash
<dev command>     # Development server
<test command>    # Run tests
<build command>   # Production build
```
```

### Feature Doc Template (<docs_root>/features/)

```markdown
# [Feature Name]

**Status:** [✅ Production Ready / 🔶 Beta / ⬜ Planned]  
**Implemented:** [Date]

## Overview

[2-3 paragraphs: what this feature does, why it exists, key capabilities]

## Key Features

- ✅ [Feature 1]
- ✅ [Feature 2]
- ✅ [Feature 3]

## Quick Reference

### For Users

[How users interact with this feature - keep it simple]

**Example workflow:**
1. Step one
2. Step two
3. Step three

### For Developers

[Code examples, API calls, common patterns]

**Example usage:**
```text
// Example code
```

### For AI Features

[How AI/LLM features should interact with this feature]

**Example integration:**
```text
// AI integration example
```

## Documentation Locations

### Specifications

| Document | Purpose | Location |
|----------|---------|----------|
| **[Spec Name]** | [What it covers] | [Link to SPEC.md] |

### Code

| Component | Purpose | Location |
|-----------|---------|----------|
| **[Module Name]** | [What it does] | [Link to source] |

## Implementation Notes

### Critical Patterns

**1. [Pattern Name]**
[Description of critical pattern with code example]

**2. [Pattern Name]**
[Description of another critical pattern]

## Testing

[How to test this feature - commands, manual steps, etc.]

## Future Enhancements

[Optional section for planned improvements]

---

**Questions?** See the specs linked above or check `AGENTS.md` for development guidelines.
```

---

## Workflow

### Starting a New Feature

1. If the feature is cross-cutting (2+ modules/specs): create `<docs_root>/work-in-progress/[feature-name]/` first
2. Add `TASKS.md` with implementation tasks
3. Create outline SPECs in target locations (`<spec_root>/.../SPEC.md`)
4. Add `SPEC-UPDATES-NEEDED.md` if existing specs need changes
5. Update `SPEC-INDEX.md` with new specs (status: 🔶 Outline)

### During Implementation

1. Reference SPEC.md while coding
2. Update SPEC.md if design changes
3. Implement tests per SPEC-TEST.md
4. Check off tasks in TASKS.md

### After Feature Ships

1. Update spec status to ✅ Complete in all related SPEC.md files
2. Apply changes from SPEC-UPDATES-NEEDED.md to existing specs
3. **If feature is cross-cutting:** Create/update feature quick reference in `<docs_root>/features/`
4. Update `<docs_root>/ARCHITECTURE.md` if feature adds new system capabilities
5. Archive or delete WIP docs
6. Update `<docs_root>/SPEC-INDEX.md`

### When Specs Get Stale

If a spec doesn't match the code:
1. Update the spec (preferred)
2. Or mark with `(update pending)` in SPEC-INDEX.md
3. Never delete without replacement

---

## LLM Integration

### Providing Context

When starting a session with an LLM:
1. Share `<docs_root>/LLM-CONTEXT.md` first
2. Share relevant SPEC.md files for the task
3. The LLM can request additional specs as needed

### LLM Creating Specs

When asking an LLM to create documentation:
1. Point to this framework document
2. Specify which template to use
3. Provide the code to document

Example prompt:
```
Using the SPEC Framework (see <docs_root>/SPEC-FRAMEWORK.md),
create a SPEC.md for the auth module in <backend_root>/auth/.
Use the SPEC.md template and focus on interfaces and behavior.
```

### LLM Updating Specs

When modifying code:
1. Ask LLM to check if SPEC.md needs updates
2. Apply updates in same commit as code changes
3. This keeps specs synchronized

---

## Anti-Patterns

**Don't:**
- Put implementation details in specs (that's what code is for)
- Create specs for trivial modules (use judgment)
- Let specs become tutorials (keep them reference-focused)
- Skip the status field (it helps track completeness)
- Forget to update SPEC-INDEX.md (it's the navigation)

**Do:**
- Keep specs concise (1-2 pages ideal)
- Include working code examples
- Link between related specs
- Update specs when code changes
- Archive rather than delete

---

## When to Create a Feature Doc

**Create a feature doc when:**
- ✅ Feature spans 3+ modules/directories
- ✅ Has multiple related specs that need to be found together
- ✅ Users/developers/AI need a single entry point
- ✅ Critical patterns exist that apply across multiple files
- ✅ Feature is in integration and coordination cost is high
- ✅ Feature just shipped and you're cleaning up WIP docs

**Keep specs distributed when:**
- ❌ Feature is self-contained in one module (just use SPEC.md)
- ❌ Only 1-2 files involved
- ❌ No shared patterns or gotchas
- ❌ Rarely referenced as a unit

---

## Bootstrapping a New Project

To apply this framework to a new project:

1. **Create navigation spine:**
   ```
   <docs_root>/
   ├── SPEC-INDEX.md
   ├── ARCHITECTURE.md
   ├── LLM-CONTEXT.md
   ├── SPEC-FRAMEWORK.md  ← This document
   ├── features/          ← Add as features ship
   └── work-in-progress/
       └── README.md
   ```

2. **Identify key modules** that need specs (start with 3-5)

3. **Create outline specs** using templates above

4. **Add test plans** for modules that need testing

5. **Update SPEC-INDEX.md** as you add specs

6. **Iterate:** Add specs for new modules as they're created

7. **Create feature docs** when cross-cutting features are complete

---

## Summary

| Concept | File | Location |
|---------|------|----------|
| Module documentation | SPEC.md | Next to code (co-located) |
| Test planning | SPEC-TEST.md | Next to code (co-located) |
| Cross-cutting features | [FEATURE-NAME].md | <docs_root>/features/ |
| Navigation | SPEC-INDEX.md | <docs_root>/ |
| Quick context | LLM-CONTEXT.md | <docs_root>/ |
| System overview | ARCHITECTURE.md | <docs_root>/ |
| Features in progress | TASKS.md, etc. | <docs_root>/work-in-progress/ |

**Documentation Hierarchy:**
```
Specific → General
─────────────────────────────────────────────────
SPEC.md           Co-located with code
(module level)    Most detailed, single module

Feature Doc       Cross-cutting overview
(feature level)   Links to multiple SPEC.md files
                  Quick reference tables

ARCHITECTURE.md   System-wide overview
(system level)    High-level organization
```

The goal: Documentation that stays current because it lives with the code, provides useful context for humans and LLMs, and doesn't create maintenance burden.
