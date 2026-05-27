#!/bin/bash

# Stellar Authentication Test Runner
# This script runs all tests related to Stellar authentication

echo "🚀 Running Stellar Authentication Tests..."
echo "=========================================="

# Backend Tests
echo "📋 Backend Tests"
echo "----------------"

# Run Stellar Strategy Tests
echo "🔐 Testing Stellar Strategy..."
npm test -- --testPathPattern=stellar.strategy.spec.ts --verbose

# Run Auth Controller Tests
echo "🎮 Testing Auth Controller..."
npm test -- --testPathPattern=auth.controller.spec.ts --verbose

# Run Integration Tests
echo "🔗 Running Integration Tests..."
npm test -- --testPathPattern=stellar.integration.spec.ts --verbose

# Frontend Tests
echo "📱 Frontend Tests"
echo "----------------"

# Navigate to frontend directory
cd ../frontend

# Run StellarAuth Component Tests
echo "⚛️ Testing StellarAuth Component..."
npm test -- --testPathPattern=StellarAuth.spec.tsx --verbose

# Return to backend directory
cd ../backend

echo "✅ All Stellar Authentication Tests Completed!"
echo "============================================"

# Generate Test Coverage Report
echo "📊 Generating Coverage Report..."
npm test -- --coverage --coverageReporters=text-lcov | lcov -o coverage.lcov

echo "📈 Test coverage report generated in coverage.lcov"

# Run E2E Tests (if available)
echo "🌐 Running E2E Tests..."
if [ -f "e2e/stellar-auth.e2e.spec.ts" ]; then
    npm run test:e2e -- --spec="stellar-auth.e2e.spec.ts"
else
    echo "⚠️ E2E tests not found, skipping..."
fi

echo "🎉 Stellar Authentication Test Suite Complete!"
