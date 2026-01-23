const path = require('path');
const { execSync } = require('child_process');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    if (chunks.length === 0) return;
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const file_path = input.tool_input?.file_path;

    if (!file_path) process.exit(0);

    let seam = null;
    const basename = path.basename(file_path);
    const parts = file_path.split(path.sep);
    
    // Logic to extract seam name based on standard paths
    if (file_path.includes('contracts') && basename.endsWith('.contract.ts')) {
      seam = basename.replace('.contract.ts', '');
    } else if (parts.includes('fixtures')) {
      const idx = parts.indexOf('fixtures');
      if (parts[idx + 1]) seam = parts[idx + 1];
    } else if (file_path.includes('adapters') && basename.endsWith('.adapter.ts')) {
      seam = basename.replace('.adapter.ts', '');
    } else if (file_path.includes('mocks') && basename.endsWith('.mock.ts')) {
      seam = basename.replace('.mock.ts', '');
    } else if (file_path.includes('tests') && basename.endsWith('.test.ts')) {
      seam = basename.replace('.test.ts', '');
    }

    if (seam) {
      // Don't spam if it's not a real seam (e.g. some utility file)
      // sdd-check requires the contract to exist roughly, or it will fail saying "contract does not exist"
      // which is fine.
      console.log(`\n🔍 Running SDD Check for seam: ${seam}`);
      execSync(`npx ts-node scripts/sdd-check.ts ${seam}`, { stdio: 'inherit' });
    }
  } catch (e) {
    // Ignore errors, just logging.
    process.exit(0);
  }
});
