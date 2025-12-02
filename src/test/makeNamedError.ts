export function makeNamedError(name: string, message?: string) {
  const error = new Error(message ?? name);
  error.name = name;
  return error;
}
