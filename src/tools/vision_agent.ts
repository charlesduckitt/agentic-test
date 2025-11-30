// src/tools/vision_agent.ts
// @ts-nocheck
import { safeAiRun } from './ai_client';

export async function visionAgentFunction(imageData, query, env) {
	const prompt = `Analyze the image. This image contains a database schema definition, likely from a legacy system. 
    Extract and list all column names, their data types, and any accompanying constraint notes (like NOT NULL or Primary Key) in a clean, plain text block. 
    Do not add commentary or JSON formatting. Focus only on the structured list.`;

	try {
		// Note: Cloudflare expects the image data as a Uint8Array,
		// so we use Buffer.from(imageData, 'base64') and then Array.from
		const response = await safeAiRun(env, '@cf/unum/uform-gen-qwen-vl', {
			prompt: prompt,
			image: Array.from(Buffer.from(imageData, 'base64')),
		});

		return {
			extracted_text: response.description.trim(),
			success: true,
		};
	} catch (e) {
		console.error('Vision Agent Error:', e);
		return {
			extracted_text: `Error during image processing: ${e.message}. Ensure the AI binding is correct.`,
			success: false,
		};
	}
}
