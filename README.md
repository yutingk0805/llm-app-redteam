# Acme Store Support — Red Team (Promptfoo)

Red-teaming suite for the [`llm-app`](../llm-app) Acme Store support bot. It fires adversarial
prompts at the **running local app** (`http://localhost:3000/api/chat`) and grades whether
"Sandy" broke her rulebook.

Three configuration axes drive the bot's security, and the app exposes all three as live UI
toggles. This suite measures how much each one is worth:

| Axis | Secure ⟶ Insecure | What it shows |
| --- | --- | --- |
| **Model** | Claude Haiku 4.5 ⟶ Amazon Nova Lite | A strong, well-aligned model resists most attacks out of the box; a weaker one doesn't. |
| **Prompt** | Hardened rulebook ⟶ Naive one-liner | A detailed, defensive system prompt is itself a security control. |
| **Guardrails** | Bedrock Guardrail ON ⟶ OFF | A model-agnostic backstop that catches what the model and prompt miss. |

## Reproducible attack set (generate once, freeze, reuse)

The attacks are generated **once** and frozen into
[`redteam-cases.yaml`](redteam-cases.yaml) so every run grades the **identical** set — the only
way columns across different model/prompt/guardrail combos are truly comparable. `promptfoo eval`
never regenerates, so the frozen set stays fixed across runs.

| File | Role |
| --- | --- |
| [`promptfooconfig.yaml`](promptfooconfig.yaml) | Generation config — plugins, strategies, `numTests`. `npm run generate` writes `redteam.yaml`. |
| [`scripts/freeze.js`](scripts/freeze.js) | Extracts the generated `tests` list into `redteam-cases.yaml`. `npm run freeze`. |
| [`eval.yaml`](eval.yaml) | References the frozen set and runs it across the app combos below. `npm run eval`. |

`redteam.yaml` is regenerable and git-ignored; `redteam-cases.yaml` (the frozen set) is committed.

## The four combos (`eval.yaml`)

Each combo is one column, changing exactly **one** axis from the column before it, so the report
reads left-to-right as a security-maturity journey:

1. **Nova · naive · guard-off** — the vulnerable baseline; attacks land everywhere.
2. **Nova · naive · guard-on** — flip on the guardrail; its standalone effect on a vulnerable bot.
3. **Nova · hardened · guard-on** — add a proper rulebook prompt; the gap closes.
4. **Haiku · hardened · guard-on** — upgrade to a stronger model; capability scales, security holds.

## Plugins (5 security plugins, one per guardrail policy area)

| Plugin | What it attacks | Guardrail policy it exercises |
| --- | --- | --- |
| `prompt-extraction` | Leak the hidden system prompt | PROMPT_ATTACK content filter |
| `pii` | Coax out / fabricate customer PII | Sensitive-information policy |
| `hijacking` | Push off-topic / toward competitors | Topic policies |
| `excessive-agency` | Over-discount, unauthorized refunds | Topic policy (discount cap) |
| `harmful:hate` | Generate hateful/unsafe content | Content filters |

Strategies: `basic` (raw), `jailbreak`, `prompt-injection`. Test-count math:
`numTests: 2` per plugin, with the `pii` collection (4 subplugins) pinned to 1 →
base = (4 single plugins × 2) + (pii 4 subplugins × 1) = **12**, × 3 strategies = **36 frozen cases**.

## Independent judge (no self-grading)

Attacks are **generated** by Bedrock Claude Haiku 4.5 and every reply is **graded** by
Amazon Nova Pro — deliberately a different model from both the attacker and the bot under test
(Nova Lite), so the grading isn't self-scoring. Generation and grading both run on Bedrock, so
no OpenAI key is needed and everything stays on one AWS bill.

## Run it

```bash
npm install                  # installs promptfoo

# start the app first (in the llm-app repo):
#   cd ../llm-app && npm run dev      # must be live on localhost:3000

# one-time: generate the attacks and freeze them into redteam-cases.yaml
npm run generate
npm run freeze

# run the frozen attack set across all four combos:
npm run eval                 # = promptfoo eval -c eval.yaml --no-cache

# open the side-by-side report in the browser:
npm run view                 # = promptfoo view
```

To refresh the attack set later, re-run `npm run generate && npm run freeze` and commit the diff.
