import { describe, expect, test, vi, beforeEach } from 'vitest';

describe('main entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  test('renders app when root element exists', async () => {
    const render = vi.fn();
    vi.doMock('react-dom/client', () => ({
      default: { createRoot: () => ({ render }) },
      createRoot: () => ({ render }),
    }));

    await import('../../src/main');

    expect(render).toHaveBeenCalled();
  });

  test('throws when root element is missing', async () => {
    document.body.innerHTML = '';
    vi.doMock('react-dom/client', () => ({
      default: { createRoot: () => ({ render: vi.fn() }) },
      createRoot: () => ({ render: vi.fn() }),
    }));

    await expect(import('../../src/main')).rejects.toThrow('Root element not found');
  });
});
