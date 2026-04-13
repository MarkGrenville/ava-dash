#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="ava-dash"

cd "$PROJECT_DIR"

CURRENT_PROJECT=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
	echo "ERROR: .firebaserc default project is '$CURRENT_PROJECT', expected '$PROJECT_ID'"
	exit 1
fi

echo "Firebase project: $PROJECT_ID"
echo "Firebase account:"
firebase login:list 2>/dev/null || echo "(not logged in)"
echo ""

TARGET=${1:-all}

case "$TARGET" in
	hosting)
		echo "Building frontend..."
		pnpm run build
		echo "Deploying hosting..."
		firebase deploy --only hosting --project "$PROJECT_ID"
		;;
	functions)
		echo "Deploying functions..."
		firebase deploy --only functions --project "$PROJECT_ID"
		;;
	rules)
		echo "Deploying rules..."
		firebase deploy --only firestore:rules,storage --project "$PROJECT_ID"
		;;
	all)
		echo "Building frontend..."
		pnpm run build
		echo "Deploying all..."
		firebase deploy --project "$PROJECT_ID"
		;;
	*)
		echo "Usage: ./scripts/deploy.sh [hosting|functions|rules|all]"
		exit 1
		;;
esac

echo "Deploy complete."
