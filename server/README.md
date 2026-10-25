# Velvet Cruise online rankings

The standalone website uses its own Cloudflare Worker and D1 database. Emerald Hollows' Worker/database are separate and are not modified.

- API: `https://velvet-cruise-api.emerald-hollows.workers.dev`
- Health: `/health`
- Public configuration: `public/online.json` (API URL only)
- Cloudflare configuration: `server/wrangler.jsonc`
- Schema: `server/migrations/0001_rankings.sql`

## Deploy

Use `npm ci`, then authenticate with `npx wrangler login` if required.
For an existing installation, retain its configured database ID. Do not create a replacement database during an update.

```powershell
npm run check
npm run qa:online-worker
npm run qa:online-client
npm run qa:local-services
npm run qa:demo
npm run server:migrate
npm run server:deploy
npm run build:web
```

For a new account only, create a database with `npx wrangler d1 create velvet-cruise --config server/wrangler.jsonc` and put the returned database ID in the configuration before migrating.
Publish the reviewed `dist/` build under the website's existing `games/more-projects/velvet-cruise/` directory. Retain older hashed chunks for open game sessions. Check the published `online.json`, entry chunk, metadata, and health response.

`npm run server:dev` runs the Worker locally. Apply migrations locally first using `npx wrangler d1 migrations apply velvet-cruise --local --config server/wrangler.jsonc`. Origins for localhost testing must be listed explicitly.

## Data and compatibility

Browser credentials are random tokens; D1 stores only their hashes. The profile and pending queue use new `sunset-coast-run.online-*` keys. Local scores, arcade tables, stage bests and badges keep their original keys. Desktop and Demo A remain local-only. Tesana exports retain their existing SDK behavior.

Public tables store one best per profile and board. `score-*` sorts descending; `run-*` sorts ascending. Legacy board IDs and `*-tour2` boards stay separate. New profiles do not import historical local records. A public driver name follows the existing arcade name entry. The identity belongs to this browser; clearing storage creates a new identity next time.

The API validates finite integer values against `assets/ui/boards.json`, names, body sizes, authentication, allowed browser origins, and quotas. SQL uses bound parameters; score replacement is atomic. CORS is a browser boundary, not proof that a submitted score came from an unmodified game.

These community rankings do not replay and independently verify driving inputs. They therefore do not provide Emerald Hollows' server replay verification or guarantee cheat-proof scores. Automated/warped test modes do not connect to the live ranking service. Keep production QA submissions identifiable and remove their scores and profiles by exact QA profile IDs after verification.

For backups, use Cloudflare D1's export and recovery tools. Never place Cloudflare credentials in `online.json`, game assets, browser storage, or commits.
