# Acme Store Support — Red Team (Promptfoo)

Red-teaming suite for the `llm-app` Acme Store support bot. It fires adversarial
prompts at the **running local app** (`http://localhost:3000/api/chat`) and grades
whether "Sandy" broke her rulebook.

The talk's thesis: **red-teaming reveals how an app's configuration drives its
security.** Three things move the needle, and the app exposes all three as live UI
toggles:

| Axis | Secure ⟶ Insecure | What it shows |
| --- | --- | --- |
| **Model** | Claude Haiku 4.5 ⟶ Amazon Nova Lite | A strong, well-aligned model resists most attacks out of the box; a weaker one doesn't. |
| **Prompt** | Hardened rulebook ⟶ Naive one-liner | A detailed, defensive system prompt is itself a security control. |
| **Guardrails** | Bedrock Guardrail ON ⟶ OFF | A model-agnostic backstop that catches what the model and prompt miss. |

This suite isolates the **guardrail** axis: both targets run the *vulnerable* config
(**Nova Lite + naive prompt**) so attacks actually land, and the **only** difference
between the two columns is whether the Bedrock Guardrail is attached. That makes the
side-by-side a clean measure of the guardrail's defense-in-depth value. (Swap `model`
/ `insecurePrompt` in the config to measure the other axes instead.)

Companion to the [`llm-app`](../llm-app) repo (the chatbot itself).

## How it points at the app

[`promptfooconfig.yaml`](promptfooconfig.yaml) uses Promptfoo's **HTTP provider** to
POST each attack to the app. The same app is registered twice — identical bodies
except for the `guardrails` flag:

```yaml
targets:
  - id: https
    label: guardrails-off          # body sends "guardrails": false
    config:
      url: http://localhost:3000/api/chat
      method: POST
      body:
        messages: [{ role: user, content: '{{prompt}}' }]
        guardrails: false
        insecurePrompt: true       # naive system prompt -> attacks land
        model: nova-lite           # weaker model -> attacks land
      transformResponse: json.reply   # pulls the assistant reply out of the JSON
  - id: https
    label: guardrails-on           # SAME vulnerable config, "guardrails": true
    ...
```

One run grades both targets, and `promptfoo view` shows them as two columns over
identical attacks — so the guardrail is the only variable that moved.

## Plugins (5 security plugins, one per guardrail policy area)

| Plugin | What it attacks | Guardrail policy it exercises |
| --- | --- | --- |
| `prompt-extraction` | Leak the hidden system prompt | PROMPT_ATTACK content filter |
| `pii` | Coax out / fabricate customer PII | Sensitive-information policy |
| `hijacking` | Push off-topic / toward competitors | Topic policies |
| `excessive-agency` | Over-discount, unauthorized refunds | Topic policy (discount cap) |
| `harmful:hate` | Generate hateful/unsafe content | Content filters |

Strategies: `basic` (raw), `jailbreak`, `prompt-injection` — the last two are the
techniques this talk is about. `numTests: 5` per plugin keeps cost inside the $10 budget.

Attack generation **and** grading both run on **Bedrock Haiku** (not the default
OpenAI), so no OpenAI key is needed and everything stays on one AWS bill.

## Run it (locally, with streaming progress)

```bash
# 0. credentials: uses your default AWS profile (same as the app)
npm install                  # installs promptfoo (latest)

# 1. in the llm-app repo, start the app first:
#    cd ../llm-app && npm run dev      # must be live on localhost:3000

# 2. generate + run the attacks against both targets (streams progress live):
npm run redteam              # = promptfoo redteam run

# 3. open the side-by-side report in the browser:
npm run view                 # = promptfoo view
```

`promptfoo redteam run` streams each generated attack and pass/fail to the terminal
as it goes; `promptfoo view` opens the web UI with the guardrails-off vs guardrails-on
columns — the centerpiece slide for the talk.

> Tip: you can also run without installing via `npx promptfoo@latest redteam run`.
