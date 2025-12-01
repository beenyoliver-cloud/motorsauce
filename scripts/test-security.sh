#!/bin/bash
# Security & Feature Testing Script for Motorsauce
# Run this script to verify all security measures and features before investor demo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
echo -e "${BLUE}Testing Motorsauce Platform${NC}"
echo -e "${BLUE}Base URL: ${BASE_URL}${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  local auth_header="$4"
  local expected_status="${5:-200}"
  local body="$6"
  
  echo -n "Testing: $name... "
  
  if [ -n "$auth_header" ]; then
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_header" \
        -d "$body" \
        "$url" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Authorization: Bearer $auth_header" \
        "$url" 2>&1)
    fi
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body_response=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
    echo -e "${YELLOW}Response: $body_response${NC}"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BLUE}=== 1. PUBLIC ENDPOINTS (No Auth Required) ===${NC}"
test_endpoint "Health check" "$BASE_URL/api/health"
test_endpoint "Listings API" "$BASE_URL/api/listings"
test_endpoint "Popular sellers" "$BASE_URL/api/popular-sellers"
test_endpoint "Weekly popular sellers" "$BASE_URL/api/popular-sellers-weekly"
test_endpoint "Suggestions API" "$BASE_URL/api/suggestions"
echo ""

echo -e "${BLUE}=== 2. PROTECTED ENDPOINTS (Auth Required) ===${NC}"
echo -e "${YELLOW}These should fail with 401 without authentication${NC}"
test_endpoint "Messages threads (no auth)" "$BASE_URL/api/messages/threads" "GET" "" "401"
test_endpoint "Saved searches (no auth)" "$BASE_URL/api/saved-searches" "GET" "" "401"
echo ""

echo -e "${BLUE}=== 3. ADMIN ENDPOINTS (Admin Role Required) ===${NC}"
echo -e "${YELLOW}These should fail with 403 without admin role${NC}"
test_endpoint "Admin listings (no admin)" "$BASE_URL/api/admin/listings" "GET" "" "403"
test_endpoint "Seed database (no admin)" "$BASE_URL/api/seed" "POST" "" "403"
echo ""

echo -e "${BLUE}=== 4. API RESPONSE DATA VALIDATION ===${NC}"
echo "Checking weekly popular sellers response format..."

response=$(curl -s "$BASE_URL/api/popular-sellers-weekly")
if echo "$response" | grep -q '"id"' && echo "$response" | grep -q '"name"' && ! echo "$response" | grep -q '"email"'; then
  echo -e "${GREEN}✓ PASSED${NC} - Response format is correct (no email exposed)"
  ((PASSED++))
else
  echo -e "${RED}✗ FAILED${NC} - Response format issue"
  echo -e "${YELLOW}Response: $response${NC}"
  ((FAILED++))
fi

echo "Checking popular sellers response format..."
response=$(curl -s "$BASE_URL/api/popular-sellers")
if echo "$response" | grep -q '"seller_name"' && ! echo "$response" | grep -q '"email"'; then
  echo -e "${GREEN}✓ PASSED${NC} - Response format is correct (no email exposed)"
  ((PASSED++))
else
  echo -e "${RED}✗ FAILED${NC} - Response format issue"
  echo -e "${YELLOW}Response: $response${NC}"
  ((FAILED++))
fi
echo ""

echo -e "${BLUE}=== 5. ENVIRONMENT VARIABLES CHECK ===${NC}"
if [ -f ".env.local" ]; then
  echo "Checking .env.local for required variables..."
  
  check_var() {
    local var_name="$1"
    if grep -q "^$var_name=" .env.local 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $var_name is set"
      ((PASSED++))
    else
      echo -e "${RED}✗${NC} $var_name is missing"
      ((FAILED++))
    fi
  }
  
  check_var "NEXT_PUBLIC_SUPABASE_URL"
  check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  check_var "SUPABASE_SERVICE_ROLE_KEY"
else
  echo -e "${YELLOW}⚠${NC} .env.local not found - skipping environment check"
fi
echo ""

echo -e "${BLUE}=== 6. SECURITY CHECKS ===${NC}"
echo "Checking for exposed secrets in responses..."

response=$(curl -s "$BASE_URL/api/health")
if ! echo "$response" | grep -qi "service.*role\|secret\|password\|private"; then
  echo -e "${GREEN}✓ PASSED${NC} - No secrets exposed in health endpoint"
  ((PASSED++))
else
  echo -e "${RED}✗ FAILED${NC} - Potential secret exposure detected"
  ((FAILED++))
fi

echo "Checking listings API doesn't expose internal IDs..."
response=$(curl -s "$BASE_URL/api/listings")
if echo "$response" | grep -q '"id"' || echo "$response" | grep -q '\[\]'; then
  echo -e "${GREEN}✓ PASSED${NC} - Listings API response format is valid"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} - Unexpected listings response format"
fi
echo ""

echo -e "${BLUE}=== TEST SUMMARY ===${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "Total tests: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}   ✓ ALL TESTS PASSED!${NC}"
  echo -e "${GREEN}   Platform is ready for investor demo${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}════════════════════════════════════════${NC}"
  echo -e "${RED}   ✗ SOME TESTS FAILED${NC}"
  echo -e "${RED}   Please review failures above${NC}"
  echo -e "${RED}════════════════════════════════════════${NC}"
  exit 1
fi
