import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { useDatabase } from '../context/DBProvider';
import { Area } from '../models/Area';
import { PickItem } from '../models/PickItem';
import { PickList } from '../models/PickList';
import { Product } from '../models/Product';

export const useProducts = () => {
  const db = useDatabase();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() => db.products.toArray()).subscribe({
      next: setProducts,
    });
    return () => subscription.unsubscribe();
  }, [db]);
  return products;
};

export const useProduct = (id?: string) => {
  const db = useDatabase();
  const [product, setProduct] = useState<Product | undefined>();

  useEffect(() => {
    if (!id) return;
    const subscription = liveQuery(() => db.products.get(id)).subscribe({
      next: (value) => setProduct(value ?? undefined),
    });
    return () => subscription.unsubscribe();
  }, [db, id]);
  return product;
};

export const useAreas = () => {
  const db = useDatabase();
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() => db.areas.toArray()).subscribe({
      next: setAreas,
    });
    return () => subscription.unsubscribe();
  }, [db]);
  return areas;
};

export const usePickLists = () => {
  const db = useDatabase();
  const [lists, setLists] = useState<PickList[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() => db.pickLists.toArray()).subscribe({
      next: setLists,
    });
    return () => subscription.unsubscribe();
  }, [db]);
  return lists;
};

export const usePickList = (id?: string) => {
  const db = useDatabase();
  const [list, setList] = useState<PickList | undefined>();

  useEffect(() => {
    if (!id) return;
    const subscription = liveQuery(() => db.pickLists.get(id)).subscribe({
      next: (value) => setList(value ?? undefined),
    });
    return () => subscription.unsubscribe();
  }, [db, id]);
  return list;
};

export const usePickItems = (pickListId?: string) => {
  const db = useDatabase();
  const [items, setItems] = useState<PickItem[]>([]);

  useEffect(() => {
    if (!pickListId) return undefined;
    const subscription = liveQuery(() =>
      db.pickItems.where('pick_list_id').equals(pickListId).toArray(),
    ).subscribe({
      next: setItems,
    });
    return () => subscription.unsubscribe();
  }, [db, pickListId]);
  return items;
};
