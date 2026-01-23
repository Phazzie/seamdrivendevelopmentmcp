const { execSync } = require('child_process');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    if (chunks.length === 0) return;
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const file_path = input.tool_input?.file_path;

    // Only check if modifying src/ (skipping tests usually, but verify-mandates might check tests too? No, mainly src code)
    if (!file_path || !file_path.includes('src/')) {
      process.exit(0);
    }

    // Run the mandate script.
    execSync('npx ts-node scripts/verify-mandates.ts', { stdio: 'inherit' });
  } catch (error) {
    // verify-mandates exits with 1 on failure.
    // We catch it so the hook doesn't crash the CLI, but the output is preserved.
    // We exit 0 to allow the agent to proceed (but hopefully see the error).
    process.exit(0);
  }
});
