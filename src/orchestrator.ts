// @ts-nocheck
import { intakeAgent } from './agents/intake';
import { actionAgent } from './agents/action';
import { resolverAgent } from './agents/resolver';

export async function runPipeline(userMessage, env) {
	const intake = await intakeAgent(userMessage, env);

	// NEW: Check for the memory_resolver route
	if (intake.route === 'memory_resolver') {
		return {
			intake,
			final: intake.memory_result, // Immediately return the stored result
		};
	}
	// ------------------------------------------

	const action = await actionAgent(intake.summary, env);

	const resolver = await resolverAgent(action.processed, env);

	return {
		intake,
		action,
		resolver,
		final: resolver.result,
	};
}
c;
