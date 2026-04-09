#!/bin/bash
set -e

echo "Building portal..."
cd /opt/iclaw-manager/portal && npm install && npm run build

echo "Building iclaw..."
cd /opt/iclaw-manager/iclaw && npm install && npm run build

echo "Building Go backend..."
cd /opt/iclaw-manager && go build -o bin/admin-api ./cmd/admin-api

echo "Build complete!"
echo "Output:"
echo "  - Portal: /opt/iclaw-manager/portal/dist/"
echo "  - iclaw: /opt/iclaw-manager/iclaw/dist/"
echo "  - Binary: /opt/iclaw-manager/bin/admin-api"
