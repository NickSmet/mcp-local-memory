# SPEC Framework Bootstrap (One-Time Setup)

Use this document to initialize a brand-new project with the SPEC framework. This is a one-time setup process.

Replace `<docs_root>` with your project's documentation root (default: `docs/`).

## Step 1: Copy the Two Bootstrap Files into the New Project

1. Copy the SPEC framework document into the new repo:
   - From: `SPEC-FRAMEWORK-BOOTSTRAP/SPEC-FRAMEWORK.md`
   - To: `<docs_root>/SPEC-FRAMEWORK.md` in the new project

2. Copy the bootstrap AGENTS template into the new repo root:
   - From: `SPEC-FRAMEWORK-BOOTSTRAP/AGENTS.md`
   - To: `AGENTS.md` in the new project

These two files are the baseline contract for documentation and AI-assisted development. Reflect the chosen `<docs_root>` path in `AGENTS.md`.

## Step 2: Expand `AGENTS.md` for the New Project

Fill in the required sections with project-specific information:

- Project purpose and architecture summary
- Repository layout and key directories
- Spec location conventions (backend, routes, services, docs root)
- Build/test/lint/dev commands and how to run them
- Environment variable policy and configuration sources
- Coding conventions and critical patterns
- Known gotchas and runtime caveats
- Review expectations (tests, spec updates, validations)

Do not keep `AGENTS.md` generic. It must reflect how this specific project works.

## Step 3: Initialize the Documentation Spine

Create the base docs structure described in `<docs_root>/SPEC-FRAMEWORK.md`:

```
<docs_root>/
├── SPEC-INDEX.md
├── ARCHITECTURE.md
├── LLM-CONTEXT.md
├── SPEC-FRAMEWORK.md
├── features/
└── work-in-progress/
    └── README.md
```

Populate each file using the templates from `<docs_root>/SPEC-FRAMEWORK.md`.

## Step 4: Create the First Wave of Specs

1. Identify 3-5 core modules and create outline `SPEC.md` files next to their code.
2. If any feature spans multiple modules, create a WIP doc under `<docs_root>/work-in-progress/<feature>/` first.
3. Update `<docs_root>/SPEC-INDEX.md` with links and status for every new spec.

## Step 5: Add External Contracts (If Applicable)

If the project depends on external APIs:

- Create docs under `<docs_root>/external-apis/`.
- Link to those contracts from any module or route SPEC that depends on them.
- For non-JSON or streaming endpoints, document content-type, schema, termination, errors, and disconnect behavior.

## Step 6: Start Implementation Using the Framework

Implement features by following the framework rules:

- Read and reference SPEC.md files while coding.
- If behavior changes, update the spec in the same change.
- For cross-cutting work, keep WIP docs until stable, then promote into SPEC.md files.
- Add SPEC-TEST.md when test planning matters.
- Keep `<docs_root>/SPEC-INDEX.md` current.

## Step 7: Clean Up Bootstrap Artifacts

After the new project is bootstrapped and the user confirms everything looks correct:

- Delete the entire `SPEC-FRAMEWORK-BOOTSTRAP/` folder from the new project.

Do not delete it before explicit confirmation from the user.
