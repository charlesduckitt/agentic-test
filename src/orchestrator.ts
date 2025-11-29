// @ts-nocheck
import { intakeAgent } from './agents/intake';
import { actionAgent } from './agents/action';
import { resolverAgent } from './agents/resolver';

export async function runPipeline(userMessage) {
	const intake = await intakeAgent(userMessage);

	const action = await actionAgent(intake.summary);

	const resolver = await resolverAgent(action.processed);

	return {
		intake,
		action,
		resolver,
		final: resolver.result,
	};
}
