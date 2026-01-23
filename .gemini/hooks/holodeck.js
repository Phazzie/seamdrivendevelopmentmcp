const fs = require('fs');
const path = require('path');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const llmRequest = input.llm_request;
    const messages = llmRequest.messages || [];
    const recentText = messages.slice(-5).map(m => m.content).join('\n');
    
    const seams = new Set();
    const projectDir = process.cwd();

    // Strategy 1: Regex for file paths (Strict & Accurate)
    // Matches: contracts/foo.contract.ts, fixtures/foo/bar.json, src/lib/adapters/foo.adapter.ts, etc.
    const filePatterns = [
      /contracts\/([a-zA-Z0-9_-]+)\.contract\.ts/g,
      /fixtures\/([a-zA-Z0-9_-]+)\/g,
      /probes\/([a-zA-Z0-9_-]+)\.probe\.ts/g,
      /adapters\/([a-zA-Z0-9_-]+)\.adapter\.ts/g,
      /mocks\/([a-zA-Z0-9_-]+)\.mock\.ts/g,
      /tests\/contract\/([a-zA-Z0-9_-]+)\.test\.ts/g
    ];

    filePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(recentText)) !== null) {
        seams.add(match[1]);
      }
    });

    // Strategy 2: Explicit "Context" or "Seam" mention
    // Matches: "seam: foo", "seam foo", "context: foo"
    const keywordPattern = /(?:seam|context)[:\s]+([a-zA-Z0-9_-]+)/gi;
    let keyMatch;
    while ((keyMatch = keywordPattern.exec(recentText)) !== null) {
      // Filter out common words to avoid false positives if possible, 
      // but "seam: foo" is usually intentional.
      seams.add(keyMatch[1].toLowerCase());
    }

    if (seams.size === 0) {
      process.exit(0);
    }

    let injections = [];
    for (const seam of seams) {
      const contractPath = path.join(projectDir, 'contracts', `${seam}.contract.ts`);
      if (fs.existsSync(contractPath)) {
        const content = fs.readFileSync(contractPath, 'utf-8');
        // Inject the full contract
        injections.push(`
// --- 🧠 HOLODECK AUTO-INJECTION ---
// SEAM DETECTED: ${seam}
// FILE: contracts/${seam}.contract.ts
${content}
// ----------------------------------
`);
      }
    }

    if (injections.length === 0) {
      process.exit(0);
    }

    const newMessages = JSON.parse(JSON.stringify(messages));
    const lastMsgIndex = newMessages.length - 1;
    if (lastMsgIndex >= 0) {
       newMessages[lastMsgIndex].content = injections.join('\n') + "\n\n" + newMessages[lastMsgIndex].content;
    }

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "BeforeModel",
        llm_request: {
          messages: newMessages
        }
      },
      systemMessage: `🧠 Holodeck auto-loaded contracts for: ${Array.from(seams).join(', ')}`
    }));

  } catch (e) {
    process.exit(0);
  }
});