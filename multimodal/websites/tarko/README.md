# Tarko Documentation

This is the documentation site for Tarko - Tool-augmented Agent Runtime Kernel.

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building

```bash
pnpm build
```

### Preview

```bash
pnpm preview
```

## Project Structure

```
.
├── docs/                 # Documentation content
│   ├── en/              # English documentation
│   │   ├── guide/       # Guide pages
│   │   ├── api/         # API reference
│   │   ├── examples/    # Examples
│   │   └── index.mdx    # Homepage
│   ├── zh/              # Chinese documentation
│   └── public/          # Static assets
├── src/                 # React components (if needed)
├── i18n.json           # Internationalization config
├── rspress.config.ts   # Rspress configuration
└── package.json
```

## Writing Documentation

### Adding New Pages

1. Create a new `.mdx` file in the appropriate directory under `docs/en/` or `docs/zh/`
2. Add frontmatter with title and description
3. Update the corresponding `_meta.json` file to include the new page in navigation

### Markdown Extensions

This site supports:

- Standard Markdown
- MDX (React components in Markdown)
- Mermaid diagrams
- Code syntax highlighting
- Custom components (if added to `src/components/`)

### Navigation

- Top-level navigation is configured in `docs/{locale}/_meta.json`
- Sidebar navigation is configured in `docs/{locale}/{section}/_meta.json`

## Deployment

The documentation is built and deployed automatically. For manual deployment:

1. Build the site:
   ```bash
   pnpm build
   ```

2. Deploy the `dist` folder to your hosting provider.

## Contributing

Contributions are welcome! Please:

1. Follow the existing documentation structure
2. Write clear, concise content
3. Test your changes locally before submitting
4. Update both English and Chinese versions when applicable

## License

Apache 2.0 License
