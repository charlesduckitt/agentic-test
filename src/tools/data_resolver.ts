// @ts-nocheck
export async function resolverAgent(processed, env) {
	// Ask the LLM to produce a final resolved answer
	const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		prompt: `
You are the Resolver Agent.
Your job is to produce the final answer to the user's question.
Input: "${processed}"
Respond with the final answer only.
`,
	});

	const finalAnswer = response.response?.trim() || 'Unable to resolve.';

	return {
		agent: 'resolver',
		result: finalAnswer,
		route: 'complete',
	};
}
