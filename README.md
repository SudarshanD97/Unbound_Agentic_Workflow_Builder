# Unbound_Agentic_Workflow_Builder


Purpose: A small “agentic workflow” runner—build multi-step LLM workflows, run them with retries, track outputs, and keep history.

Stack: Vite + React (TSX), Tailwind-style UI; Node/Express + SQLite; fetch-based API with proxy for dev.

Workflow flow: Define steps (model, prompt, completion criteria, retries). Run → each step executes in order, passing context forward; retries on failure; llm_eval criteria supported.

Auto model selection: Per-step “Auto” model option. Uses the cheapest model first; if a step fails after its retries, it falls back once to the most capable model (cost-optimized but with a quality safety net).

Cost & budget: Cost per 1k tokens configurable (near Run or in Settings); cost tracked per step and per run; budget cap supported; Budget menu shows total spent and remaining with alerts.

History & export/import: Execution history with cost shown; workflows can be exported/imported as JSON.

Notifications: On run completion/failure, the server emails the notification address (SMTP required; logs show send/skip/failure)
