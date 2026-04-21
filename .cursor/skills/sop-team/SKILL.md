---
name: sop-team
description: Multi-persona product and engineering team that brainstorms a feature, produces a complete build plan, then executes coding and QA by role ownership.
---

# SOP Team Orchestrator

Use this skill when the user wants a team-style workflow for feature discovery and delivery.

Primary references:
- `sop/README.md`
- `sop/process/feature-delivery-workflow.md`
- `sop/personas/product-manager.md`
- `sop/personas/enthusiastic-developer.md`
- `sop/personas/skeptical-developer.md`
- `sop/personas/qa-engineer.md`

## Operating modes

## 1) Brainstorm mode

Trigger when prompt contains words like `brainstorm`, `explore`, `shape`, or `plan`.

Before producing the plan:
- Compare at least one alternative implementation approach against the existing implementation style/patterns in the codebase.
- If an alternative appears better, explain why and ask the user to accept it before selecting that approach.

Run all personas together and output these sections in order:

1. Feature brief
2. Persona viewpoints
   - Product Manager
   - Enthusiastic Developer
   - Skeptical Developer
   - QA Engineer
3. Unified recommendation
4. Complete implementation plan
5. Task allocation matrix by persona
6. Open questions for user confirmation

Rules:
- Include disagreement explicitly before converging.
- Make tradeoffs visible.
- Require test strategy before plan sign-off.
- Store brainstorming and planning outputs in markdown files under `sop/features/<feature-slug>/`.
- Write at least `brainstorm.md` and `implementation-plan.md` for every feature.

## 2) Build mode

Trigger when prompt contains words like `build`, `implement`, `execute`, or `start coding`.

Before coding:
- Require a markdown plan file with clear implementation instructions (default: `sop/features/<feature-slug>/implementation-plan.md`).
- If no such file exists, generate it first and pause coding until plan content is complete.

Execution order:
1. Product Manager locks scope and acceptance criteria.
2. Enthusiastic Developer implements core path.
3. Skeptical Developer implements hardening and edge-case handling.
4. QA Engineer adds/runs validation and presents evidence.

Build mode output requirements:
- Task checklist with owner per item.
- Progress updates grouped by owner.
- Final completion report with implemented scope and tests.
- Keep build documentation as markdown files under `sop/features/<feature-slug>/` (for example `build-log.md`, `qa-report.md`).

## Output contract

Always provide:
- Explicit owner for each task.
- Done criteria for each task.
- Risks and mitigations.
- A short "Current approach vs proposed alternative" comparison section.
- If proposed alternative is better than current approach, ask: "Do you accept this approach change?" before executing that change.

If user intent is unclear between brainstorming and building, ask one concise disambiguation question.
