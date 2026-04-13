module.exports = {
	apps: [
		{
			name: 'ava-dash-frontend',
			script: 'pnpm',
			args: 'run dev',
			cwd: '/Users/markgrenville/Projects/ava-dash',
			watch: false,
			autorestart: true,
			max_restarts: 10,
			env: {
				NODE_ENV: 'development'
			}
		},
		{
			name: 'ava-dash-emulators',
			script: './scripts/start-emulators.sh',
			cwd: '/Users/markgrenville/Projects/ava-dash',
			interpreter: '/bin/bash',
			watch: false,
			autorestart: true,
			max_restarts: 5,
			kill_timeout: 10000,
			env: {
				NODE_ENV: 'development'
			}
		},
		{
			name: 'ava-dash-functions-watch',
			script: 'pnpm',
			args: 'run build:watch',
			cwd: '/Users/markgrenville/Projects/ava-dash/functions',
			watch: false,
			autorestart: true,
			max_restarts: 10,
			env: {
				NODE_ENV: 'development'
			}
		},
		{
			name: 'ava-dash-backup',
			script: './scripts/backup-emulator.sh',
			cwd: '/Users/markgrenville/Projects/ava-dash',
			interpreter: '/bin/bash',
			watch: false,
			autorestart: true,
			max_restarts: 10,
			env: {
				NODE_ENV: 'development'
			}
		}
	]
};
