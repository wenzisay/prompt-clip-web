import { describe, expect, it } from 'vitest';
import { createFakeFileRepository, createFakeWorkspace } from './fakeFileRepository';

describe('fakeFileRepository.readTextHead', () => {
  const workspace = createFakeWorkspace();

  it('returns the first N bytes when the file is larger than the limit', async () => {
    const repository = createFakeFileRepository({
      files: { 'a.md': 'Hello, World! 0123456789' },
    });
    const head = await repository.readTextHead(workspace, 'a.md', 13);
    expect(head).toBe('Hello, World!');
  });

  it('returns the full content when the file is smaller than the limit', async () => {
    const repository = createFakeFileRepository({
      files: { 'a.md': 'short' },
    });
    const head = await repository.readTextHead(workspace, 'a.md', 100);
    expect(head).toBe('short');
  });

  it('does not throw on UTF-8 multi-byte characters at the boundary', async () => {
    const repository = createFakeFileRepository({
      files: { 'cn.md': '你好世界你好世界' },
    });
    // Each Chinese character is 3 bytes in UTF-8, request 5 bytes (cuts mid-char).
    const head = await repository.readTextHead(workspace, 'cn.md', 5);
    // Decoder with fatal:false should produce a valid (possibly shorter) string.
    expect(typeof head).toBe('string');
    expect(head.length).toBeLessThanOrEqual(2);
  });

  it('throws when the file does not exist', async () => {
    const repository = createFakeFileRepository();
    await expect(repository.readTextHead(workspace, 'missing.md', 10)).rejects.toThrow();
  });
});
