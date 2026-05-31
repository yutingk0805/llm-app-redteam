// Freeze the generated red-team attacks into a stable, reusable file.
//
// `promptfoo redteam generate` writes a full config (redteam.yaml) whose `tests`
// key holds the generated attacks. This script extracts ONLY that list into
// redteam-cases.yaml, which eval.yaml references via `tests: file://...`.
//
// Why: `promptfoo eval` never regenerates, so freezing the attacks once lets
// every run (across different model/prompt/guardrail combos) share the exact
// same attack set — the only way the columns are truly comparable.
//
//   Usage: node scripts/freeze.js [sourceConfig=redteam.yaml] [out=redteam-cases.yaml]

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const src = process.argv[2] || "redteam.yaml";
const out = process.argv[3] || "redteam-cases.yaml";

if (!fs.existsSync(src)) {
  console.error(`✗ ${src} not found. Run \`npm run generate\` first.`);
  process.exit(1);
}

const doc = yaml.load(fs.readFileSync(src, "utf8"));
const tests = doc && doc.tests;
if (!Array.isArray(tests) || tests.length === 0) {
  console.error(`✗ No \`tests\` array found in ${src}.`);
  process.exit(1);
}

const header =
  `# FROZEN red-team attack set — ${tests.length} cases, frozen ${new Date().toISOString().slice(0, 10)}.\n` +
  `# Generated from ${path.basename(src)}; do NOT hand-edit. Keeping these identical is\n` +
  `# what makes runs across different model/prompt/guardrail combos comparable.\n` +
  `# To refresh: \`npm run generate\` then \`npm run freeze\`, and commit the diff.\n`;

fs.writeFileSync(out, header + yaml.dump(tests, { lineWidth: -1 }));
console.log(`✓ Froze ${tests.length} attacks -> ${out}`);
