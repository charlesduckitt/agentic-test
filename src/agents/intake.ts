// src/agents/intake.ts - Corrected for UDAA Structured Payload Routing
// @ts-nocheck

// Assuming you have a basic function signature like this:
export async function intakeAgent(message, env) {
	// Check if the input is a structured JSON object (from the new frontend UDAA flow)
	const isStructured = typeof message === 'object' && message.context;

	// --- UDAA Inference/Execution Route ---
	if (isStructured && (message.context === 'UDAA_INFER' || message.context === 'UDAA_EXECUTE')) {
		return {
			agent: 'intake',
			received: message.query,
			full_payload: message, // CRITICAL: Pass the full structured payload
			summary: `UDAA action request for context: ${message.context}.`,
			route: 'udaa_action',
		};
	}

	// --- Standard Q&A Routing (Fallback for simple text queries) ---
	// If it's not a structured UDAA payload, assume it's a simple text query.

	const lowerCaseMessage = (typeof message === 'string' ? message : '').toLowerCase();

	if (lowerCaseMessage.includes('data')) {
		return {
			agent: 'intake',
			received: message,
			summary: 'Routing to data resolver for database query.',
			route: 'data_resolver',
		};
	} else if (lowerCaseMessage.includes('action') || lowerCaseMessage.includes('create')) {
		return {
			agent: 'intake',
			received: message,
			summary: 'Routing to data action for database modification.',
			route: 'data_action',
		};
	}

	// Default route for any other query
	return {
		agent: 'intake',
		received: message,
		summary: 'Routing to a general LLM agent for response generation.',
		route: 'default_llm',
	};
}
