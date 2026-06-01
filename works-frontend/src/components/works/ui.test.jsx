import { describe, it, expect } from 'vitest';
import { renderMd } from './ui';

// Guards the §17.3 contract: renderMd output is handed to dangerouslySetInnerHTML
// at the article/comment call sites, so user-supplied content must be sanitised.
describe('renderMd', () => {
  it('renders the supported markdown subset', () => {
    const html = renderMd('**bold** *italic* `code`\n- item');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code class="prose-md-code">code</code>');
    expect(html).toContain('<br>');
    expect(html).toContain('• item');
  });

  it('strips <script> tags from user-supplied content', () => {
    const html = renderMd('hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script');
    expect(html).toContain('hello');
  });

  it('strips event-handler and <img> XSS vectors', () => {
    const html = renderMd('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
  });

  it('returns an empty string for empty input', () => {
    expect(renderMd('')).toBe('');
    expect(renderMd(null)).toBe('');
  });
});
