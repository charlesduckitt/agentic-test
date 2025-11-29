// @ts-nocheck
export async function intakeAgent(message, env) {
	// --- Start: Memory Check/Tool Emulation ---

	// 1. Check for specific historical queries (e.g., "last price")
	if (message.toLowerCase().includes('bitcoin') && (message.toLowerCase().includes('last') || message.toLowerCase().includes('previous'))) {
		const lastPrice = await env.MEMORY.get('last_bitcoin_price');

		if (lastPrice) {
			// If a history exists, immediately resolve the request
			return {
				agent: 'intake',
				received: message,
				summary: 'User requested the last retrieved Bitcoin price from memory.',
				route: 'memory_resolver', // NEW ROUTE for immediate resolution
				memory_result: lastPrice, // Pass the result directly
			};
		}
	}

	// --- End: Memory Check/Tool Emulation ---

	// 2. Fallback to LLM for all other queries
	const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		prompt: `You are the Intake Agent.
Input: "${message}"
Produce ONLY a JSON object with:
- summary: one sentence summary of the issue
- route: which agent should handle it next ("action" or "resolver")

JSON:`,
	});

	// ... (rest of the robust parsing logic remains the same) ...
	let jsonString = response.response;
	jsonString = jsonString.trim().replace(/^```json\s*|```\s*$/g, '');

	let parsed;
	try {
		parsed = JSON.parse(jsonString);
	} catch (e) {
		console.error('Failed to parse JSON from AI response:', jsonString);
		throw new Error(`AI JSON Parsing Failed. Check agent prompt/output. Original Error: ${e.message}`);
	}

	// 3. Return the structured output from LLM
	return {
		agent: 'intake',
		received: message,
		summary: parsed.summary,
		route: parsed.route,
	};
}
