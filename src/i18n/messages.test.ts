import { describe, expect, it } from 'vitest';
import { messages } from './messages';

describe('messages', () => {
  it('contains English labels for the main workspace chrome', () => {
    const app = messages['en-US'].app;

    expect(app.tags).toBe('Tags');
    expect(app.pinnedTags).toBe('Pinned tags');
    expect(app.allTags).toBe('All tags');
    expect(app.localStorage).toBe('Data is stored locally');
    expect(app.searchPlaceholder).toBe('Quick search');
    expect(app.quickSwitch).toBe('Quick switch');
    expect(app.all).toBe('All');
    expect(app.recent).toBe('Recent');
    expect(app.favorites).toBe('Favorites');
    expect(app.select).toBe('Select');
    expect(app.unfavorite).toBe('Unfavorite');
    expect(app.edit).toBe('Edit');
    expect(app.delete).toBe('Delete');
    expect(app.editPrompt).toBe('Edit prompt');
    expect(app.content).toBe('Content');
    expect(app.characterCount(12)).toBe('12 characters');
    expect(app.usageCount(2)).toBe('Used 2 times');
    expect(app.favorited).toBe('Favorited');
    expect(app.title).toBe('Title');
    expect(app.add).toBe('Add');
    expect(app.save).toBe('Save');
  });
});
