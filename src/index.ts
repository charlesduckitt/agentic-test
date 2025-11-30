// src/index.ts - CORRECTED CORS

// @ts-nocheck
import { runPipeline } from './orchestrator';

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
	'https://udaa.thync.online', // <-- YOUR PRODUCTION FRONTEND (Crucial)
	'https://worker.thync.online', // <-- Worker's own domain (Good practice)
	'http://localhost:5173', // Common Vite local host
	'http://127.0.0.1:5173', // Secondary local host
];

// Function to determine the correct origin to return in the header
function getCorsHeaders(request) {
	const origin = request.headers.get('Origin');
	// Allow the specific origin if it's in the list, otherwise default to the primary frontend
	const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
		'Access-Control-Max-Age': '86400', // Cache preflight requests
	};
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const corsHeaders = getCorsHeaders(request);

		// --- Handle CORS preflight ---
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		if (url.pathname === '/run') {
			try {
				const data = await request.json();
				const output = await runPipeline(data.message, env);

				return new Response(JSON.stringify(output, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				});
			} catch (err) {
				console.error('Worker Execution Error:', err.message);

				return new Response(
					JSON.stringify({
						error: 'Failed to process request',
						// This is where we look for the missing binding error!
						details: err.message,
					}),
					{
						headers: {
							'Content-Type': 'application/json',
							...corsHeaders,
						},
						status: 500,
					}
				);
			}
		}

		return new Response('MASA ready. Use POST /run', { headers: corsHeaders });
	},
};
