const fs = require('fs');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const toolInput = input.tool_input;
    const filePath = toolInput.file_path;
    
    // Only care about mocks
    if (!filePath || !filePath.includes('src/lib/mocks/') || !filePath.endsWith('.mock.ts')) {
      process.exit(0);
    }

    // Get the content being written
    let content = "";
    if (input.tool_name === "write_file") {
      content = toolInput.content;
    } else if (input.tool_name === "replace") {
      content = toolInput.new_string;
    }

    if (!content) process.exit(0);

    // Heuristic: specific to this project's "No Fantasy Mocks" rule.
    // A valid mock must load data from disk (fixtures).
    // We look for 'fs.readFile', 'require(', 'import ... .json', or usage of a helper like 'loadFixture'.
    
    const hasDataLoading = 
      content.includes('fs.readFileSync') || 
      content.includes('fs.promises.readFile') || 
      content.includes('require(') || 
      /import\s+.*\s+from\s+['"].*\.json['"]/.test(content) ||
      content.includes('loadFixture'); // Assuming a helper exists or is created

    if (!hasDataLoading) {
      console.log(JSON.stringify({
        decision: "deny",
        reason: "SDD VIOLATION: 'Fantasy Mock' detected. Mocks must load deterministic data from 'fixtures/', they cannot return hardcoded literals. Load the fixture JSON.",
        systemMessage: "🛑 Blocked 'Fantasy Mock' (No fixture loading detected)."
      }));
      process.exit(2);
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
