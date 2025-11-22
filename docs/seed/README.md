# Product seed CSV template

Use `products_seed_template.csv` to author product seed data that can be imported into the Dexie database. Populate one row per product and ensure the `category` column contains the product's category name.

## Columns
- **name**: Product display name.
- **category**: Category label for the product. Codex will generate the category table from the unique values in this column.
- **unit_type**: Unit of measure (e.g., `units`, `packs`, `bottles`).
- **bulk_name**: Label for the bulk unit (e.g., `carton`, `box`).
- **units_per_bulk**: Number of individual units contained in a bulk item.
- **barcode**: Optional barcode string. Leave blank if unknown.
- **archived**: `true` or `false` to indicate whether the product is archived.

## Usage flow for Codex
1. Read `products_seed_template.csv`.
2. Seed `products` with the CSV rows (generate UUIDs and timestamps per record).
3. Build a **unique, alphabetized** list of categories from the `category` column and seed the `categories` table with those values (UUIDs plus timestamps).
4. If necessary, seed `areas` separately using the existing defaults in `src/db/seed.ts` or an equivalent CSV.
