// src/platform/web.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { isOnline, triggerDownload } from './web';

describe('platform web utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isOnline uses navigator.onLine when available', () => {
    const originalNavigator = (globalThis as any).navigator;
    try {
      vi.stubGlobal('navigator', { onLine: false } as any);
      expect(isOnline()).toBe(false);

      vi.stubGlobal('navigator', { onLine: true } as any);
      expect(isOnline()).toBe(true);
    } finally {
      if (originalNavigator !== undefined) {
        vi.stubGlobal('navigator', originalNavigator);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('isOnline returns true when navigator missing', () => {
    const originalNavigator = (globalThis as any).navigator;
    try {
      vi.stubGlobal('navigator', undefined as any);
      expect(isOnline()).toBe(true);
    } finally {
      if (originalNavigator !== undefined) {
        vi.stubGlobal('navigator', originalNavigator);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('triggerDownload calls createObjectURL, click and revokeObjectURL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL } as any);

    const clickMock = vi.fn();
    const anchor: any = { href: '', download: '', click: clickMock };

    const origCreateElement = document.createElement.bind(document);
    (document as any).createElement = (tag: string) => {
      if (tag === 'a') return anchor;
      return origCreateElement(tag);
    };

    try {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      triggerDownload(blob, 'file.txt');

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    } finally {
      (document as any).createElement = origCreateElement;
      vi.unstubAllGlobals();
    }
  });
});
