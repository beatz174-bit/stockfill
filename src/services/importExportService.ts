import JSZip from 'jszip';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { StockFillDB } from '../db';
import { ImportExportLog, ImportExportLogSummary } from '../models/ImportExportLog';
import { Area } from '../models/Area';
import { Category } from '../models/Category';
import { PickItem, PickItemStatus } from '../models/PickItem';
import { PickList } from '../models/PickList';
import { Product, DEFAULT_BULK_NAME, DEFAULT_UNIT_TYPE } from '../models/Product';

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

const typeHints: Record<DataType, string[]> = {
  areas: ['area'],
  categories: ['category'],
  products: ['product'],
  'pick-lists': ['picklist', 'pick-list'],
  'pick-items': ['pickitem', 'pick-item'],
};

export const normalizeName = (value?: string) =>
  (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const inferTypeFromName = (name: string): DataType | undefined => {
  const lowercase = name.toLowerCase();
  return (Object.keys(typeHints) as DataType[]).find((key) =>
    typeHints[key].some((hint) => lowercase.includes(hint)),
  );
};

const parseCsv = async (content: string) => {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
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
      // eslint-disable-next-line no-await-in-loop
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

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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
      id: product.id,
      name: product.name,
      category: categoriesById.get(product.category) ?? '',
      unit_type: product.unit_type,
      bulk_name: product.bulk_name,
      barcode: product.barcode,
      archived: product.archived,
      created_at: product.created_at,
      updated_at: product.updated_at,
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

const coerceBoolean = (value: string | boolean | undefined) => {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toString().toLowerCase() === 'true';
};

const coerceNumber = (value: string | number | undefined) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
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

  for (const file of parsedFiles) {
    const type = inferTypeFromName(file.name);
    if (!type) {
      addDetail(`Skipped ${file.name}: could not infer data type`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const rows = await parseCsv(file.content);
    parsedRows[type] = rows;
    selectedTypes.push(type);
    addDetail(`Parsed ${rows.length} rows from ${file.name}`);
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
    await db.transaction(
      'rw',
      db.areas,
      db.categories,
      db.products,
      db.pickLists,
      db.pickItems,
      async () => {
        const parseTimestamp = (value?: string) =>
          value && value.trim() !== '' ? Number(value) || now : now;

        // Areas
        if (parsedRows['areas']) {
          for (const row of parsedRows['areas']) {
            const name = normalizeName(row.name);
            if (!name) {
              addDetail('Skipped area with empty name');
              skipped += 1;
              continue;
            }
            if (areaNameToId.has(name)) {
              addDetail(`Area "${row.name}" exists, skipping`);
              skipped += 1;
              continue;
            }
            const id = row.id && !(await db.areas.get(row.id)) ? row.id : uuidv4();
            const area: Area = {
              id,
              name: row.name.trim(),
              created_at: parseTimestamp(row.created_at),
              updated_at: parseTimestamp(row.updated_at),
            };
            await db.areas.add(area);
            areaNameToId.set(name, id);
            inserted += 1;
            addDetail(`Created area "${area.name}"`);
          }
        }

        // Categories
        if (parsedRows['categories']) {
          for (const row of parsedRows['categories']) {
            const name = normalizeName(row.name);
            if (!name) {
              addDetail('Skipped category with empty name');
              skipped += 1;
              continue;
            }
            if (categoryNameToId.has(name)) {
              addDetail(`Category "${row.name}" exists, skipping`);
              skipped += 1;
              continue;
            }
            const id = row.id && !(await db.categories.get(row.id)) ? row.id : uuidv4();
            const category: Category = {
              id,
              name: row.name.trim(),
              created_at: parseTimestamp(row.created_at),
              updated_at: parseTimestamp(row.updated_at),
            };
            await db.categories.add(category);
            categoryNameToId.set(name, id);
            inserted += 1;
            addDetail(`Created category "${category.name}"`);
          }
        }

        // Products
        if (parsedRows['products']) {
          for (const row of parsedRows['products']) {
            const name = normalizeName(row.name);
            if (!name) {
              addDetail('Skipped product with empty name');
              skipped += 1;
              continue;
            }
            if (productNameToId.has(name)) {
              addDetail(`Product "${row.name}" exists, skipping`);
              skipped += 1;
              continue;
            }

            const categoryName = normalizeName(row.category);
            let categoryId = categoryName ? categoryNameToId.get(categoryName) : undefined;
            if (!categoryId && categoryName) {
              if (options.allowAutoCreateMissing) {
                const newId = uuidv4();
                categoryId = newId;
                categoryNameToId.set(categoryName, newId);
                await db.categories.add({
                  id: newId,
                  name: row.category.trim(),
                  created_at: now,
                  updated_at: now,
                });
                addDetail(`Auto-created category "${row.category}" for product "${row.name}"`);
              } else {
                addDetail(`Missing category for product "${row.name}", skipping`);
                skipped += 1;
                continue;
              }
            }

            const barcode = row.barcode?.trim();
            if (barcode && barcodeToProductId.has(barcode)) {
              addDetail(`Barcode ${barcode} already exists, clearing for product "${row.name}"`);
            }

            const id = row.id && !(await db.products.get(row.id)) ? row.id : uuidv4();
            const product: Product = {
              id,
              name: row.name.trim(),
              category: categoryId ?? '',
              unit_type: row.unit_type?.trim() || DEFAULT_UNIT_TYPE,
              bulk_name: row.bulk_name?.trim() || DEFAULT_BULK_NAME,
              barcode: barcode && !barcodeToProductId.has(barcode) ? barcode : undefined,
              archived: coerceBoolean(row.archived),
              created_at: parseTimestamp(row.created_at),
              updated_at: parseTimestamp(row.updated_at),
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

        // Pick lists
        if (parsedRows['pick-lists']) {
          for (const row of parsedRows['pick-lists']) {
            const inferredAreaName = normalizeName(row.area_name);
            const areaId = row.area_id || (inferredAreaName ? areaNameToId.get(inferredAreaName) : undefined);
            if (!areaId && !options.allowAutoCreateMissing) {
              addDetail(`Missing area for pick list, skipping`);
              skipped += 1;
              continue;
            }
            let resolvedAreaId = areaId;
            if (!resolvedAreaId && inferredAreaName) {
              const newAreaId = uuidv4();
              resolvedAreaId = newAreaId;
              areaNameToId.set(inferredAreaName, newAreaId);
              await db.areas.add({
                id: newAreaId,
                name: row.area_name.trim(),
                created_at: now,
                updated_at: now,
              });
              addDetail(`Auto-created area "${row.area_name}" for pick list`);
            }
            const categoriesFromRow = (row.categories || '')
              .split(';')
              .map((name) => normalizeName(name))
              .filter(Boolean);
            const categoryIds: string[] = [];
            for (const catName of categoriesFromRow) {
              let catId = categoryNameToId.get(catName);
              if (!catId && options.allowAutoCreateMissing) {
                const newId = uuidv4();
                catId = newId;
                categoryNameToId.set(catName, newId);
                await db.categories.add({
                  id: newId,
                  name: catName,
                  created_at: now,
                  updated_at: now,
                });
                addDetail(`Auto-created category "${catName}" for pick list`);
              }
              if (catId) categoryIds.push(catId);
            }

            const id = row.id && !(await db.pickLists.get(row.id)) ? row.id : uuidv4();
            const pickList: PickList = {
              id,
              area_id: resolvedAreaId ?? uuidv4(),
              created_at: parseTimestamp(row.created_at),
              completed_at: row.completed_at ? Number(row.completed_at) : undefined,
              notes: row.notes ?? '',
              categories: categoryIds,
              auto_add_new_products: coerceBoolean(row.auto_add_new_products),
            };
            await db.pickLists.add(pickList);
            if (pickList.notes) {
              pickListNameToId.set(normalizeName(pickList.notes), pickList.id);
            }
            inserted += 1;
            addDetail(`Created pick list ${pickList.id}`);
          }
        }

        // Pick items
        if (parsedRows['pick-items']) {
          for (const row of parsedRows['pick-items']) {
            const pickListId =
              row.pick_list_id || pickListNameToId.get(normalizeName(row.pick_list_name));
            const productId = row.product_id || productNameToId.get(normalizeName(row.product_name));

            if (!pickListId || !productId) {
              addDetail(`Missing pick list or product for pick item, skipping`);
              skipped += 1;
              continue;
            }

            const id = row.id && !(await db.pickItems.get(row.id)) ? row.id : uuidv4();
            const pickItem: PickItem = {
              id,
              pick_list_id: pickListId,
              product_id: productId,
              quantity: coerceNumber(row.quantity) || 1,
              is_carton: coerceBoolean(row.is_carton),
              status: (row.status as PickItemStatus) || 'pending',
              created_at: parseTimestamp(row.created_at),
              updated_at: parseTimestamp(row.updated_at),
            };
            await db.pickItems.add(pickItem);
            inserted += 1;
            addDetail(`Added pick item for product ${row.product_name ?? pickItem.product_id}`);
          }
        }
      },
    );
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
