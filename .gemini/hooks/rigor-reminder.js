const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    const llmRequest = input.llm_request;

    // Only inject if tools are involved (implying work is being done), 
    // or if the prompt length suggests a complex task.
    const tools = llmRequest.toolConfig?.functionCallingConfig?.allowedFunctionNames || [];
    const isCodingTask = tools.includes('write_file') || tools.includes('replace');

    if (isCodingTask) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "BeforeModel",
          llm_request: {
            messages: [
              {
                role: "system",
                content: `
CRITICAL REMINDER:
1. NO SHORTCUTS. Do not hardcode paths. Do not skip error handling.
2. PREFER "PATH B" (The Rigorous Way).
3. If you are writing an Adapter, YOU MUST HAVE A FAILING CONTRACT TEST FIRST.
4. Trust the Linter. Run 'npm run verify' after changes.
`
              }
            ]
          }
        }
      }));
    } else {
      process.exit(0);
    }
  } catch (e) {
    process.exit(0);
  }
});
