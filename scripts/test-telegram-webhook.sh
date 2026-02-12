#!/bin/bash
# Test script for Telegram Webhook Endpoint
# Usage: ./test-telegram-webhook.sh [local|prod]

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    ENDPOINT="http://localhost:3000/api/telegram/webhook"
else
    ENDPOINT="https://opie2ndbrain.vercel.app/api/telegram/webhook"
fi

echo "=========================================="
echo "Testing Telegram Webhook Endpoint"
echo "Environment: $ENV"
echo "Endpoint: $ENDPOINT"
echo "=========================================="
echo ""

# Test 1: Health check (GET)
echo "Test 1: Health Check (GET)"
echo "--------------------------"
curl -s -X GET "$ENDPOINT" | jq .
echo ""

# Test 2: Valid message (POST)
echo "Test 2: Valid Telegram Message (POST)"
echo "--------------------------------------"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from Telegram!","sender":"wes","sessionId":"test-session-123"}' | jq .
echo ""

# Test 3: Missing message field (should fail)
echo "Test 3: Missing message field (validation)"
echo "-------------------------------------------"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"sender":"wes"}' | jq .
echo ""

# Test 4: Missing sender field (should fail)
echo "Test 4: Missing sender field (validation)"
echo "------------------------------------------"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello!"}' | jq .
echo ""

# Test 5: AI assistant message (should save as 'assistant' role)
echo "Test 5: AI assistant message"
echo "-----------------------------"
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"message":"I can help you with that!","sender":"OpenClaw","sessionId":"test-session-123"}' | jq .
echo ""

echo "=========================================="
echo "Tests complete!"
echo ""
echo "Next steps:"
echo "1. Configure OpenClaw to POST to this endpoint"
echo "2. Verify messages appear in Dashboard"
echo "=========================================="
