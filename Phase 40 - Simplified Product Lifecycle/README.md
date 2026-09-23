# Phase 40 — Simplified Product Lifecycle

## Product rules
- A product belongs to one sales channel: `B2C` or `B2B`.
- To sell the same product in both channels, create one row per channel with a distinct SKU; each has its own pricing and units.
- `AVAILABLE` automatically activates and publishes the product to its channel.
- `UNAVAILABLE` automatically deactivates and hides it from public catalogues while keeping it in the dashboard.
- Import preview shows the effect before applying. There is no draft/ready-to-publish workflow or manual visibility checkbox.
- Legacy `BOTH` records remain readable and editable without offering BOTH for new products.

## Figma Make upload
Upload the contents of `src/` into the matching existing project paths. No SQL file is required in Figma Make.

## Database
The corresponding product create/update/import/list RPC behavior was applied directly to the connected Supabase project. The migration is not included here as an uploadable SQL file.
