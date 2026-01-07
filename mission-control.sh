#!/bin/bash
echo "Launching MCP Mission Control..."
cd tools/mission-control
npm start -- "$@"
