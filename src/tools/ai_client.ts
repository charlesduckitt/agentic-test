// @ts-nocheck
// Small wrapper around env.AI.run that estimates token usage and truncates
// prompts/messages when they would exceed the model's context window.
export async function safeAiRun(env, model, options = {}) {
	// Conservative default context window; adjust per-model if known
	const MODEL_CONTEXT_TOKENS = 7968;

	// Reserve some tokens for the model's output (use provided max_tokens if present)
	const reservedOutput = options.max_tokens ? Number(options.max_tokens) : 512;
	const allowedInputTokens = Math.max(0, MODEL_CONTEXT_TOKENS - reservedOutput);

	function estimateTokensFromString(s = '') {
		// Very rough heuristic: 4 characters per token
		return Math.ceil((s || '').length / 4);
	}

	let estimated = 0;

	if (Array.isArray(options.messages)) {
		estimated = options.messages.reduce((acc, m) => acc + estimateTokensFromString(JSON.stringify(m)), 0);
	} else if (typeof options.prompt === 'string') {
		estimated = estimateTokensFromString(options.prompt);
	}

	if (estimated > allowedInputTokens) {
		// Truncate intelligently
		const allowedChars = Math.floor(allowedInputTokens * 4);

		if (Array.isArray(options.messages)) {
			// Try truncating the last user/system message that has content
			const msgs = options.messages.map((m) => ({ ...m }));
			for (let i = msgs.length - 1; i >= 0; i--) {
				const content = msgs[i].content || msgs[i].text || '';
				if (content && content.length > 0) {
					msgs[i].content = content.slice(0, allowedChars) + '\n\n[TRUNCATED]';
					options = { ...options, messages: msgs };
					break;
				}
			}
		} else if (typeof options.prompt === 'string') {
			options = { ...options, prompt: options.prompt.slice(0, allowedChars) + '\n\n[TRUNCATED]' };
		}
	}

	// Forward to the actual AI run
	return await env.AI.run(model, options);
}
