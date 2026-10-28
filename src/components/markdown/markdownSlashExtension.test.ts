import { describe, expect, it } from 'vitest';
import { slashSegmentBeforeCursor } from './markdownSlashExtension';

describe('slashSegmentBeforeCursor', () => {
  it('matches slash at line start', () => {
    expect(slashSegmentBeforeCursor('/')).toEqual({ fromOffset: 0, query: '' });
    expect(slashSegmentBeforeCursor('/h')).toEqual({ fromOffset: 0, query: 'h' });
  });

  it('matches slash after whitespace', () => {
    expect(slashSegmentBeforeCursor('hello /bold')).toEqual({ fromOffset: 6, query: 'bold' });
  });

  it('ignores slashes inside words or URLs', () => {
    expect(slashSegmentBeforeCursor('http://')).toBeNull();
    expect(slashSegmentBeforeCursor('path/to')).toBeNull();
  });
});
