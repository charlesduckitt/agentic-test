// @ts-nocheck
export async function resolverAgent(processed, env) {
	const instruction = JSON.stringify(processed);

	// Ask the model to execute the action and produce the final result
	const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		prompt: `You are the Resolver Agent.
Input Action: ${instruction}
Analyze the action and instruction, then execute the required logic (for now, just summarize the final plan).
Produce ONLY a JSON object with:
- final_answer: the resulting output for the user
- route: always set to "complete"

JSON:`,
	});

	let jsonString = response.response;
	jsonString = jsonString.trim().replace(/^```json\s*|```\s*$/g, '');

	let parsed;
	try {
		parsed = JSON.parse(jsonString);
	} catch (e) {
		console.error('Failed to parse JSON from Resolver Agent:', jsonString);
		throw new Error(`Resolver Agent JSON Parsing Failed. Original Error: ${e.message}`);
	}

	return {
		agent: 'resolver',
		result: parsed.final_answer,
		route: parsed.route,
	};
}
