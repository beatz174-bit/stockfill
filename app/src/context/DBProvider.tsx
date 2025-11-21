import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { db, initializeDatabase, StockFillDB } from '../db';

const DatabaseContext = createContext<StockFillDB | null>(null);

export const DBProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      await initializeDatabase();
      setReady(true);
    };
    void setup();
  }, []);

  if (!ready) {
    return <div>Loading database...</div>;
  }

  return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
};

export const useDatabase = () => {
  const instance = useContext(DatabaseContext);
  if (!instance) {
    throw new Error('Database not available');
  }
  return instance;
};
