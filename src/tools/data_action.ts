// @ts-nocheck
import { safeAiRun } from './ai_client';

export async function dataActionAgent(summary, env) {
	// Ask the model to analyze the summary and determine the required action
	const response = await safeAiRun(env, '@cf/meta/llama-3.1-8b-instruct', {
		prompt: `You are the Action Agent.
Input Summary: "${summary}"
Produce ONLY a JSON object with:
- action_type: a verb phrase describing the core action (e.g., "retrieve_data", "perform_calculation", "draft_email")
- instruction: the detailed steps or data required to execute the action
- route: always set to "resolver"

JSON:`,
	});

	let jsonString = response.response;
	jsonString = jsonString.trim().replace(/^```json\s*|```\s*$/g, '');

	let parsed;
	try {
		parsed = JSON.parse(jsonString);
	} catch (e) {
		console.error('Failed to parse JSON from Action Agent:', jsonString);
		throw new Error(`Action Agent JSON Parsing Failed. Original Error: ${e.message}`);
	}

	return {
		agent: 'action',
		processed: parsed,
		route: parsed.route,
	};
}
