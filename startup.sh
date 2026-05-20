#!/bin/sh
set -e

# Fallback to a default if the environment variable isn't set
URL="${QUIZ_JSON_URL:-https://files.fuckmylife.fi/quiz.json}"

echo "Downloading configuration JSON from: $URL"
curl -sSL -o /app/quiz.json "$URL"

echo "Starting Node.js application..."
exec npm start