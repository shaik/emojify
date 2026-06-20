# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What to Build

A web app that lets users upload a photo and converts it into an emoji mosaic — a grid of emojis whose colours approximate the original image. Users should be able to crop before converting, adjust how the mosaic is generated, and export the result.

## Constraints

- **Runs entirely in the browser.** No server processes requests at runtime. No backend API.
- **Deployable as static files** to GitHub Pages (or any CDN). The GitHub Actions workflow should build any generated assets and publish the site automatically on push to `main`.
- **Mobile-friendly.** The primary use case is on a phone: upload a selfie, convert, share.

---

## Skills (slash commands — globally installed, ready to use)

| Invoke | When to use |
|--------|-------------|
| `/frontend-design` | **Start here for any UI work.** Sets visual direction, token system, and typography before writing CSS. |
| `/artifact-design` | Building individual UI components — includes a design critique step before generating code. |
| `/deep-research` | Before implementing any algorithm — research the best approach first (color matching, quantization, WASM, etc.). |
| `/code-review` | Before every commit. Catches bugs and efficiency issues in the hot path. |
| `/verify` | After any algorithmic change — confirms the output actually improved. |
| `/run` | Start the dev server and drive the app in a real browser. |
| `/metaswarm:visual-review` | Screenshot the running app to check UI states at mobile and desktop viewports. |
| `/security-review` | Before the first deploy and after any storage/export changes. |
| `/simplify` | After a feature lands — remove complexity and clean up. |

---

## MCP Servers (configured in .claude/settings.json — start automatically)

| Server | What it gives you |
|--------|-------------------|
| **playwright** | Real browser pointed at localhost — navigate, click, screenshot, inspect. Use to visually verify the emoji output and test mobile layouts. |
| **fetch** | Pull any URL — color algorithm papers, Twemoji docs, MDN references, npm package READMEs — without leaving the session. |
| **memory** | Persistent knowledge graph across sessions. Store algorithm tuning results, design decisions, and findings so they survive context resets. |
| **sequential-thinking** | Structured step-by-step reasoning. Invoke before designing the matching algorithm, the rendering pipeline, or any non-trivial architecture. |
| **github** | Inspect GitHub Actions runs, manage the Pages deploy, review PRs. Requires `GITHUB_TOKEN` env var (`export GITHUB_TOKEN=ghp_...`). |

---

## How to Start

1. Run `/metaswarm:start` to initialise project tracking.
2. Use **sequential-thinking** MCP + `/deep-research` to research the algorithm before writing any matching code.
3. Use `/frontend-design` to establish the visual direction before writing any CSS.
4. Use `/run` + **playwright** MCP to test in a real browser throughout development.
5. Use **memory** MCP to store decisions — they will be available in every future session.
