#!/usr/bin/env npx tsx

const API_BASE = 'http://localhost:7510/ava-dash/us-central1/api';

async function request(method: string, path: string, body?: unknown, apiKey?: string) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const json = await res.json();
	console.log(`\n${method} ${path} → ${res.status}`);
	console.log(JSON.stringify(json, null, 2));
	return json;
}

async function main() {
	const cmd = process.argv[2];
	const apiKey = process.env.AVA_API_KEY;

	if (!cmd) {
		console.log('Ava Dashboard API Test CLI');
		console.log('========================');
		console.log('');
		console.log('Set AVA_API_KEY env var first, then run:');
		console.log('');
		console.log('  npx tsx scripts/test-api.ts health');
		console.log('  npx tsx scripts/test-api.ts list-projects');
		console.log('  npx tsx scripts/test-api.ts create-project');
		console.log('  npx tsx scripts/test-api.ts get-project <id>');
		console.log('  npx tsx scripts/test-api.ts list-cron');
		console.log('  npx tsx scripts/test-api.ts create-cron');
		console.log('  npx tsx scripts/test-api.ts activity');
		console.log('  npx tsx scripts/test-api.ts create-key <name>');
		return;
	}

	switch (cmd) {
		case 'health':
			await request('GET', '/health');
			break;

		case 'list-projects':
			await request('GET', '/projects', undefined, apiKey);
			break;

		case 'create-project':
			await request('POST', '/projects', {
				title: 'Test Project — ' + new Date().toISOString().slice(11, 19),
				description: 'Created by test-api.ts CLI',
				status: 'active',
				tasks: [
					{ title: 'Research phase', description: 'Gather information' },
					{ title: 'Analysis phase', description: 'Process the data' },
					{ title: 'Report phase', description: 'Compile findings' },
				],
			}, apiKey);
			break;

		case 'get-project':
			if (!process.argv[3]) { console.log('Usage: get-project <id>'); return; }
			await request('GET', `/projects/${process.argv[3]}`, undefined, apiKey);
			break;

		case 'list-cron':
			await request('GET', '/cron-jobs', undefined, apiKey);
			break;

		case 'create-cron':
			await request('POST', '/cron-jobs', {
				name: 'Test Cron — ' + new Date().toISOString().slice(11, 19),
				description: 'Created by test-api.ts CLI',
				schedule: '0 */6 * * *',
			}, apiKey);
			break;

		case 'activity':
			await request('GET', '/activity', undefined, apiKey);
			break;

		case 'create-key':
			await request('POST', '/api-keys', {
				name: process.argv[3] || 'test-key',
			}, apiKey);
			break;

		default:
			console.log(`Unknown command: ${cmd}`);
	}
}

main().catch(console.error);
