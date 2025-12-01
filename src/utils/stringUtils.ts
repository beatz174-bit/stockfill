export const normalizeName = (value?: string) =>
  (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

export const typeHints: Record<string, string[]> = {
  areas: ['area'],
  categories: ['category'],
  products: ['product'],
  'pick-lists': ['picklist', 'pick-list'],
  'pick-items': ['pickitem', 'pick-item'],
};

export const inferTypeFromName = (
  name: string,
): (keyof typeof typeHints) | undefined => {
  const lowercase = name.toLowerCase();
  return (Object.keys(typeHints) as Array<keyof typeof typeHints>).find((key) =>
    typeHints[key].some((hint) => lowercase.includes(hint)),
  );
};
