export const coerceBoolean = (value: string | boolean | undefined) => {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return value.toString().toLowerCase() === 'true';
};

export const coerceNumber = (value: string | number | undefined) => {
  if (typeof value === 'number') return value;
  const parsed = Number(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
};
