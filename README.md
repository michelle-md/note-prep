# note-prep

Two tools served by one Cloudflare Worker:

- **Note Prep** (`index.html`) — CareOn note formatting tool
- **ED Shift Clipboard** (`ed-shift-clipboard.html`) — shift patient cards, multi-modal entry, AI note generation

Live at `https://clipboard.theconsultr.com` (clipboard), behind Cloudflare Access.
The `workers.dev` route is deliberately disabled (`workers_dev: false` in
`wrangler.jsonc`): it served the same worker and shift data with no Access
sign-in in front of it. Do not re-enable it without putting Access in front.

## Final note editing & the improvement loop

After generation, the medical note appears in an **editable text box** — the
clinician can add or delete text directly, and that edited version is the final
note. Every copy action ("Copy final note", "Copy all") copies the edited text;
"Iterate note" (voice prompt / images + regenerate) still works and resets the
edit box to the new AI baseline.

When a note is copied and it differs from what the AI generated, the client
fires `/api/iteration` in the background. The Worker sends the AI draft, the
final edited note, the original typed inputs, and every rule file under
`prompts/` to the model with `prompts/sa-ed-iteration.md` as system prompt. The
resulting short list of suggested changes — new rules, rule updates, new or
adjusted skill files — is committed straight to the repo as a markdown file
under `iteration-suggestions/` (see the README there for the review workflow).
Nothing appears in the clipboard UI. Edits that only reflect case-specific
information (results that arrived later, etc.) are deliberately not turned into
suggestions, and produce no file.

Saving suggestions needs the `GITHUB_TOKEN` Cloudflare secret — a fine-grained
personal access token with contents read/write on this repo only:
`npx wrangler secret put GITHUB_TOKEN`. Repo and branch default to
`michelle-md/note-prep` / `main` (`GITHUB_REPO` / `GITHUB_BRANCH` vars override).

## Cloud vs local AI

Every AI call goes through one function in `worker.js` (`callLLM`), selected by the
`LLM_PROVIDER` environment variable:

| Mode | Where AI runs | Patient data | Use |
|---|---|---|---|
| (unset) / `anthropic` | Anthropic API (cloud) | leaves the machine | deployed worker — fictional/validation data only until POPIA review is complete |
| `ollama` | Mistral 7B via Ollama on this machine | never leaves the machine | local POPIA-safe mode |

The deployed worker has no `LLM_PROVIDER` set, so production behaviour is unchanged.
Local mode is configured in `.dev.vars` (git-ignored, asset-ignored — it cannot deploy
or be served) and only applies to `npx wrangler dev`.

## Running the clipboard locally on Mistral (POPIA-safe mode)

1. Make sure Ollama is running (it serves on `http://127.0.0.1:11434`) and the model
   is pulled: `ollama pull mistral`
2. Make sure `.dev.vars` contains `LLM_PROVIDER=ollama` (see `.dev.vars.example`)
3. From this folder run:

   ```
   npx wrangler dev --port 8788 --persist-to %TEMP%/wrangler-state
   ```

   `--persist-to` must point **outside** this folder — if wrangler keeps its local
   KV state inside the repo, its own writes retrigger the file watcher and the dev
   server reloads in an endless loop, hanging every request.

   If startup logs show `unable to verify the first certificate`, run with the
   Windows certificate store: `set NODE_OPTIONS=--use-system-ca` first.

4. Open `http://localhost:8788/ed-shift-clipboard.html`

### Local mode limitations (Mistral 7B, CPU-only laptop)

- **No images.** Mistral 7B has no vision. Attached images are replaced with an
  explicit placeholder instructing the model to list them as unprocessed data the
  clinician must transcribe — never guessed at.
- **Slow.** First call loads the model (~30 s). Note generation must first process
  the full clinical system prompt (~18k tokens) on CPU — expect minutes per note on
  an ungpu'd laptop, not seconds. The live-check box will also lag behind typing.
- Shift data stays in wrangler's local KV simulation (the `--persist-to` folder),
  not in Cloudflare — local shifts are invisible to the cloud clipboard and vice versa.

## Deploying (cloud mode)

`npx wrangler deploy` — unchanged. Needs the `ANTHROPIC_API_KEY` Cloudflare secret.
