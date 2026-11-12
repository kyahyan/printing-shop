---
name: obsidian-memory
description: >-
  Persistent project and architectural memory stored in the user's local Obsidian vault
  (C:\Users\yanco\Documents\Obsidian Vault). Activate this skill at the start of complex tasks
  to recall prior architecture, database schema, design decisions, and session history, and at
  the end of significant changes to persist updated knowledge into Obsidian markdown notes.
---

# Obsidian Persistent Memory Skill

Use the local Obsidian vault as long-term structured memory across conversations and projects.

## Vault Location

- **Root Vault Path**: `C:\Users\yanco\Documents\Obsidian Vault`
- **Vault Index (MOC)**: `C:\Users\yanco\Documents\Obsidian Vault\Home.md`
- **Clayjar Print Shop Folder**: `C:\Users\yanco\Documents\Obsidian Vault\Projects\Clayjar Print Shop\`

## Workflow

### 1. Reading Memory (Before Making Architectural Changes)
1. If `obsidian-memory` MCP tools (`read_note`, `search_notes`, `list_directory`) are available, prefer them; otherwise read files directly from `C:\Users\yanco\Documents\Obsidian Vault`.
2. Start from `Home.md` or `Projects/Clayjar Print Shop/00 - Overview.md` and follow `[[wikilinks]]` to the relevant topic note (`01 - Architecture & Routes`, `02 - Supabase Database & Auth`, `03 - HeroUI v3 & Design System`, `04 - Session Log & Decisions`).

### 2. Writing & Updating Memory (After Completing Major Work)
Update the relevant note(s) in `C:\Users\yanco\Documents\Obsidian Vault` whenever you:
- Add or modify database tables, RLS policies, or RPC functions
- Add new routes, user roles, or core business workflows
- Change theme tokens, UI conventions, or external integrations
- Resolve a non-trivial bug or architectural constraint worth remembering

### 3. Obsidian Note Formatting Conventions
- Include clean YAML frontmatter (`title`, `tags`, `updated`, `project`).
- Connect related notes with Obsidian `[[wikilinks]]` so the Obsidian Graph View stays interconnected.
- **Security Rule**: Never write raw secret keys, `.env.local` tokens, or plaintext passwords into Obsidian notes. Reference environment variable names (e.g., `NEXT_PUBLIC_SUPABASE_URL`) instead.

