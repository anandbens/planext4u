# 15 — AI Services

## 1. Driver interface

AI is pluggable behind one interface; providers are selected per capability by configuration.

```text
AiDriver
  complete(prompt, options) → text
  chat(messages[], options) → text | stream
  embed(texts[]) → vectors
  generateImage(prompt, options) → asset
  classify(input, taxonomy) → labels + scores
  health() → status
```

| Capability | Providers |
|---|---|
| Text | Llama 3.1 / 3.3 via Ollama (self-hosted), Qwen 2.5 32B, OpenAI GPT-4o, Gemini |
| Image | Qwen-Image (self-hosted), plus a hosted provider where configured |
| Embeddings | Self-hosted embedding model, or a hosted provider |
| Moderation | Self-hosted classifier, with a hosted moderation endpoint as fallback |

A **fallback chain** is configured per capability (e.g. self-hosted → hosted → disabled-with-graceful-message). Provider credentials are referenced by name from the secret store; values never appear in code, config files or logs.

## 2. AI product assistant

One-click generation from minimal input (category, a few attributes, an image):

| Output | Rules |
|---|---|
| Product name | Length-bounded, brand and model preserved verbatim, no superlatives or unverifiable claims |
| Description | Rich text, structured (overview, features, specifications, care), locale-aware |
| SEO | Slug, meta title (<60 chars), meta description (<160 chars), keyword set |
| Attributes | Suggested values mapped to the category's attribute master, never free text |
| Image alt text | Descriptive, accessibility-grade |
| Translations | Target-locale versions of the above |

The generated content is always a **suggestion**: it lands in an editable field, is diffable against what the vendor wrote, and is marked as AI-assisted in the audit record. Nothing is auto-published without a human accept, unless the vendor opts in to auto-accept for bulk imports.

Adjacent assistants: review summarisation, support-reply drafting, category and tag suggestion, duplicate-listing detection via embeddings, and search query understanding (spelling, intent, synonym expansion).

## 3. Prompt management

Prompts are versioned templates stored in configuration, not inline strings: template key, version, model hints, system prompt, variable schema, output schema, and evaluation examples. Structured outputs are requested as JSON and validated against the output schema; a validation failure retries once, then falls back to no suggestion. Prompt changes are audited and A/B testable.

## 4. Safety and moderation

- All model outputs pass an output filter before display: prohibited claims, competitor references, contact details, and unsafe content are stripped or blocked.
- All user-generated content passes a moderation classifier before publication (see `07 §9`), with thresholds configurable per surface and a human queue above them.
- Prompt-injection defence: user-supplied text is always delimited and treated as data; the model is never given tool authority over platform state. AI never writes directly to the database — it returns suggestions that an application path validates and persists.

## 5. Cost, rate and caching controls

Per-tenant and per-user quotas, per-endpoint rate limits, token budgets with alerting, request/response caching keyed by a hash of the normalised input plus template version, and batching for embeddings. Every call records model, tokens, latency, cost estimate and outcome for the AI usage report in admin. When a budget is exhausted the feature degrades with a clear message rather than failing the surrounding screen.

## 6. Acceptance criteria

1. Switching provider is a configuration change with no code change and no contract change.
2. Provider failure never blocks the underlying workflow.
3. No AI output reaches a customer surface without passing the output filter.
4. Every AI-generated field is attributable in the audit log.
