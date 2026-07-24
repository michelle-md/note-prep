# Iteration suggestions

Files in this folder are written automatically by the Worker (`/api/iteration`).

When a note is copied from the ED Shift Clipboard and the clinician has edited
it manually, the Worker compares the AI-generated draft with the final edited
note against the current rule files under `prompts/`, and commits the resulting
suggested-changes list here as one markdown file per analysis. Nothing is shown
in the clipboard UI.

## Review workflow

1. In a Claude Code session on this repo, pull and read the pending files here.
2. Decide, suggestion by suggestion, what to change and how — apply accepted
   changes to the relevant `prompts/*.md` files (or create new ones).
3. Delete each processed file (applied or rejected) so this folder only ever
   contains suggestions still awaiting review.

## Notes

- One file per copied-and-edited note, named
  `YYYY-MM-DDTHHMM-<patient-label>-<rand>.md`.
- If the analysis finds nothing systematic (edits were case-specific), no file
  is written.
- Files may quote short fragments of clinical notes as evidence. The folder is
  asset-ignored (`.assetsignore`) so it is never served by the Worker.
- Requires the `GITHUB_TOKEN` Cloudflare secret (fine-grained PAT, contents
  read/write on this repo only): `npx wrangler secret put GITHUB_TOKEN`.
  Repo/branch default to `michelle-md/note-prep` / `main`
  (override with `GITHUB_REPO` / `GITHUB_BRANCH` vars).
