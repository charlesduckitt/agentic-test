// src/tools/data_resolver.ts - Corrected Export for Orchestrator
// @ts-nocheck

/**
 * The Resolver Agent processes the instruction or processed output from a previous
 * agent (like the Action Agent) and attempts to produce the final user-facing answer.
 * In a database scenario, this would typically execute a query and format the result.
 */
export async function dataResolverAgent(processed, env) {
	// <-- CRITICAL FIX: Renamed to match orchestrator
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
