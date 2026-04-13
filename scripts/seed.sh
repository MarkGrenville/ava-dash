#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:7510/ava-dash/us-central1/api"

echo "[seed] Checking API health..."
if ! curl -sf "$API_BASE/health" > /dev/null 2>&1; then
	echo "[seed] ERROR: API not reachable at $API_BASE"
	echo "[seed] Make sure emulators are running."
	exit 1
fi

echo "[seed] API is healthy."
echo "[seed] Note: To seed data, first create a user in the Auth emulator"
echo "[seed] (http://localhost:7514 → Authentication), then generate an API key"
echo "[seed] from the admin dashboard and use it to POST to the API."
echo ""
echo "Example: Create a project with tasks:"
echo "  curl -X POST $API_BASE/projects \\"
echo "    -H 'Authorization: Bearer YOUR_API_KEY' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{"
echo "      \"title\": \"Research competitor pricing\","
echo "      \"description\": \"Scrape and analyze competitor websites\","
echo "      \"status\": \"active\","
echo "      \"tasks\": ["
echo "        {\"title\": \"Identify target websites\", \"description\": \"Find top 5 competitors\"},"
echo "        {\"title\": \"Scrape pricing data\", \"description\": \"Extract prices from each site\"},"
echo "        {\"title\": \"Compile report\", \"description\": \"Summarize findings\"}"
echo "      ]"
echo "    }'"
echo ""
echo "See docs/api.md for full endpoint reference."
