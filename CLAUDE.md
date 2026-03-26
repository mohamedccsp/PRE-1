# CLAUDE.md — Project Guide for Claude Code

> This file teaches Claude Code about this project. It is automatically loaded
> into context at the start of every conversation. Use it to capture conventions,
> architecture decisions, and workflow preferences so Claude doesn't have to
> re-discover them each time.

## Project Overview

**PRE-1** is an educational / training repository used to learn Claude Code,
GitHub workflows, and plugin-based development. The main deliverable is a
**single-file weather dashboard** (`dashboard.html`) that demonstrates:

- Fetching live data from public APIs (Open-Meteo, ip-api, REST Countries)
- Building a complete UI with inline CSS and JS (no build tools)
- Applying a futuristic dark theme with advanced CSS techniques
- Iterating on features via PRs and structured workflows

## Tech Stack & Architecture

| Layer | Technology |
|-------|-----------|
| App | Single HTML file — `dashboard.html` (~80 KB, all CSS/JS inline) |
| Weather API | Open-Meteo (`api.open-meteo.com/v1/forecast`) — no API key |
| Geocoding | Open-Meteo Geocoding (`geocoding-api.open-meteo.com/v1/search`) |
| Country list | REST Countries (`restcountries.com/v3.1/all`) |
| IP Geolocation | ip-api.com (HTTP only on free tier) |
| Persistence | `localStorage` under key `weatherDashboardPrefs` |

### Key Constants

- `MAX_CITIES = 4` — exactly 4 city cards in a 2x2 grid
- `FALLBACK_CITIES` — Riyadh, Dubai, Cairo, Istanbul (used when auto-detect fails)
- `CITY_SEEDS` — hardcoded city names for 30+ countries (solves unreliable single-letter geocoding searches)

### Design System

- **Fonts**: Orbitron (headers), Rajdhani (body), Share Tech Mono (data/labels)
- **Colors**: `--cyan: #00d4ff`, `--purple: #a855f7`, `--magenta: #e040fb` on `--bg-deep: #030812`
- **Effects**: CSS `@property` animated conic-gradient logo ring, SVG world map with pulsing dots, floating particles, scanline overlay, card corner bracket accents

## File Structure

```
PRE-1/
├── dashboard.html          # The entire app (HTML + CSS + JS)
├── README.md               # Project description and plugin docs
├── CLAUDE.md               # This file — project context for Claude
└── .claude/
    ├── settings.json       # Enabled plugins (shared/committed)
    └── settings.local.json # Local permissions and plugin overrides
```

## Enabled Plugins

These plugins are configured in `.claude/settings.json` and extend Claude Code's
capabilities in this project:

### context7 (`context7@claude-plugins-official`)
Fetches up-to-date library documentation on demand. Use it when working with
APIs or libraries where training data may be outdated. Triggered via MCP tools
`resolve-library-id` and `query-docs`.

### feature-dev (`feature-dev@claude-plugins-official`)
Structured feature development workflow with 7 phases: Discovery, Codebase
Exploration, Clarifying Questions, Architecture Design, Implementation, Quality
Review, Summary. Invoke with `/feature-dev`. Spawns specialized sub-agents for
code exploration, architecture, and review.

### explanatory-output-style (`explanatory-output-style@claude-plugins-official`)
Adds `★ Insight` blocks with educational explanations about implementation
choices. Useful for learning — provides context about *why* not just *what*.

### frontend-design (`frontend-design@claude-plugins-official`)
Guides creation of distinctive, production-grade frontend interfaces. Focuses on
typography, color, motion, spatial composition, and avoiding generic AI aesthetics.
Invoke with `/frontend-design` or let it trigger on frontend tasks.

### github (`github@claude-plugins-official`)
GitHub MCP server for managing repos, PRs, issues, and code review directly
from Claude Code without leaving the terminal.

## Conventions & Preferences

### Code Style
- Everything lives in `dashboard.html` — do not split into separate files
- CSS uses custom properties (`:root` variables) for theming
- JS uses `async/await` and `Promise.allSettled` for parallel API calls
- Sidebar controls use native `<select>` elements (both `size` and `multiple`)
- City data flows: detect/select → geocode → fetch weather → render cards

### Git Workflow
- Branch naming: `feature/<descriptive-name>`
- Commit messages: imperative mood, summary line + bullet details
- Always create PRs via `gh pr create` — never push directly to master
- Co-author tag: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

### Permissions (Local)
The following tools are pre-approved in `.claude/settings.local.json`:
- `gh` commands (repo, issue, pr)
- `git checkout`, `start`, `curl`, `powershell`, `python`, `rm`
- Context7 MCP tools

## Lessons Learned

These patterns were discovered through building this project:

1. **Open-Meteo geocoding is unreliable for discovery** — searching single
   letters like "a" or "b" returns globally popular cities, not country-specific
   ones. Solution: maintain a `CITY_SEEDS` database with known city names per
   country and search by exact name.

2. **CSS `conic-gradient` doesn't visually animate with `transform: rotate`** —
   because the gradient rotates with the element. Solution: use CSS Houdini
   `@property` to register the angle as an animatable typed value.

3. **`<select size="N">` vs `<select multiple>`** — both render as scrollable
   lists. `size` keeps single-select behavior (click one = deselect previous),
   while `multiple` allows Ctrl/Cmd multi-selection. Use `size` for countries,
   `multiple` for cities.

4. **PowerShell commands in bash** — dollar signs get eaten by bash. Write `.ps1`
   files and execute with `powershell -ExecutionPolicy Bypass -File` instead of
   inline commands.

5. **Base64 image embedding** — resize images before encoding (a 1MB PNG becomes
   ~1.3MB base64). For logos, resize to 120px first to keep HTML under 100KB.

6. **Grid layout with sidebar** — `minmax(340px, 1fr)` can prevent 2-column
   layout when sidebar takes space. Use `repeat(2, 1fr)` for a fixed 2x2 grid.

## How to Run

Open `dashboard.html` in any modern browser. No server or build step needed.
The app auto-detects your location via IP and loads weather for 4 cities in
your country. Use the sidebar to change country/cities manually.
