const { execSync } = require('child_process');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const toolInput = input.tool_input;
    
    // Determine content to check based on tool type
    let content = "";
    if (input.tool_name === "write_file") {
      content = toolInput.content;
    } else if (input.tool_name === "replace") {
      content = toolInput.new_string;
    }

    if (!content) {
      process.exit(0);
    }

    // Regex for 'as any' or 'as unknown as'
    // Matches: " as any", ": any", "as unknown as any"
    // We want to be strict but allow comments to bypass: // allowed-any
    const anyPattern = /\bas\s+any\b|:\s*any\b|\bas\s+unknown\s+as\s+any\b/;
    
    if (anyPattern.test(content)) {
      console.log(JSON.stringify({
        decision: "deny",
        reason: "STRICT MODE: 'as any' is forbidden. No exceptions. Use proper typing.",
        systemMessage: "🛡️ Blocked usage of 'any' type (Zero Tolerance)."
      }));
      process.exit(2);
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
