const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const toolInput = input.tool_input;
    
    let content = "";
    if (input.tool_name === "write_file") content = toolInput.content;
    else if (input.tool_name === "replace") content = toolInput.new_string;
    
    if (!content) process.exit(0);

    // Laziness Signatures
    const signsOfSloth = [
      { pattern: /\/\/\s*\.\.\./, name: "Code Omission (// ...)" },
      { pattern: /\/\*\s*\.\.\.\s*\*\//, name: "Code Omission (/* ... */)" },
      { pattern: /TODO:.*implement.*/i, name: "Lazy TODO ('implement later')" },
      { pattern: /throw new Error\(['"]Not implemented['"]\)/i, name: "Not Implemented Stub" },
      { pattern: /console\.log\(['"]TODO['"]\)/i, name: "Console Log TODO" }
    ];

    for (const sign of signsOfSloth) {
      if (sign.pattern.test(content)) {
        console.log(JSON.stringify({
          decision: "deny",
          reason: `ANTI-SLOTH ACTIVATED: Detected ${sign.name}. You are attempting to take a shortcut. The Mandate requires FULL implementation. No placeholders.`,
          systemMessage: `🦥 Sloth Detected: ${sign.name}. Write the real code.`
        }));
        process.exit(2);
      }
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
