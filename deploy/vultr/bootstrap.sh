#!/usr/bin/env bash
# One-time setup of a fresh Vultr Ubuntu 24.04 server for Sthiva. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/Harishrs2006/sthiva/main/deploy/vultr/bootstrap.sh | bash
# Then create /opt/sthiva/deploy/vultr/.env (see .env.example) and run deploy.sh.
set -euo pipefail

apt-get update -y
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

# Docker Engine + compose plugin (official script)
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi

# Swap: Next.js builds need memory; 4 GB swap keeps a 4 GB server from running out
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Firewall: SSH and web only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Security updates install themselves
dpkg-reconfigure -f noninteractive unattended-upgrades

# Code
if [ ! -d /opt/sthiva/.git ]; then git clone https://github.com/Harishrs2006/sthiva.git /opt/sthiva; fi
echo "Server ready. Next: create /opt/sthiva/deploy/vultr/.env, then run /opt/sthiva/deploy/vultr/deploy.sh"
