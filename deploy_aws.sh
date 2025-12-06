#!/bin/bash
# AWS EC2 재배포 스크립트

set -e

echo "🚀 Deploying to AWS..."

# 서비스 중지
sudo systemctl stop prism-api

# 코드 업데이트
cd ~/canvas
git fetch origin
git reset --hard origin/main

# 백엔드 준비
cd server
rm -f user_data/localmanus.db
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# 의존성 업데이트 (필요시)
source venv/bin/activate
pip install -r requirements.txt

# 서비스 시작
sudo systemctl start prism-api

# 상태 확인
sudo systemctl status prism-api

echo "✅ Deployment complete!"
echo "📋 Check logs: sudo journalctl -u prism-api -f"





