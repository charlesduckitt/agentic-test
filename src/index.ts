// @ts-nocheck
import { runPipeline } from './orchestrator';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === '/run') {
			const data = await request.json();
			const output = await runPipeline(data.message);
			return new Response(JSON.stringify(output, null, 2), {
				headers: { 'content-type': 'application/json' },
			});
		}

		return new Response('MASA ready. Use POST /run');
	},
};
