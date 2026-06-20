# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What to Build

A web app that lets users upload a photo and converts it into an emoji mosaic — a grid of emojis whose colours approximate the original image. Users should be able to crop before converting, adjust how the mosaic is generated, and export the result.

## Constraints

- **Runs entirely in the browser.** No server processes requests at runtime. No backend API.
- **Deployable as static files** to GitHub Pages (or any CDN). The GitHub Actions workflow should build any generated assets and publish the site automatically on push to `main`.
- **Mobile-friendly.** The primary use case is on a phone: upload a selfie, convert, share.

## Skills Available

Use these skills — they are installed globally and are ready without any setup:

| Invoke | When to use |
|--------|-------------|
| `/frontend-design` | **Start here for any UI work.** Sets the visual direction, token system, and typography before writing a line of CSS. |
| `/artifact-design` | Building individual UI components or pages — includes a design critique step before generating code. |
| `/deep-research` | Before implementing any algorithm — research the best approach (color matching, image quantization, performance, etc.). |
| `/code-review` | Before every commit. Catches bugs and efficiency issues. |
| `/verify` | After any change to the core algorithm — confirms it actually produces better output. |
| `/run` | Start the dev server and drive the app in a real browser. |
| `/metaswarm:visual-review` | Screenshot the running app to check UI states at mobile and desktop sizes. |
| `/security-review` | Before the first deploy and any time auth/storage changes. |
| `/simplify` | After a feature lands — clean up and simplify the code. |

## How to Start

1. Run `/metaswarm:start` or `/metaswarm:setup` to initialise the project tracking.
2. Use `/deep-research` to research the algorithm before writing any matching code.
3. Use `/frontend-design` to establish the visual direction before writing any CSS.
4. Use `/run` to start a local dev server and test in browser throughout.
