// @ts-nocheck
import { runPipeline } from './orchestrator';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// --- Handle CORS preflight ---
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': 'https://UDAA.thync.online',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type',
				},
			});
		}

		if (url.pathname === '/run') {
			try {
				const data = await request.json();
				const output = await runPipeline(data.message, env); // <--- existing logic
				return new Response(JSON.stringify(output, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': 'https://UDAA.thync.online',
						'Access-Control-Allow-Methods': 'POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
				});
			} catch (err) {
				return new Response(JSON.stringify({ error: 'Failed to process request', details: err.message }), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': 'https://UDAA.thync.online',
						'Access-Control-Allow-Methods': 'POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type',
					},
					status: 500,
				});
			}
		}

		return new Response('MASA ready. Use POST /run', {
			headers: {
				'Access-Control-Allow-Origin': 'https://UDAA.thync.online',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
			},
		});
	},
};
