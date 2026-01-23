const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const filePath = input.tool_input?.file_path;

    if (!filePath || !filePath.endsWith('.ts')) {
      process.exit(0);
    }

    // Run eslint --fix
    // Using npx can be slow, if we know where eslint is we can call it directly,
    // but npx is safer for compatibility.
    // We suppress output to avoid cluttering the transcript unless it fails hard.
    try {
      execSync(`npx eslint --fix "${filePath}"`, { stdio: 'ignore', timeout: 10000 });
      console.log(JSON.stringify({
        systemMessage: `✨ Auto-linted ${path.basename(filePath)}`
      }));
    } catch (lintError) {
      // If linting fails, we don't block the tool usage (the file is already written),
      // but we let the user know.
      console.log(JSON.stringify({
        systemMessage: `⚠️ Auto-lint failed for ${path.basename(filePath)}`
      }));
    }

  } catch (e) {
    process.exit(0);
  }
});
