import { describe, expect, it } from 'vitest';
import { createLivePreviewMarkdown } from '../src/shared/markdown-live-preview';

describe('markdown live preview', () => {
  it('uses the editable markdown content as the preview source', () => {
    expect(createLivePreviewMarkdown('# 今天\n\n- [ ] 买咖啡')).toBe('# 今天\n\n- [ ] 买咖啡');
  });

  it('shows an empty-state markdown hint without changing saved content', () => {
    expect(createLivePreviewMarkdown('')).toBe('_空_');
  });
});
