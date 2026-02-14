# Agent Guidelines (Bootstrap Template)

This file is intentionally generic. Expand it to fit the new project's structure, stack, and conventions.

## Required Expansion (Project-Specific)

- Project purpose and high-level architecture summary
- Repo layout and key directories
- Spec location conventions (docs root, backend root, routes root, services)
- Build, test, lint, and dev commands
- Environment variable policy and configuration sources
- Coding conventions and critical patterns
- Known gotchas and runtime caveats
- Review expectations (tests, spec updates, validations)

## Critical Rules from SPEC-FRAMEWORK (Do Not Skip)

1. **Specs are co-located with code.**
   - Define spec roots here (examples: `<backend_root>`, `<routes_root>`, `<service_root>`, `<docs_root>`).
   - Backend/library specs live in `<backend_root>/{module}/SPEC.md`.
   - Route/UX specs live in `<routes_root>/{route}/SPEC.md`.
   - UX details belong in route specs, not backend specs.

2. **Keep specs clean: no implementation details, no worklogs.**
   - Specs describe interfaces, behavior, and contracts.
   - Design exploration, migration plans, and bug archaeology belong in WIP docs, not SPEC.md.

3. **Use `<docs_root>/work-in-progress/` for active design.**
   - Start cross-cutting features there until the design stabilizes.
   - Promote stable behavior into SPEC.md files.
   - Delete or archive WIP docs after shipping.

4. **Maintain the navigation spine.**
   - Keep `<docs_root>/SPEC-INDEX.md` current with status and links.
   - Include a status field in every SPEC.md.
   - Link dependencies between related specs.

5. **External contracts are explicit.**
   - Upstream APIs live in `<docs_root>/external-apis/` and must be linked from dependent specs.
   - For non-JSON or streaming endpoints, document:
     - Content-Type
     - Message/event schema
     - Termination semantics
     - Error semantics
     - Client disconnect/abort behavior

6. **Add SPEC-TEST.md when test planning matters.**
   - Capture what to test, what to skip, and regression protocol.

7. **Specs and code change together.**
   - If behavior changes, update the relevant SPEC.md in the same change.
   - If the spec already states intended behavior, fix the code; do not add extra docs.

8. **Review SPEC-FRAMEWORK regularly.**
   - This file is your contract for how documentation should be created and maintained.

## When in Doubt

- If a change affects user-facing flows, update the entrypoint/UX SPEC.md (routes, screens, CLI flows).
- If a change affects backend behavior or API shape, update the module SPEC.md and external contract docs.
- If behavior is not stable yet, keep it in WIP docs until it is.
