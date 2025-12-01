export function makeNamedError(name: string, message?: string) {
  const error = new Error(message ?? name);
  (error as any).name = name;
  return error;
}
