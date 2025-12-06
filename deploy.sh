#!/bin/bash

# Prism AI Canvas Deployment Script

set -e  # Exit on error

echo "========================================="
echo "🚀 Deploying Prism AI Canvas"
echo "========================================="

# Step 1: Local Git Push
echo ""
echo "📤 Step 1: Pushing to GitHub..."
git log --oneline -5
read -p "Force push to origin/main? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

git push -f origin main
echo "✅ Pushed to GitHub"

# Step 2: AWS Deployment Instructions
echo ""
echo "========================================="
echo "📋 Step 2: Deploy on AWS Server"
echo "========================================="
echo ""
echo "Run these commands on your AWS server:"
echo ""
echo "sudo systemctl stop prism-api"
echo "cd ~/canvas && git fetch origin && git reset --hard origin/main"
echo "cd ~/canvas/server && rm -f user_data/localmanus.db"
echo "find ~/canvas/server -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null"
echo "cd ~/canvas/react && npm install && npm run build"
echo "sudo systemctl start prism-api"
echo "sudo journalctl -u prism-api -f"
echo ""
echo "========================================="
echo "✅ Deployment preparation complete!"
echo "========================================="





