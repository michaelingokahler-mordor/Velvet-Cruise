# Windows shared online rankings

The user approved shared Windows/web rankings, offline play with automatic later uploads, and a separate local arcade table. The user selected freely chosen names plus a short driver identifier instead of reserved names or email accounts.

Use the existing Cloudflare Worker and D1 database. Keep game rules, save keys, existing records, credentials, queues, settings and unlocks. Only full desktop builds may use the production rankings; demos, development, debug and automation must remain isolated. Desktop ranking access must not enable production statistics.

Keep one persistent anonymous profile per installation. Each profile has one best result per board. Display the chosen name and a server-assigned unique eight-character hexadecimal driver tag. Existing profiles receive stable tags through an additive migration. Names remain editable; changing the name does not create a new profile. Local arcade entries keep their original names without online tags. Clearing the application profile loses its anonymous online credentials; account recovery and cross-device linking are outside this change.

Save new results and the pending queue before networking. A failed request cannot delay local results or delete pending scores. Retry on startup, connection/focus return, and a bounded background retry while work remains. Retain the best pending value per board and remove only the exact acknowledged value. Do not upload historical local records automatically.

Prepare a new Windows package and test with disposable profiles and a local API/database. Preserve the installed package and actual player profile. Do not submit synthetic production scores or statistics. Prepare the Worker migration and deployment instructions for review before live activation.

Alternatives considered: reserved names require conflict and recovery flows; name-only profiles remain ambiguous; name plus unique driver tag satisfies the selected approach with no login screen.
