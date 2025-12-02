type VitestMocker = typeof import('vitest')['vi'];

export const stubDownloads = (vi: VitestMocker) => {
  const anchor: { href: string; download: string; click: ReturnType<VitestMocker['fn']> } = {
    href: '',
    download: '',
    click: vi.fn(),
  };
  const createObjectURL = vi.fn(() => 'blob:url');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('document', { createElement: () => anchor });
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  return { anchor, createObjectURL, revokeObjectURL };
};
