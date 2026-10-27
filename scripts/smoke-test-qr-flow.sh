#!/usr/bin/env bash
# ==============================================================================
# Acklet QR Generator — Hosted Short-Link Flow Smoke Test
# Tests end-to-end link creation, resolution, redirect (302), text viewer (200),
# 404 handling, scheme security, and security headers.
#
# Usage:
#   ./scripts/smoke-test-qr-flow.sh [BASE_URL]
# Examples:
#   ./scripts/smoke-test-qr-flow.sh                     # Defaults to http://localhost:8080
#   ./scripts/smoke-test-qr-flow.sh http://localhost:4200 # Via Angular dev proxy
#   ./scripts/smoke-test-qr-flow.sh https://melvin-operose-disconsolately.ngrok-free.dev
# ==============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
BASE_URL="${BASE_URL%/}"

echo "======================================================================"
echo "Acklet QR Generator — Smoke Testing Hosted Short-Link Flow"
echo "Target Base URL: ${BASE_URL}"
echo "======================================================================"
echo ""

PASS=0
FAIL=0

assert_equal() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "${actual}" == *"${expected}"* ]]; then
    echo "  [PASS] ${label}: contains '${expected}'"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] ${label}: expected '${expected}', got '${actual}'"
    FAIL=$((FAIL + 1))
  fi
}

# ------------------------------------------------------------------------------
# 1. Long URL Creation & 302 Redirect Verification
# ------------------------------------------------------------------------------
echo "--- TEST 1: Long URL -> 302 Redirect ---"
URL_PAYLOAD="https://acklet.dev/tools/qr-generator?utm_source=smoke_test&ref=qr"
CREATE_URL_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/qr-links" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"URL\",\"payload\":\"${URL_PAYLOAD}\"}")

URL_CODE=$(echo "${CREATE_URL_RESP}" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
echo "Created URL Shortlink with Code: ${URL_CODE}"

if [[ -z "${URL_CODE}" ]]; then
  echo "  [FAIL] Could not extract code from response: ${CREATE_URL_RESP}"
  FAIL=$((FAIL + 1))
else
  # Inspect resolution headers
  RESOLVE_URL_HEADERS=$(curl -s -I "${BASE_URL}/q/${URL_CODE}")
  HTTP_STATUS=$(echo "${RESOLVE_URL_HEADERS}" | grep -i "^HTTP" | tail -n1)
  LOCATION_HDR=$(echo "${RESOLVE_URL_HEADERS}" | grep -i "^location:" || echo "")
  REF_HDR=$(echo "${RESOLVE_URL_HEADERS}" | grep -i "^referrer-policy:" || echo "")
  ROBOTS_HDR=$(echo "${RESOLVE_URL_HEADERS}" | grep -i "^x-robots-tag:" || echo "")

  assert_equal "URL Redirect Status" "302" "${HTTP_STATUS}"
  assert_equal "URL Redirect Location" "${URL_PAYLOAD}" "${LOCATION_HDR}"
  assert_equal "Referrer-Policy header" "no-referrer" "${REF_HDR}"
  assert_equal "X-Robots-Tag header" "noindex" "${ROBOTS_HDR}"
fi
echo ""

# ------------------------------------------------------------------------------
# 2. Long Text Creation & Mobile-First Text Viewer Verification (200 OK)
# ------------------------------------------------------------------------------
echo "--- TEST 2: Long Text -> Mobile-First Text Viewer (200 OK HTML) ---"
TEXT_CONTENT="Meeting Notes from QR: नमस्ते दुनिया! 🚀✨ Preserving line breaks.\nAction item 1: Test mobile notes app integration."
CREATE_TEXT_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/qr-links" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"TEXT\",\"payload\":\"${TEXT_CONTENT}\"}")

TEXT_CODE=$(echo "${CREATE_TEXT_RESP}" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
echo "Created Text Shortlink with Code: ${TEXT_CODE}"

if [[ -z "${TEXT_CODE}" ]]; then
  echo "  [FAIL] Could not extract code from response: ${CREATE_TEXT_RESP}"
  FAIL=$((FAIL + 1))
else
  RESOLVE_TEXT_RESP=$(curl -s -i "${BASE_URL}/q/${TEXT_CODE}")
  TEXT_STATUS=$(echo "${RESOLVE_TEXT_RESP}" | grep -i "^HTTP" | tail -n1)
  TEXT_ROBOTS=$(echo "${RESOLVE_TEXT_RESP}" | grep -i "^x-robots-tag:" || echo "")
  TEXT_REF=$(echo "${RESOLVE_TEXT_RESP}" | grep -i "^referrer-policy:" || echo "")
  TEXT_CSP=$(echo "${RESOLVE_TEXT_RESP}" | grep -i "^content-security-policy:" || echo "")

  assert_equal "Text Viewer Status" "200" "${TEXT_STATUS}"
  assert_equal "X-Robots-Tag" "noindex, nofollow" "${TEXT_ROBOTS}"
  assert_equal "Referrer-Policy" "no-referrer" "${TEXT_REF}"
  assert_equal "Content-Security-Policy" "default-src 'none'" "${TEXT_CSP}"

  # Check buttons and content
  assert_equal "Copy button" "Copy" "${RESOLVE_TEXT_RESP}"
  assert_equal "Share to Notes button" "Share / Save to Notes" "${RESOLVE_TEXT_RESP}"
  assert_equal "Download button" "Download .txt" "${RESOLVE_TEXT_RESP}"
  assert_equal "Share hint text" "Hint: Tap" "${RESOLVE_TEXT_RESP}"
  assert_equal "Hindi text preserved" "नमस्ते दुनिया!" "${RESOLVE_TEXT_RESP}"
  assert_equal "Emoji preserved" "🚀✨" "${RESOLVE_TEXT_RESP}"
fi
echo ""

# ------------------------------------------------------------------------------
# 3. Unknown Code -> Friendly 404 Status Page
# ------------------------------------------------------------------------------
echo "--- TEST 3: Unknown Code -> Friendly 404 Page ---"
RESOLVE_404_RESP=$(curl -s -i "${BASE_URL}/q/nonExistentSlug999XYZ")
STATUS_404=$(echo "${RESOLVE_404_RESP}" | grep -i "^HTTP" | tail -n1)
ROBOTS_404=$(echo "${RESOLVE_404_RESP}" | grep -i "^x-robots-tag:" || echo "")
REF_404=$(echo "${RESOLVE_404_RESP}" | grep -i "^referrer-policy:" || echo "")

assert_equal "404 HTTP Status" "404" "${STATUS_404}"
assert_equal "404 Friendly Message" "QR Code Not Found" "${RESOLVE_404_RESP}"
assert_equal "404 X-Robots-Tag" "noindex" "${ROBOTS_404}"
assert_equal "404 Referrer-Policy" "no-referrer" "${REF_404}"
echo ""

# ------------------------------------------------------------------------------
# 4. Security: Reject Invalid Schemes (javascript:, data:, file:)
# ------------------------------------------------------------------------------
echo "--- TEST 4: Security Scheme Allowlist Enforcement ---"
BAD_SCHEME_RESP=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/v1/qr-links" \
  -H "Content-Type: application/json" \
  -d '{"type":"URL","payload":"javascript:alert(document.cookie)"}')

BAD_CODE=$(echo "${BAD_SCHEME_RESP}" | tail -n1)
assert_equal "javascript: scheme rejected" "400" "${BAD_CODE}"
echo ""

# ------------------------------------------------------------------------------
# Final Smoke Test Summary
# ------------------------------------------------------------------------------
echo "======================================================================"
echo "Smoke Test Summary: ${PASS} Passed, ${FAIL} Failed"
echo "======================================================================"

if [[ ${FAIL} -gt 0 ]]; then
  exit 1
fi
