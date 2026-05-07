export function createLivePreviewMarkdown(content: string): string {
  return content.trim() ? content : '_空_';
}
