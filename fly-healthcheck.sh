#!/bin/bash

# Fly.io Health Check and Monitoring Script

APP_NAME=${1:-$(flyctl config show | grep app | cut -d'"' -f4)}

if [ -z "$APP_NAME" ]; then
    echo "❌ No app name provided and none found in fly.toml"
    echo "Usage: $0 <app-name>"
    exit 1
fi

echo "🔍 Health Check for: $APP_NAME"
echo "=================================="

# Basic status
echo "📊 App Status:"
flyctl status --app "$APP_NAME"

echo -e "\n🏥 Health Endpoint:"
APP_URL="https://$APP_NAME.fly.dev"
curl -f "$APP_URL/api/health" | jq . || echo "Health check failed"

echo -e "\n📋 Recent Logs:"
flyctl logs --app "$APP_NAME" | tail -20

echo -e "\n💾 Resource Usage:"
flyctl vm status --app "$APP_NAME"

echo -e "\n🌐 Regions:"
flyctl regions list --app "$APP_NAME"