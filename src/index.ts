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
				let payload;

				const contentType = request.headers.get('content-type') || '';
				if (contentType.includes('multipart/form-data')) {
					// Handle form submissions with file uploads (from the frontend)
					const form = await request.formData();
					const msg = form.get('message') || '';
					const file = form.get('file') || form.get('image') || null;
					if (file && typeof file.arrayBuffer === 'function') {
						const buf = await file.arrayBuffer();
						// Convert ArrayBuffer to base64 safely
						function arrayBufferToBase64(buffer) {
							let binary = '';
							const bytes = new Uint8Array(buffer);
							const chunkSize = 0x8000;
							for (let i = 0; i < bytes.length; i += chunkSize) {
								binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
							}
							return btoa(binary);
						}
						const base64 = arrayBufferToBase64(buf);
						// Create a structured payload that the intake agent recognizes for UDAA flow
						payload = { context: 'UDAA_INFER', query: msg, image_data: base64 };
					} else {
						payload = msg;
					}
				} else {
					// Default: expect JSON body
					const data = await request.json();
					payload = data.message !== undefined ? data.message : data;
				}

				const output = await runPipeline(payload, env);

				return new Response(JSON.stringify(output, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						...corsHeaders,
					},
				});
			} catch (err) {
				console.error('Worker Execution Error:', err.message);
				console.error('Full Error:', err);

				return new Response(
					JSON.stringify({
						error: 'Failed to process request',
						// This is where we look for the missing binding error!
						details: err.message,
						stack: err.stack,
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
