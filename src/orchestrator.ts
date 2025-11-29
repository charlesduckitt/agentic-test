// @ts-nocheck
import { intakeAgent } from './agents/intake';
import { actionAgent } from './agents/action';
import { resolverAgent } from './agents/resolver';

export async function runPipeline(userMessage, env) {
	// <--- ADD env here

	const intake = await intakeAgent(userMessage, env); // <--- Pass env

	const action = await actionAgent(intake.summary, env); // <--- Pass env

	const resolver = await resolverAgent(action.processed, env); // <--- Pass env

	return {
		intake,
		action,
		resolver,
		final: resolver.result,
	};
}
