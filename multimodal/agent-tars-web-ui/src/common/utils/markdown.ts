export function wrapMarkdown(content: string, lang = 'md') {
  return `\`\`\`\` ${lang}\n${content}\n\`\`\`\``;
}
