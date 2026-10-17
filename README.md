# Our Wines

Our Wines is a private, self-hosted, mobile-first wine collection and rating PWA. It lets a household or group of friends record bottles, keep independent ratings without individual user accounts, and compare personal or shared favorites.

The interface is currently German. Source code and project documentation are English.

## Features

- Wine collection with search, wine-type tabs, independent filters, and sorting
- White, red, and rosé wines with optional winery, grape, vintage, origin, price, ABV, producer sweetness, notes, and bottle photo
- Advisory duplicate warning without blocking legitimate variants
- Lightweight person profiles stored separately from shared-password authentication
- One editable rating per person and wine
- Four 1–5 quality criteria: overall, taste, aftertaste, and liking of sweetness/dryness
- A separate 1–5 alcohol-feeling scale that does not affect the score
- Configurable weighted score (default `8:6:3:3`, equivalent to 40/30/15/15 percent)
- Arithmetic group score and group overall rating, with rating counts
- Group and personal rankings
- Stable detail URLs, QR codes, native sharing, and copyable links
- Server-validated and normalized JPEG, PNG, and WebP uploads
- Shared-password protection, server-side sessions, login rate limiting, security headers, and CSRF checks
- CSV export, installable PWA metadata, and responsive layouts
- One-container Unraid deployment with SQLite and one persistent data directory

## Architecture

The browser application is React 19 and TypeScript, built by Vite. A Fastify 5 server provides the REST API and serves the production frontend. SQLite runs in WAL mode with foreign keys enabled; Drizzle ORM maps the schema. Sharp validates, rotates, resizes, strips metadata from, and converts uploaded images to WebP. Styling intentionally uses a small project-owned responsive CSS design system instead of Tailwind, avoiding an additional framework layer while keeping the one-off visual system easy to audit and maintain.

The production image contains both tiers and stores all mutable state under `/app/data`:

```text
/app/data/
├── our-wines.sqlite
├── our-wines.sqlite-wal     # present while WAL has pending pages
├── our-wines.sqlite-shm     # present while the application is running
└── uploads/
    └── <random UUID>.webp
```

Computed scores are never persisted. They are recalculated from the original ratings on every read, so changing score weights takes effect immediately.

## Security warning

> **`123456` is an intentionally insecure example value only. Never expose an instance using it.**

When `NODE_ENV=production` and `AUTH_ENABLED=true`, the server refuses to start if the password is `123456`, empty, shorter than 12 characters, or lacks both a letter and a symbol. Replace it before the first production start. Real `.env` files and persistent data are ignored by Git.

`AUTH_ENABLED=false` removes application-level access control from both reads and mutations. Use that setting only when public access is intentional or a separate trusted access layer is guaranteed.

Cloudflare Tunnel provides transport and routing; it is not a substitute for this application's password protection. Sessions are held server-side and signed in an HttpOnly, SameSite cookie. A server restart intentionally invalidates existing sessions. Set `APP_PUBLIC_URL` to the external HTTPS origin so Secure cookies, origin validation, and QR links agree.

Person profiles are display labels, not security identities. Anyone with the shared password can select any person.

## Local development

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` to Fastify on port 3000. The insecure example password is accepted only in non-production development mode.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the previously built application. For an intentionally unprotected local production smoke test:

```bash
NODE_ENV=production AUTH_ENABLED=false APP_PUBLIC_URL=http://localhost:3000 npm start
```

## Docker Compose

Create a local `.env` file for Compose. Do not copy the example password unchanged:

```dotenv
APP_PUBLIC_URL=https://weine.example.com
AUTH_ENABLED=true
AUTH_PASSWORD=choose-a-long-unique-password!
```

Then build and start:

```bash
docker compose up -d --build
docker compose logs -f our-wines
```

The application is available on host port 3000 and stores data in `./data`. Compose requires `AUTH_PASSWORD` to be set. The application applies its idempotent schema migration during startup.

## Unraid deployment

### Build the image

Copy this repository to the server or build it on another machine and publish it to a registry you control. For a local Unraid build from the repository directory:

```bash
docker build -t our-wines:local .
```

The included `unraid-template.xml` can be imported as a starting point, or create a container manually:

1. Repository/image: `our-wines:local` (or your registry image).
2. Network: `bridge`.
3. Port mapping: host `3000` to container `3000/tcp`.
4. Path mapping: `/mnt/user/appdata/our-wines` to `/app/data` with read/write access.
5. Add every required environment variable listed below in the Unraid Docker UI.
6. Set a strong `AUTH_PASSWORD`; do not leave `123456` in place.
7. Start the container and check `http://UNRAID-IP:3000/api/health`.

The container runs as UID/GID 1000. If a new bind-mounted appdata directory is not writable, give UID 1000 ownership or equivalent write permission before starting the container.

Run one application container only. SQLite is not intended for horizontally scaled writers.

## Environment variables

| Variable | Default/example | Description |
| --- | --- | --- |
| `NODE_ENV` | `production` | Use `production` in Docker. Enables strict password checks. |
| `PORT` | `3000` | HTTP listen port inside the container. |
| `APP_PUBLIC_URL` | `https://weine.example.com` | Canonical external origin for QR links, cookies, and origin checks. No trailing slash required. |
| `DATA_DIR` | `/app/data` | Persistent database and upload directory. |
| `AUTH_ENABLED` | `true` | Shared-password access control. `false` intentionally exposes all data and writes. |
| `AUTH_PASSWORD` | `123456` in `.env.example` | Shared password. The example is deliberately insecure and rejected in protected production. |
| `AUTH_SESSION_DAYS` | `30` | Session lifetime in days, 1–365. |
| `SCORE_WEIGHT_OVERALL` | `8` | Nonnegative overall-rating weight. |
| `SCORE_WEIGHT_TASTE` | `6` | Nonnegative taste weight. |
| `SCORE_WEIGHT_AFTERTASTE` | `3` | Nonnegative aftertaste weight. |
| `SCORE_WEIGHT_SWEETNESS` | `3` | Nonnegative sweetness/dryness-liking weight. |
| `MAX_UPLOAD_MB` | `8` | Maximum upload size in MB, up to 25. |

Score weights must be finite and nonnegative, with a total greater than zero. Alcohol feeling is never included.

## Cloudflare Tunnel

No router port forwarding is needed. In Cloudflare Zero Trust:

1. Create or select a tunnel connected to the Unraid server.
2. Add a public hostname such as `weine.example.com`.
3. Route it to `http://UNRAID-IP:3000` (or the container service name when the connector shares its Docker network).
4. Set the application variable `APP_PUBLIC_URL=https://weine.example.com` and restart the container.
5. Verify that login, a direct `/wines/<id>` URL, and its QR code work through HTTPS.

Cloudflare Access may be added as a second access layer, but is not required. Keep `AUTH_ENABLED=true` unless you have deliberately decided that another layer is sufficient.

## Backup and restore

Do not blindly copy a live SQLite file while WAL mode is active. Create an online SQLite backup first:

```bash
docker exec our-wines node -e "const D=require('better-sqlite3');const d=new D('/app/data/our-wines.sqlite');d.backup('/app/data/backup.sqlite').then(()=>d.close())"
tar -C /mnt/user/appdata/our-wines -czf /mnt/user/backups/our-wines-$(date +%F).tar.gz backup.sqlite uploads
rm /mnt/user/appdata/our-wines/backup.sqlite
```

To restore, stop the container, keep the current directory as a rollback copy, extract the archive, replace `our-wines.sqlite` with `backup.sqlite`, remove stale `our-wines.sqlite-wal` and `our-wines.sqlite-shm` files, restore `uploads/`, and start the container again:

```bash
docker stop our-wines
mv /mnt/user/appdata/our-wines /mnt/user/appdata/our-wines.before-restore
mkdir -p /mnt/user/appdata/our-wines
tar -C /mnt/user/appdata/our-wines -xzf /mnt/user/backups/our-wines-YYYY-MM-DD.tar.gz
mv /mnt/user/appdata/our-wines/backup.sqlite /mnt/user/appdata/our-wines/our-wines.sqlite
chown -R 1000:1000 /mnt/user/appdata/our-wines
docker start our-wines
```

Test restores periodically. A useful backup must contain both the database backup and the upload directory.

## Upgrades

Back up first, then rebuild or pull the new image and recreate the container with the same `/app/data` mapping and environment values. Startup migrations are idempotent. Review release notes before downgrading; automatic schema downgrades are not supported.

## Testing

The automated suite covers:

- default and changed score weighting, rounding, missing scores, and 1–4-person means;
- production environment validation and insecure-password rejection;
- protected APIs, login/logout, and mutation CSRF checks;
- person-name normalization and duplicate rejection;
- required wine creation, rating upsert, group/personal scores, rankings, filtering, direct detail URLs, and CSV export;
- valid image normalization and invalid image rejection.

Run all checks with:

```bash
npm run typecheck
npm test
npm run build
docker build -t our-wines:test .
```

## Operational limitations

- The PWA does not support offline writes or offline rating synchronization.
- No rating history is retained; editing replaces the current rating.
- No label recognition, advanced statistics, dark mode, or native app is included in v1.
- Person selection is device-local convenience state, not an authorization boundary.
- The supported deployment topology is a single application instance backed by local persistent storage.

## License

[MIT](LICENSE)
