import { describe, expect, it } from 'vitest';
import { LOCALE_OPTIONS, messages } from './messages';

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
    expect(app.noAnnotationSummary).toBe('No annotations');
    expect(app.annotationSummary(2)).toBe('2 annotations');
    expect(app.title).toBe('Title');
    expect(app.add).toBe('Add');
    expect(app.save).toBe('Save');
    expect(app.sharePrompt).toBe('Share');
    expect(app.shareImageTitle).toBe('Share image');
    expect(app.renderMarkdown).toBe('Render Markdown');
    expect(app.shareContentTruncated).toBe('Content truncated at 2000 characters.');
    expect(app.annotations).toBe('Annotations');
    expect(app.annotationImageTooLarge).toBe('Image must be 5MB or smaller');
    expect(app.openAnnotationImage).toBe('Open image preview');
    expect(messages['zh-CN'].app.sharePrompt).toBe('分享');
    expect(messages['zh-TW'].app.sharePrompt).toBe('分享');
    expect(messages['zh-CN'].app.annotations).toBe('批注');
    expect(messages['zh-TW'].app.annotations).toBe('批註');
    expect(messages['zh-CN'].settings.shareAuthorTitle).toBe('分享作者');
    expect(messages['zh-TW'].settings.shareAuthorTitle).toBe('分享作者');
    expect(messages['en-US'].settings.shareAuthorTitle).toBe('Share author');
  });

  it('contains the landing feature card copy', () => {
    const app = messages['zh-CN'].app;

    expect(app.featureLocalTitle).toBe('Local First');
    expect(app.featureLocalDescription).toEqual([
      '数据存储在本地，隐私安全，数据只属于你。',
    ]);
    expect(app.featureFastTitle).toBe('File over app');
    expect(app.featureFastDescription).toEqual([
      '采用完全开放的 Markdown 文件存储数据，自由迁移。',
    ]);
    expect(app.featureMarkdownTitle).toBe('多端APP');
    expect(app.featureMarkdownDescription).toEqual([
      'Web App、iOS（iPhone/iOS）、Windows、Mac。',
    ]);
    expect(messages['en-US'].app.featureMarkdownTitle).toBe('Multi-platform apps');
  });

  it('contains Japanese labels and exposes Japanese as a selectable locale', () => {
    expect(LOCALE_OPTIONS).toContainEqual({ value: 'ja-JP', label: '日本語' });

    const app = messages['ja-JP'].app;

    expect(app.tags).toBe('タグ');
    expect(app.searchPlaceholder).toBe('クイック検索');
    expect(app.createPrompt).toBe('新規 Prompt (Cmd+N)');
    expect(app.shareImageTitle).toBe('共有画像を生成');
    expect(app.annotations).toBe('注釈');
    expect(app.annotationSummary(2)).toBe('2 件の注釈');
    expect(messages['ja-JP'].settings.languageTitle).toBe('言語');
    expect(messages['ja-JP'].settings.shareAuthorTitle).toBe('共有作者');
  });

  it.each(['zh-CN', 'zh-TW', 'en-US', 'ja-JP'] as const)(
    'exposes client download copy in %s',
    (locale) => {
      const app = messages[locale].app;

      // 防漏译：四种语言都必须提供下载入口文案
      expect(typeof app.downloadClientDivider).toBe('string');
      expect(app.downloadClientDivider.length).toBeGreaterThan(0);
      expect(app.downloadIOS).toBe('iOS App');
      expect(typeof app.downloadDesktop).toBe('string');
      expect(app.downloadDesktop.length).toBeGreaterThan(0);
    }
  );

  it('contains the client download copy for the landing page', () => {
    expect(messages['zh-CN'].app.downloadClientDivider).toBe('或下载客户端');
    expect(messages['zh-CN'].app.downloadDesktop).toBe('桌面版');
    expect(messages['en-US'].app.downloadClientDivider).toBe(
      'Or download the apps'
    );
    expect(messages['en-US'].app.downloadDesktop).toBe('Desktop');
  });
});
