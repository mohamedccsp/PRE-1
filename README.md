# PRE-1

Testing and training on GitHub commands, Claude Code plugins, and plugin-based development workflows.

## Plugins

All plugins are configured in `.claude/settings.json` and extend Claude Code's capabilities in this project.

### github (`github@claude-plugins-official`)

Official GitHub MCP server for repository management. Enables Claude to create issues, manage pull requests, review code, search repositories, and interact with GitHub's full API directly — streamlining the Git workflow without leaving the terminal.

**How we use it:** We run all GitHub operations (creating branches, opening PRs, reviewing code, managing issues) through Claude Code instead of switching to the browser. For example, `gh pr create` and `gh issue list` are handled via this plugin's MCP tools, keeping the entire development loop inside the terminal.

### feature-dev (`feature-dev@claude-plugins-official`)

A comprehensive feature development workflow plugin by Anthropic. It uses specialized agents for codebase exploration, architecture design, and quality review — guiding through structured feature implementation with a focus on understanding the existing codebase before making changes.

**How we use it:** Invoked with `/feature-dev` when building new features for `dashboard.html`. It runs a 7-phase workflow: Discovery → Codebase Exploration → Clarifying Questions → Architecture Design → Implementation → Quality Review → Summary. Each phase spawns specialized sub-agents that analyze the codebase before writing code, ensuring changes align with existing patterns.

### explanatory-output-style (`explanatory-output-style@claude-plugins-official`)

Adds educational `★ Insight` blocks with explanations about implementation choices and codebase patterns to Claude's responses. Useful for learning *why* certain approaches are preferred, understanding design decisions, and building deeper knowledge as you work.

**How we use it:** Automatically active in every conversation. As Claude writes or modifies code, it inserts insight blocks explaining key decisions — for example, why CSS Houdini `@property` is used for gradient animation, or why `Promise.allSettled` is preferred over `Promise.all` for parallel API calls. This turns every coding session into a learning opportunity.

### frontend-design (`frontend-design@claude-plugins-official`)

Guides creation of distinctive, production-grade frontend interfaces. Focuses on typography, color, motion, spatial composition, and avoiding generic AI aesthetics.

**How we use it:** Invoked with `/frontend-design` or triggered automatically on frontend tasks. When building or refining the weather dashboard UI, this plugin ensures the design follows strong visual principles — choosing fonts like Orbitron and Rajdhani, defining the cyan/purple/magenta color palette, and implementing effects like animated conic-gradient logo rings, floating particles, and scanline overlays rather than settling for default styling.

### pr-review-toolkit (`pr-review-toolkit@claude-plugins-official`)

A comprehensive pull request review toolkit that spawns specialized agents to analyze code changes from multiple angles — code quality, type design, test coverage, silent failures, and comment analysis.

**How we use it:** Invoked with `/review-pr` before merging pull requests. It runs multiple review agents in parallel: a code reviewer checks for bugs and security issues, a type design analyzer validates data structures, a test analyzer assesses coverage, and a silent failure hunter looks for unhandled error paths. This multi-agent approach catches issues that a single-pass review might miss.

### playwright (`playwright@claude-plugins-official`)

Browser automation and testing plugin powered by Playwright. Provides MCP tools for navigating pages, clicking elements, filling forms, taking screenshots, inspecting console output, and monitoring network requests — all from within Claude Code.

**How we use it:** Used to visually verify and test `dashboard.html` in a real browser. We can navigate to the file, take screenshots to confirm layout, interact with the sidebar controls (country/city selection), verify that weather cards render correctly, and check console logs for API errors — all without manually opening a browser.

### context7 (`context7@claude-plugins-official`)

Provides up-to-date, version-specific documentation and code examples directly within the prompt. Instead of relying on potentially outdated training data, Context7 fetches real documentation from source repositories so that Claude gives accurate, current answers.

**How we use it:** Referenced via MCP tools `resolve-library-id` and `query-docs` when working with APIs or libraries where training data may be outdated. For example, when integrating Open-Meteo or REST Countries APIs, Context7 can pull the latest endpoint documentation to ensure our fetch calls use current parameters and response formats.
