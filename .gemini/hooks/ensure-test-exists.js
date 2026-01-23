const fs = require('fs');
const path = require('path');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const toolInput = input.tool_input;
    const filePath = toolInput.file_path;
    
    // Only care about adapters
    if (!filePath || !filePath.includes('src/lib/adapters/') || !filePath.endsWith('.adapter.ts')) {
      process.exit(0);
    }

    const seamName = path.basename(filePath).replace('.adapter.ts', '');
    const testPath = path.join(process.cwd(), 'tests', 'contract', `${seamName}.test.ts`);

    if (!fs.existsSync(testPath)) {
      // We don't block (maybe they are writing them in parallel?), but we aggressively warn.
      console.log(JSON.stringify({
        systemMessage: `⚠️ SHORTCUT DETECTED: Adapter '${seamName}' has no Contract Test! \nSDD Rule: Contract Test must exist and fail before Adapter implementation.`
      }));
    } else {
       console.log(JSON.stringify({
        systemMessage: `✅ Integrity Check: Contract test found for '${seamName}'.`
      }));
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
