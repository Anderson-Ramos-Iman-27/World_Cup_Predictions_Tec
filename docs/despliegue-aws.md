# AWS Deployment Guide

Start date: 2026-06-10.

## Goal

Deploy the World Cup predictions platform on a single AWS EC2 Ubuntu instance using Docker Compose and Nginx.

The professor requested horizontal scaling on that same 16 GB EC2 host: Nginx will act as the reverse proxy and load balancer for 5 replicas of the same application, while PostgreSQL and Redis stay shared.

Defined domains:

- `mundial.tdproy.com`
- `ci.tdproy.com`
- `proxy.tdproy.com`

The initial phase will use temporary test ports on the instance. Once stable, traffic will move to public `80`, and later HTTPS on `443`.

## Current State

- SSH access to the EC2 instance is available.
- Docker Compose is installed on the instance.
- The local project already has Dockerfiles, Compose files, and Nginx.
- AWS deployment files are now added to the repository.

## Target Architecture

- One EC2 Ubuntu instance.
- Docker containers for:
  - 5 Next.js frontend replicas.
  - 5 NestJS backend replicas.
  - PostgreSQL.
  - Redis.
  - Nginx.
- Nginx is the single public entry point.
- All three domains point to the same platform.

### Load Balancing Goal

Nginx will receive external traffic and distribute it across the 5 frontend replicas and the 5 backend replicas. The application should scale horizontally inside the same EC2 instance instead of relying on a single container per service.

### Logical Diagram

```text
Internet
  -> mundial.tdproy.com
  -> ci.tdproy.com
  -> proxy.tdproy.com
         |
         v
      Nginx
         |
   -----------------
   |               |
Frontend        Backend
   |               |
 PostgreSQL      Redis
```

## Working Ports

### Test phase

Initial validation will use exposed test ports on the instance.

- Frontend entry: `3002`
- Backend entry: `3001`

These are temporary host entry points that hit Nginx. Internally, Nginx will balance traffic across the 5 replicas.

### Final phase

When everything is stable:

- Public HTTP: `80`
- Public HTTPS: `443`

At that point Nginx will continue to balance traffic internally, but the public exposure will move to the standard web ports.

## DNS

Expected tasks:

- Point the three domains to the EC2 public IP.
- Decide whether to use direct `A` records or a CNAME, depending on the DNS provider.
- Verify propagation before issuing certificates.

## AWS Security Group

Suggested rules for the instance:

- `22` only for administration.
- `3001` and `3002` during the testing phase.
- `80` and `443` when the public deployment is finalized.

After validation, review whether `3001` and `3002` should remain exposed.

## Nginx

Nginx must:

- Accept traffic for the three domains.
- Serve the main application.
- Route `/api` to the backend pool.
- Provide a health route.
- Be ready for HTTPS certificates.
- Balance requests across 5 frontend and 5 backend replicas.

AWS files:

- `infra/nginx/nginx.aws.conf`
- `docker-compose.aws.yml`

Important operational note:

- `backend-1` is the only backend replica that runs Prisma migrations and the admin bootstrap.
- `backend-2` through `backend-5` start without migrations or bootstrap.
- All backend replicas share the same PostgreSQL and Redis services.

## HTTPS with Let’s Encrypt

Reference:

- [How to configure Let's Encrypt with Nginx in Docker](https://phoenixnap.com/kb/letsencrypt-docker)

Plan:

- Issue valid certificates for the defined domains.
- Automate certificate renewal.
- Keep port `80` available during HTTP challenge validation.
- Redirect HTTP traffic to HTTPS after certificates are installed.

## Work Plan

### Phase 1. Instance preparation

- [ ] Confirm SSH access.
- [ ] Review OS, Docker, and Docker Compose.
- [ ] Check disk space and general health.
- [ ] Create the working directory on the EC2 host.

### Phase 2. Temporary deployment

- [ ] Upload the code to the instance.
- [ ] Create the production `.env`.
- [ ] Define `FOOTBALL_DATA_SYNC_INTERVAL_MINUTES`.
- [ ] Start the 5 frontend replicas, 5 backend replicas, PostgreSQL, Redis, and Nginx.
- [ ] Test access through `3001` and `3002`.
- [ ] Verify database and Redis connectivity.
- [ ] Confirm the app responds correctly.

### Phase 3. Nginx

- [ ] Validate Nginx reverse proxy behavior.
- [ ] Confirm all domains reach the same application.
- [ ] Review headers, timeouts, and health checks.

### Phase 4. HTTPS

- [ ] Implement Let’s Encrypt in Docker.
- [ ] Issue certificates for the domains.
- [ ] Test HTTP to HTTPS redirection.
- [ ] Confirm automatic renewal.

### Phase 5. Closeout

- [ ] Reduce exposure of the test ports.
- [ ] Document the final configuration.
- [ ] Record reproducible steps.
- [ ] Run a final browser test.

## Progress Log

Use this section to record what has been completed.

### 2026-06-10

- AWS access was received.
- Docker Compose availability was confirmed.
- The guide was defined to include Nginx, several domains, and Let’s Encrypt.
- Testing with `3001` and `3002` was agreed before moving to `80` and `443`.
- `docker-compose.aws.yml` was added with 5 frontend and 5 backend replicas.
- `infra/nginx/nginx.aws.conf` was added as the internal load balancer config.

## Open Items

- Final production Docker Compose strategy for AWS.
- Exact port mapping for frontend, backend, and Nginx during the test phase.
- Final certificate strategy.
- Whether all domains use a single `server_name` block or separate blocks.
- Whether Nginx remains the only public entry point or an extra proxy layer is added later.

## References

- `docs/deployment.md`
- [How to configure Let's Encrypt with Nginx in Docker](https://phoenixnap.com/kb/letsencrypt-docker)
- `docker-compose.aws.yml`
- `docker-compose.yml`
- `docker-compose.prod.yml`
