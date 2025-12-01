export const stubDownloads = (vi: any) => {
  const anchor = { href: '', download: '', click: vi.fn() } as any;
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('document', { createElement: () => anchor });
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  return { anchor, createObjectURL, revokeObjectURL };
};
