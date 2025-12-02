import JSZip from 'jszip';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { StockFillDB } from '../db';
import { ImportExportLog, ImportExportLogSummary } from '../models/ImportExportLog';
import { Product, DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE } from '../models/Product';
import { normalizeName, inferTypeFromName } from '../utils/stringUtils';
import { triggerDownload } from '../platform/web';
export { normalizeName, inferTypeFromName } from '../utils/stringUtils';
export { coerceBoolean, coerceNumber } from '../utils/convUtils';

export type DataType = 'areas' | 'categories' | 'products' | 'pick-lists' | 'pick-items';

export interface ExportResult {
  fileName: string;
  blob: Blob;
  log: ImportExportLog;
}

export interface ImportOptions {
  allowAutoCreateMissing: boolean;
}

export interface ImportResult {
  log: ImportExportLog;
}

interface ParsedFile {
  name: string;
  content: string;
}

const parseCsv = async (content: string) => {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });


  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
};

const readFiles = async (files: File[]) => {
  const parsed: ParsedFile[] = [];
  for (const file of files) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter((entry) => !entry.dir);
      for (const entry of entries) {
        const content = await entry.async('string');
        parsed.push({ name: entry.name, content });
      }
      continue;
    }

    const content = await file.text();
    parsed.push({ name: file.name, content });
  }
  return parsed;
};

const createLog = (
  type: ImportExportLog['type'],
  selectedTypes: string[],
  summary: ImportExportLogSummary,
  details: string[],
  fileNames?: string[],
): ImportExportLog => ({
  id: uuidv4(),
  type,
  timestamp: Date.now(),
  selectedTypes,
  summary,
  details,
  fileNames,
});

const serializeCsv = (rows: object[]) => Papa.unparse(rows, { quotes: true });

export const exportData = async (
  db: StockFillDB,
  selectedTypes: DataType[],
  onLog?: (line: string) => void,
): Promise<ExportResult> => {
  if (selectedTypes.length === 0) {
    throw new Error('No data types selected');
  }

  const details: string[] = [];
  const fileEntries: { name: string; content: string }[] = [];
  const categories = await db.categories.toArray();
  const categoriesById = new Map(categories.map((c) => [c.id, c.name]));
  const areas = await db.areas.toArray();
  const areasById = new Map(areas.map((a) => [a.id, a.name]));
  let inserted = 0;

  const addDetail = (line: string) => {
    details.push(line);
    onLog?.(line);
  };

  if (selectedTypes.includes('areas')) {
    const rows = areas.map((area) => ({
      id: area.id,
      name: area.name,
      created_at: area.created_at,
      updated_at: area.updated_at,
    }));
    inserted += rows.length;
    addDetail(`Exported ${rows.length} areas`);
    fileEntries.push({ name: 'areas.csv', content: serializeCsv(rows) });
  }

  if (selectedTypes.includes('categories')) {
    const rows = categories.map((category) => ({
      id: category.id,
      name: category.name,
      created_at: category.created_at,
      updated_at: category.updated_at,
    }));
    inserted += rows.length;
    addDetail(`Exported ${rows.length} categories`);
    fileEntries.push({ name: 'categories.csv', content: serializeCsv(rows) });
  }

if (selectedTypes.includes('products')) {
  const products = await db.products.toArray();
  const rows = products.map((product) => ({
    name: product.name,
    barcode: product.barcode ?? '',
    category: categoriesById.get(product.category) ?? '',
  }));
  inserted += rows.length;
  addDetail(`Exported ${rows.length} products`);
  fileEntries.push({ name: 'products.csv', content: serializeCsv(rows) });
}


  if (selectedTypes.includes('pick-lists')) {
    const pickLists = await db.pickLists.toArray();
    const rows = pickLists.map((list) => ({
      id: list.id,
      area_id: list.area_id,
      area_name: areasById.get(list.area_id) ?? '',
      created_at: list.created_at,
      completed_at: list.completed_at ?? '',
      notes: list.notes ?? '',
      categories: (list.categories ?? [])
        .map((id) => categoriesById.get(id) ?? '')
        .filter(Boolean)
        .join(';'),
      auto_add_new_products: list.auto_add_new_products,
    }));
    inserted += rows.length;
    addDetail(`Exported ${rows.length} pick lists`);
    fileEntries.push({ name: 'picklists.csv', content: serializeCsv(rows) });
  }

  if (selectedTypes.includes('pick-items')) {
    const pickItems = await db.pickItems.toArray();
    const pickLists = await db.pickLists.toArray();
    const pickListById = new Map(pickLists.map((pl) => [pl.id, pl]));
    const products = await db.products.toArray();
    const productById = new Map(products.map((p) => [p.id, p]));
    const rows = pickItems.map((item) => {
      const list = pickListById.get(item.pick_list_id);
      const product = productById.get(item.product_id);
      return {
        id: item.id,
        pick_list_id: item.pick_list_id,
        pick_list_name: list?.notes ?? '',
        product_id: item.product_id,
        product_name: product?.name ?? '',
        quantity: item.quantity,
        is_carton: item.is_carton,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });
    inserted += rows.length;
    addDetail(`Exported ${rows.length} pick items`);
    fileEntries.push({ name: 'pickitems.csv', content: serializeCsv(rows) });
  }

  let blob: Blob;
  let fileName: string;
  if (fileEntries.length === 1) {
    blob = new Blob([fileEntries[0].content], { type: 'text/csv;charset=utf-8' });
    fileName = fileEntries[0].name;
  } else {
    const zip = new JSZip();
    fileEntries.forEach((file) => {
      zip.file(file.name, file.content);
    });
    blob = await zip.generateAsync({ type: 'blob' });
    fileName = `stockfill_export_${new Date().toISOString().slice(0, 10)}.zip`;
  }

  const log = createLog(
    'export',
    selectedTypes,
    { inserted, updated: 0, skipped: 0, errors: 0 },
    details,
    fileEntries.map((f) => f.name),
  );
  await db.importExportLogs.add(log);

  triggerDownload(blob, fileName);

  return { fileName, blob, log };
};

const addOrUpdateMap = (map: Map<string, string>, key: string, value: string) => {
  if (!map.has(key)) {
    map.set(key, value);
  }
};

export const importFiles = async (
  db: StockFillDB,
  files: File[],
  options: ImportOptions,
  onLog?: (line: string) => void,
): Promise<ImportResult> => {
  const parsedFiles = await readFiles(files);
  const details: string[] = [];
  const selectedTypes: DataType[] = [];
  const addDetail = (line: string) => {
    details.push(line);
    onLog?.(line);
  };

  const parsedRows: Partial<Record<DataType, Record<string, string>[]>> = {};

  const productRows: Record<string, string>[] = [];

  for (const file of parsedFiles) {
    const rows = await parseCsv(file.content);
    addDetail(`Parsed ${rows.length} rows from ${file.name}`);
    if (!rows || rows.length === 0) continue;

    // Look at headers of first row to decide if it's product-centric
    const headerKeys = Object.keys(rows[0]).map((header) => header.trim().toLowerCase());
    const isProductCentric =
      headerKeys.includes('category') && (headerKeys.includes('name') || headerKeys.includes('product_name'));

    if (isProductCentric) {
      // Collect product rows for product-centric import
      productRows.push(...rows);
      // record that we detected products (for logging later)
      if (!selectedTypes.includes('products')) selectedTypes.push('products');
    } else {
      // Fallback to filename-based inference for older templates
    const type = inferTypeFromName(file.name) as DataType | undefined;
    if (!type) {
      addDetail(`Skipped ${file.name}: not product-centric and could not infer data type`);
      continue;
    }
    parsedRows[type] = rows;
    selectedTypes.push(type);
  }
}

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const now = Date.now();
  const areaNameToId = new Map<string, string>();
  const categoryNameToId = new Map<string, string>();
  const productNameToId = new Map<string, string>();
  const barcodeToProductId = new Map<string, string>();
  const pickListNameToId = new Map<string, string>();

  const existingAreas = await db.areas.toArray();
  existingAreas.forEach((area) => addOrUpdateMap(areaNameToId, normalizeName(area.name), area.id));

  const existingCategories = await db.categories.toArray();
  existingCategories.forEach((cat) => addOrUpdateMap(categoryNameToId, normalizeName(cat.name), cat.id));

  const existingProducts = await db.products.toArray();
  existingProducts.forEach((product) => {
    addOrUpdateMap(productNameToId, normalizeName(product.name), product.id);
    if (product.barcode) {
      addOrUpdateMap(barcodeToProductId, product.barcode, product.id);
    }
  });

  const existingPickLists = await db.pickLists.toArray();
  existingPickLists.forEach((list) => {
    if (list.notes) {
      addOrUpdateMap(pickListNameToId, normalizeName(list.notes), list.id);
    }
  });

  try {
    await db.transaction('rw', [db.categories, db.products], async () => {
      if (productRows.length > 0) {
        // 1) Make a unique list of category names from CSV (normalized)
        const uniqueCategoryNames = new Map<string, string>(); // normalized -> raw
        for (const row of productRows) {
          const rawCat = (row.category ?? '').trim();
          if (!rawCat) continue;
          const norm = normalizeName(rawCat);
          if (norm && !uniqueCategoryNames.has(norm)) uniqueCategoryNames.set(norm, rawCat);
        }

        // 2) Create missing categories in DB
        for (const [norm, raw] of uniqueCategoryNames) {
          if (!categoryNameToId.has(norm)) {
            const newId = uuidv4();
            categoryNameToId.set(norm, newId);
            await db.categories.add({
              id: newId,
              name: raw,
              created_at: now,
              updated_at: now,
            });
            addDetail(`Created category "${raw}"`);
          }
        }

        // 3) Create products, linking to categories
        for (const row of productRows) {
          const nameRaw = (row.product_name ?? row.name ?? '').trim();
          const name = normalizeName(nameRaw);
          if (!name) {
            addDetail('Skipped product with empty name');
            skipped += 1;
            continue;
          }
          if (productNameToId.has(name)) {
            addDetail(`Product "${nameRaw}" exists, skipping`);
            skipped += 1;
            continue;
          }

          const catRaw = (row.category ?? '').trim();
          const categoryId = catRaw ? categoryNameToId.get(normalizeName(catRaw)) : undefined;

          const barcode = row.barcode?.trim();
          if (barcode && barcodeToProductId.has(barcode)) {
            addDetail(`Barcode ${barcode} already exists, clearing for product "${nameRaw}"`);
          }

          const id = uuidv4();
          const product: Product = {
            id,
            name: nameRaw,
            category: categoryId ?? '',
            unit_type: DEFAULT_UNIT_TYPE,
            bulk_name: DEFAULT_BULK_NAME,
            barcode: barcode && !barcodeToProductId.has(barcode) ? barcode : undefined,
            archived: false,
            created_at: now,
            updated_at: now,
          };
          await db.products.add(product);
          productNameToId.set(name, id);
          if (product.barcode) {
            barcodeToProductId.set(product.barcode, id);
          }
          inserted += 1;
          addDetail(`Created product "${product.name}"`);
        }
      }
    });
  } catch (error) {
    errors += 1;
    addDetail(`Import failed: ${(error as Error).message}`);
  }

  const log = createLog(
    'import',
    selectedTypes,
    { inserted, updated: 0, skipped, errors },
    details,
    parsedFiles.map((f) => f.name),
  );
  await db.importExportLogs.add(log);
  return { log };
};

export const downloadLog = (log: ImportExportLog) => {
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `stockfill-${log.type}-log-${log.timestamp}.json`);
};
