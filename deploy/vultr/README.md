# Sthiva on Vultr

One server runs the API and the three websites behind Caddy (automatic HTTPS). MongoDB stays on Atlas,
images on Cloudinary, sign-in on Firebase. Replaces Render (free plan sleeps) and Vercel Hobby
(non-commercial only).

## Server

- Vultr Cloud Compute, **Mumbai** (or Bangalore), Ubuntu 24.04, **4 GB RAM / 2 vCPU** or more.
  Builds of the three websites need the memory; the bootstrap adds 4 GB swap as a cushion.
- Enable automatic backups in Vultr (a few dollars a month) and add your SSH key when creating it.

## First setup (about 30 minutes)

1. On the server as root: `curl -fsSL https://raw.githubusercontent.com/Harishrs2006/sthiva/main/deploy/vultr/bootstrap.sh | bash`
2. `cp /opt/sthiva/deploy/vultr/.env.example /opt/sthiva/deploy/vultr/.env` and fill it in (same values as
   Render and Vercel today; the copy in buildx-secrets/env-backup helps). `chmod 600` it.
3. MongoDB Atlas, Network Access: add the server's IP.
4. `/opt/sthiva/deploy/vultr/deploy.sh` builds and starts everything (first build 10 to 20 minutes).
5. Check on the server before switching DNS:
   `curl -k --resolve sthiva.com:443:127.0.0.1 https://sthiva.com -o /dev/null -w '%{http_code}'`
   (certificates are issued only after step 6, so expect a certificate warning here).

## Switch traffic (minutes, reversible)

6. Cloudflare DNS for sthiva.com: change `@`, `www`, `seller`, `ops`, `api` to **A records pointing at the
   server IP**, DNS only (grey cloud). Caddy issues certificates within a minute of the first visit.
7. Check https://api.sthiva.com/health, the shop, seller and ops sites, a Google sign-in, and an order.
8. Keep Render and Vercel running for a week as the fallback: to roll back, put the old CNAME records back.

## Updates

Every push to main redeploys automatically once the repository secrets `VULTR_HOST` and `VULTR_SSH_KEY`
are set (.github/workflows/deploy-vultr.yml). By hand: `/opt/sthiva/deploy/vultr/deploy.sh`.

Logs: `cd /opt/sthiva/deploy/vultr && docker compose logs -f api` (or shop, seller, ops, caddy).
