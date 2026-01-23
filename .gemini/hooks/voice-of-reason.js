const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const llmRequest = input.llm_request;
    const messages = llmRequest.messages || [];
    
    // The "Voice of Reason" V3.2: Wu-Bob Edition
    const seamProtocol = `
### 🧬 THE SEAM-DRIVEN DEVELOPMENT PROTOCOL 🧬
You are operating in a Strict Seam-Driven Development Environment. 

**THE CORE LOOP:**
1.  **PROBE:** Capture reality. Do not guess. Run the probe.
2.  **CONTRACT:** Define the schema. Update 'contracts/*.ts'.
3.  **MOCK:** Build the simulation. 'src/lib/mocks/*.ts' must use fixtures.
4.  **ADAPTER:** Implement the interface. 'src/lib/adapters/*.ts' must pass the test.

**ARCHITECTURAL MANDATES:**
*   **Program to the Interface:** Depend on the Contract, never the Implementation details.
*   **Path Blindness:** Never hardcode paths. Use 'path.join' and relative imports.
*   **Safe I/O:** No 'fs.writeFileSync'. Use the 'write_file' tool.

**FAILURE MODES (AVOID THESE):**
*   ❌ **Hallucination:** Importing modules that don't exist. -> *CHECK package.json.*
*   ❌ **Amnesia:** Forgetting the contract details. -> *READ the contract file.*
*   ❌ **Sloth:** Using 'any' or '// ...'. -> *SOLVE the type, WRITE the code.*
*   ❌ **Hubris:** Skipping the test run. -> *ALWAYS VERIFY.*

**COMMAND:**
Execute the user's request with **Maximum Rigor**.
`;

    const newMessages = JSON.parse(JSON.stringify(messages));
    const lastMsgIndex = newMessages.length - 1;
    
    if (lastMsgIndex >= 0) {
       newMessages[lastMsgIndex].content = newMessages[lastMsgIndex].content + "\n\n" + seamProtocol;
    }

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "BeforeModel",
        llm_request: {
          messages: newMessages
        }
      },
      systemMessage: "🧬 Seam-Driven Development Protocol Injected."
    }));

  } catch (e) {
    process.exit(0);
  }
});
