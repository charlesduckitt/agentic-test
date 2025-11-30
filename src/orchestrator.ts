// @ts-nocheck
import { intakeAgent } from './agents/intake';
import { actionAgent as dataActionAgent } from './tools/data_action'; // Renamed import
import { resolverAgent as dataResolverAgent } from './tools/data_resolver'; // Renamed import

export async function runPipeline(userMessage, env) {
	const intake = await intakeAgent(userMessage, env);

	// Handle the Memory Shortcut
	if (intake.route === 'memory_resolver') {
		return {
			intake,
			final: intake.memory_result,
		};
	}

	// Handle Dynamic Routing
	if (intake.route === 'data_action') {
		const action = await dataActionAgent(intake.summary, env);
		const resolver = await dataResolverAgent(action.processed, env);
		return {
			intake,
			action,
			resolver,
			final: resolver.result,
		};
	}

	// You would add more routes here (e.g., if (intake.route === "email_action") { ... }
	// Handle direct resolver route (LLM sends "resolver")
	if (intake.route === 'resolver') {
		const resolver = await dataResolverAgent(intake.summary, env);
		return {
			intake,
			resolver,
			final: resolver.result,
		};
	}

	// Default Fallback
	return {
		intake,
		final: `Error: Intake Agent routed to unknown path: ${intake.route}`,
	};
}
