// src/orchestrator.ts - CORRECTED FOR NAMING CONSISTENCY AND UDAA FLOW
// @ts-nocheck

import { intakeAgent } from './agents/intake';
import { udaaAction } from './tools/udaa_action';
// CRITICAL FIX: Use aliasing to import the functions with the name the orchestrator needs
import { defaultLLMAgent } from './agents/default_llm';

export async function runPipeline(message, env) {
	// 1. Intake Agent: Determine the route
	const intake = await intakeAgent(message, env);

	let agentResult;

	// 2. Handle UDAA Agent Route (Schema Definition/Execution)
	if (intake.route === 'udaa_action') {
		// Pass the full payload (which contains context, schema, image_data)
		const udaaResult = await udaaAction(intake.full_payload, env);

		// CRITICAL: Human-in-the-Loop Stop Check
		if (udaaResult.agent_state === 'SCHEMA_PROPOSED') {
			return {
				intake,
				udaaResult,
				final: udaaResult.final_answer,
				action_required: 'VALIDATE_SCHEMA',
			};
		}

		// If execution is complete, return the final result
		agentResult = udaaResult;
	}
	// 3. Handle other routes (existing logic)
	else if (intake.route === 'data_action') {
		// Note: dataAction is aliased to actionAgent from data_action.ts
		agentResult = await dataAction(intake.received, env);
	} else if (intake.route === 'data_resolver') {
		// Note: dataResolverAgent is aliased to resolverAgent from data_resolver.ts
		agentResult = await dataResolverAgent(agentResult.processed, env); // Assumes processed data from previous agent
	} else {
		// Handle the default LLM route
		agentResult = await defaultLLMAgent(intake.received, env);
	}

	// Final consolidated response
	return {
		intake,
		agentResult,
		final: agentResult.final_answer || agentResult.result,
	};
}
