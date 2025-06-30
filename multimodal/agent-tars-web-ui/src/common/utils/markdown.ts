export function wrapMarkdown(content: string, lang = 'md') {
  if (lang === 'md' || lang === 'markdown') {
    return `\`\`\`\` ${lang}\n${content}\n\`\`\`\``;
  }
  return content;
}
