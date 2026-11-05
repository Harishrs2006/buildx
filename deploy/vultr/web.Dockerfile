# One recipe for the three websites. Build from the repository root:
#   docker build -f deploy/vultr/web.Dockerfile --build-arg APP=buyer-web -t sthiva-shop .
# NEXT_PUBLIC_* values are baked in at build time (they are public: they ship to every browser).

FROM node:20-alpine AS builder
ARG APP
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/buyer-web/package.json apps/buyer-web/
COPY apps/seller-web/package.json apps/seller-web/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages ./packages
RUN npm ci --workspace=apps/${APP} --include-workspace-root=false --ignore-scripts
COPY apps/${APP} ./apps/${APP}

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_PHONE_SIGNIN
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SELLER_PORTAL_URL
ARG NEXT_PUBLIC_ALLOW_INDEXING
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_LEGAL_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_PHONE_SIGNIN=$NEXT_PUBLIC_PHONE_SIGNIN \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SELLER_PORTAL_URL=$NEXT_PUBLIC_SELLER_PORTAL_URL \
    NEXT_PUBLIC_ALLOW_INDEXING=$NEXT_PUBLIC_ALLOW_INDEXING \
    NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL \
    NEXT_PUBLIC_SUPPORT_PHONE=$NEXT_PUBLIC_SUPPORT_PHONE \
    NEXT_PUBLIC_LEGAL_NAME=$NEXT_PUBLIC_LEGAL_NAME \
    STANDALONE=1 \
    NEXT_TELEMETRY_DISABLED=1
RUN cd apps/${APP} && npx next build \
 && mkdir -p .next/standalone/apps/${APP}/.next \
 && cp -r .next/static .next/standalone/apps/${APP}/.next/static \
 && if [ -d public ]; then cp -r public .next/standalone/apps/${APP}/public; fi

FROM node:20-alpine AS runner
ARG APP
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 APP=${APP}
WORKDIR /srv
COPY --from=builder --chown=node:node /repo/apps/${APP}/.next/standalone ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["sh", "-c", "node apps/${APP}/server.js"]
