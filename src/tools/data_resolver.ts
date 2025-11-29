// @ts-nocheck
export async function resolverAgent(processed, env) {
	const { action_type, instruction } = processed;
	let finalAnswer = 'Resolver executed successfully, but no specific action was required.';

	// --- Start: Tool Emulation (This is where external tools are called) ---
	if (action_type === 'retrieve_data') {
		// We'll hardcode the CoinGecko API call for Bitcoin price for now
		const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';

		try {
			const response = await fetch(API_URL);
			const data = await response.json();

			const price = data.bitcoin.usd;

			// Use the LLM one last time to format the result nicely
			const llmFormatResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				prompt: `The user requested the current price of Bitcoin. The retrieved price is ${price} USD.
Using this price, craft a concise, professional final answer for the user. Do not include any JSON.`,
			});

			finalAnswer = llmFormatResponse.response.trim();

			// NEW: Save the result to KV for historical reference
			await env.MEMORY.put('last_bitcoin_price', finalAnswer);
			// --------------------------------------------------------
		} catch (e) {
			console.error('API Fetch Error:', e);
			finalAnswer = `I encountered an error while trying to retrieve the data for Bitcoin. Please try again. (Error: ${e.message})`;
		}
	}
	// --- End: Tool Emulation ---

	return {
		agent: 'resolver',
		result: finalAnswer,
		route: 'complete',
	};
}
