# Security Policy

## Supported versions

The project is currently in active development. Apply the latest changes from the `main` branch to receive fixes and updates.

## Reporting a vulnerability

1. Do **not** create a public issue for security findings.
2. Open a private security advisory via the repository's "Report a vulnerability" workflow, or contact the maintainers through a
   private channel if one is provided.
3. Include a detailed description with reproduction steps, impact assessment, and any suggested remediation.
4. Maintainers will acknowledge reports within a reasonable timeframe and coordinate a fix and disclosure plan.

## Security best practices for contributors

- Avoid introducing remote API calls that could leak data; StockFill is designed to run fully offline using Dexie.
- Keep dependencies up to date and prefer well-maintained libraries.
- Validate and sanitize data imported from CSV or other local files before persisting.
- When modifying Dexie schemas, provide migrations to protect existing user data.
