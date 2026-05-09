#!/bin/bash

echo "🔍 Verifying Agent TARS Web Build..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count files
echo ""
echo "📊 File Counts:"
echo "  TypeScript/TSX files: $(find apps/agent-tars-web -name '*.ts' -o -name '*.tsx' | wc -l)"
echo "  CSS files: $(find apps/agent-tars-web -name '*.css' | wc -l)"
echo "  Config files: $(find apps/agent-tars-web -maxdepth 1 -name '*.json' -o -name '*.ts' -o -name '*.mjs' | wc -l)"
echo "  Markdown docs: $(find . -maxdepth 2 -name '*.md' | wc -l)"
echo "  Total files: $(find apps/agent-tars-web -type f | wc -l)"

# Check critical files
echo ""
echo "✅ Critical Files Check:"
critical_files=(
  "apps/agent-tars-web/package.json"
  "apps/agent-tars-web/app/layout.tsx"
  "apps/agent-tars-web/app/page.tsx"
  "apps/agent-tars-web/app/[sessionId]/page.tsx"
  "apps/agent-tars-web/lib/types/index.ts"
  "apps/agent-tars-web/lib/store/index.ts"
  "apps/agent-tars-web/components/providers.tsx"
  "apps/agent-tars-web/components/layout/shell.tsx"
  "apps/agent-tars-web/components/chat/chat-panel.tsx"
  "apps/agent-tars-web/app/api/sessions/route.ts"
  "apps/agent-tars-web/app/globals.css"
  "apps/agent-tars-web/.env.example"
)

for file in "${critical_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
  fi
done

# Check documentation
echo ""
echo "📚 Documentation Files:"
docs=(
  "MASTER_GUIDE.md"
  "QUICKSTART.md"
  "README.md"
  "COMPONENTS_OVERVIEW.md"
  ".env.example"
  "DOCKER.md"
  "DEPLOY_VERCEL.md"
  "TESTING.md"
)

for doc in "${docs[@]}"; do
  if [ -f "apps/agent-tars-web/$doc" ]; then
    lines=$(wc -l < "apps/agent-tars-web/$doc")
    echo "  ✓ $doc ($lines lines)"
  else
    echo "  ✗ $doc (MISSING)"
  fi
done

# Check deployment files
echo ""
echo "🐳 Deployment Files:"
deployment=(
  "apps/agent-tars-web/Dockerfile"
  "apps/agent-tars-web/docker-compose.yml"
)

for file in "${deployment[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $(basename $file)"
  else
    echo "  ✗ $(basename $file) (MISSING)"
  fi
done

# Check root documentation
echo ""
echo "📄 Root Documentation:"
root_docs=(
  "AGENT_TARS_WEB_FINAL_REPORT.md"
  "AGENT_TARS_WEB_DELIVERABLES.md"
  "AGENT_TARS_WEB_COMPLETION.md"
  "AGENT_TARS_WEB_IMPLEMENTATION.md"
  "AGENT_TARS_WEB_INDEX.md"
  "DOCUMENTATION_INDEX.md"
)

for doc in "${root_docs[@]}"; do
  if [ -f "$doc" ]; then
    lines=$(wc -l < "$doc")
    echo "  ✓ $doc ($lines lines)"
  else
    echo "  ✗ $doc (MISSING)"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Build Verification Complete!"
echo ""
echo "Next Steps:"
echo "  1. cd apps/agent-tars-web"
echo "  2. cat QUICKSTART.md"
echo "  3. npm install"
echo "  4. cp .env.example .env.local"
echo "  5. Add your OPENAI_API_KEY to .env.local"
echo "  6. npm run dev"
echo ""
echo "For full documentation, see: DOCUMENTATION_INDEX.md"
