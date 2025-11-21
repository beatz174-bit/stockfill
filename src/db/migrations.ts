import { StockFillDB } from './index';

export const applyMigrations = async (db: StockFillDB) => {
  // Future migrations can be added here.
  await db.open();
};
