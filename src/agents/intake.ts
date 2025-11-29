// @ts-nocheck
export async function intakeAgent(message, env) {
	// 1. Ask the model to summarise and decide routing
	const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		prompt: `You are the Intake Agent.
Input: "${message}"
Produce ONLY a JSON object with:
- summary: one sentence summary of the issue
- route: which agent should handle it next ("action" or "resolver")

JSON:`,
	});

	// 2. Clean up the response string before parsing
	let jsonString = response.response; // response is an object, get the string

	// Remove markdown code fences and surrounding whitespace
	jsonString = jsonString.trim().replace(/^```json\s*|```\s*$/g, '');

	let parsed;
	try {
		parsed = JSON.parse(jsonString);
	} catch (e) {
		// If parsing fails even after cleanup, throw a helpful error
		console.error('Failed to parse JSON from AI response:', jsonString);
		throw new Error(`AI JSON Parsing Failed. Check agent prompt/output. Original Error: ${e.message}`);
	}

	// 3. Return the structured output
	return {
		agent: 'intake',
		received: message,
		summary: parsed.summary,
		route: parsed.route,
	};
}
