StockFill import/export templates
=================================

Each CSV is UTF-8 encoded and uses headers as the first row. Fields marked optional can be left blank.

- ids are optional; missing ids will be generated automatically.
- Names are preferred for mapping relationships (e.g., category name instead of id).

Files
-----
- areas_template.csv — columns: id, name, created_at, updated_at
- categories_template.csv — columns: id, name, created_at, updated_at
- products_template.csv — columns: id, name, category (name), unit_type, bulk_name, barcode, archived, created_at, updated_at
- picklists_template.csv — columns: id, area_id, area_name, created_at, completed_at, notes, categories (semicolon separated names), auto_add_new_products
- pickitems_template.csv — columns: id, pick_list_id, pick_list_name, product_id, product_name, quantity, is_carton, status, created_at, updated_at

Notes
-----
- Category and area names are matched case-insensitively.
- Product names are deduplicated case-insensitively; duplicate names will be skipped.
- If a referenced name is missing and auto-create is enabled, the importer will create the required area/category/product.
- Barcode collisions are avoided automatically during import.
