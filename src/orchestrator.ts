// src/orchestrator.ts - CORRECTED FOR MISSING IMPORTS
// @ts-nocheck

import { intakeAgent } from './agents/intake';
import { udaaActionAgent } from './tools/udaa_action';
// CRITICAL FIX: Re-added the missing imports for the action and resolver tools
import { dataActionAgent } from './tools/data_action';
import { dataResolverAgent } from './tools/data_resolver';
import { defaultLLMAgent } from './agents/default_llm';

export async function runPipeline(message, env) {
	// 1. Intake Agent: Determine the route
	const intake = await intakeAgent(message, env);

	let agentResult;

	// 2. Handle UDAA Agent Route (Schema Definition/Execution)
	if (intake.route === 'udaa_action') {
		// Pass the full payload (which contains context, schema, image_data)
		const udaaResult = await udaaActionAgent(intake.full_payload, env);

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
		// We use dataActionAgent here, assuming data_action.ts exports this name
		agentResult = await dataActionAgent(intake.received, env);
		// NOTE: If the output of dataActionAgent has a route, you should process the next step here,
		// but for now, we follow the structure you provided.
	} else if (intake.route === 'data_resolver') {
		// This is where the crash was. It now correctly calls the imported function.
		// NOTE: dataResolverAgent receives input from the previous step.
		agentResult = await dataResolverAgent(intake.received, env);
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
