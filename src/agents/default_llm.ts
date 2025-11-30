// src/agents/default_llm.ts
// @ts-nocheck

export async function defaultLLMAgent(message, env) {
	// This is a placeholder for a general-purpose AI response if no specific tool is needed.
	const prompt = `You are a helpful assistant. Answer the user's request. Request: ${message}`;

	try {
		const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			prompt: prompt,
		});

		return {
			final_answer: response.response,
			success: true,
		};
	} catch (e) {
		return {
			final_answer: `LLM Error: Could not process request. ${e.message}`,
			success: false,
		};
	}
}
