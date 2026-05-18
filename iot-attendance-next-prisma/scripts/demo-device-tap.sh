#!/usr/bin/env sh

set -eu

BASE_URL="${BASE_URL:-http://localhost:3000}"
DEVICE_CODE="${DEVICE_CODE:-ENTRANCE-01}"
DEVICE_SECRET="${DEVICE_SECRET:-entrance-demo-01}"
UID="${UID:-46 14 33 07}"
FIRMWARE_VERSION="${FIRMWARE_VERSION:-1.3.2}"
IP_ADDRESS="${IP_ADDRESS:-192.168.1.41}"
SIGNAL_STRENGTH="${SIGNAL_STRENGTH:--55}"
IDEMPOTENCY_KEY="${IDEMPOTENCY_KEY:-$DEVICE_CODE-$(date +%s)-$(printf '%s' "$UID" | tr -d ' ')}"

curl -X POST "$BASE_URL/api/iot/attendance" \
  -H "Content-Type: application/json" \
  -H "x-device-secret: $DEVICE_SECRET" \
  -d "{\"uid\":\"$UID\",\"deviceCode\":\"$DEVICE_CODE\",\"firmwareVersion\":\"$FIRMWARE_VERSION\",\"ipAddress\":\"$IP_ADDRESS\",\"signalStrength\":$SIGNAL_STRENGTH,\"source\":\"LIVE\",\"idempotencyKey\":\"$IDEMPOTENCY_KEY\"}"
