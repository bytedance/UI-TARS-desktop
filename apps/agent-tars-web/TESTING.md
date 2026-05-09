# Agent TARS Web - Testing Guide

## Running Tests

### Unit Tests

```bash
cd apps/agent-tars-web
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Lint Check

```bash
npm run lint
```

## Manual Testing Checklist

### Authentication & Sessions
- [ ] Create new session from home page
- [ ] Session appears in sidebar
- [ ] Session can be renamed
- [ ] Session can be deleted
- [ ] Search sessions by title
- [ ] Click session to load it

### Chat Interface
- [ ] Type message in input
- [ ] Send with button click
- [ ] Send with Ctrl+Enter
- [ ] Message appears in chat
- [ ] Agent responds
- [ ] Message scrolls into view
- [ ] Clear messages on new session

### Image Upload
- [ ] Upload image with file button
- [ ] Preview appears in input
- [ ] Send message with image
- [ ] Image loads in assistant message
- [ ] Delete image preview
- [ ] Support multiple images

### Settings
- [ ] Open settings modal
- [ ] Change API key
- [ ] Change model
- [ ] Adjust temperature slider
- [ ] Enable/disable thinking
- [ ] Save settings
- [ ] Settings persist on reload

### Workspace Panel
- [ ] Panel opens on tool execution
- [ ] Tab appears for each result
- [ ] Switch between tabs
- [ ] Close individual results
- [ ] Scroll workspace content
- [ ] Results render correctly

### Browser Tools
- [ ] Navigate to website
- [ ] Click elements
- [ ] Fill forms
- [ ] Take screenshot
- [ ] Extract text
- [ ] Search web
- [ ] View results

### Responsive Design
- [ ] Desktop view (1920px)
- [ ] Tablet view (768px)
- [ ] Mobile view (375px)
- [ ] Sidebar collapses on mobile
- [ ] Touch input works
- [ ] No horizontal scroll

### Accessibility
- [ ] Keyboard navigation (Tab)
- [ ] Focus visible
- [ ] Screen reader testing
- [ ] Color contrast
- [ ] Form labels present
- [ ] Error messages clear

### Performance
- [ ] Messages load quickly
- [ ] Workspace renders smoothly
- [ ] No jank during scroll
- [ ] Images load efficiently
- [ ] API calls complete fast

### Error Handling
- [ ] Invalid API key shows error
- [ ] Network error handled
- [ ] Tool failure shows error
- [ ] Error message is clear
- [ ] Can retry after error

## Testing Tools

### Browser DevTools
```javascript
// Check console for errors
// Inspect elements
// Monitor network requests
// Profile performance
```

### Vercel Analytics
- Visit dashboard.vercel.com
- View Web Vitals
- Check error rates
- Monitor API performance

### Local Testing
```bash
# Start dev server
npm run dev

# In another terminal, monitor logs
npm run test:watch

# Run tests in CI mode
npm test -- --ci
```

## API Testing

### Test with cURL

```bash
# Create session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json"

# Send message
curl -X POST http://localhost:3000/api/sessions/SESSION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is 2+2?"
  }'
```

### Test with Postman

1. Import API collection from `postman.json`
2. Set variables:
   - `base_url`: http://localhost:3000
   - `session_id`: Your session ID
3. Run requests

## Performance Testing

### Lighthouse

```bash
# Run Lighthouse in Chrome DevTools
# Or use CLI:
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

Targets:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost:3000
```

## Browser Compatibility

Test in these browsers:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Test Scenarios

### Scenario 1: Web Search
1. Enter: "weather in San Francisco"
2. Agent should search and provide results
3. Verify results display in workspace

### Scenario 2: Website Navigation
1. Enter: "go to github.com and search for React"
2. Agent navigates to site
3. Performs search
4. Displays results

### Scenario 3: Form Filling
1. Enter: "Create account on example.com"
2. Agent finds form fields
3. Fills values
4. Submits form

### Scenario 4: Data Extraction
1. Enter: "Extract data from table on webpage"
2. Agent navigates
3. Extracts table data
4. Displays results

### Scenario 5: Multi-Step Task
1. Enter: "Find cheapest flight to NYC next week"
2. Agent performs multiple searches
3. Compares options
4. Provides recommendation

## Debugging

### Enable Debug Logging

```bash
# In .env.local
DEBUG=agent-tars:*
```

### Check Browser Console
- F12 in Chrome
- Cmd+Opt+I in Safari
- F12 in Firefox
- Look for error messages

### Check Network Tab
- Monitor API calls
- Verify response data
- Check timing

### Check Application Tab
- Inspect localStorage
- View session data
- Check cookies

## Common Issues & Solutions

### Issue: Message not sending
**Solution:**
1. Check API key is set
2. Verify network request succeeded
3. Look for error in console
4. Check API response

### Issue: Workspace not showing
**Solution:**
1. Verify tool execution succeeded
2. Check result data format
3. Inspect workspace component
4. Monitor console errors

### Issue: Settings not saving
**Solution:**
1. Check localStorage is enabled
2. Verify settings object structure
3. Inspect browser storage
4. Check for JS errors

### Issue: Images not loading
**Solution:**
1. Verify image URL is valid
2. Check CORS headers
3. Inspect network tab
4. Try different image format

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Coverage Goals

Target test coverage:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Test Data

### Sample Sessions
```javascript
{
  id: "session-001",
  title: "Weather Search",
  createdAt: "2024-01-01T12:00:00Z",
  messages: [...]
}
```

### Sample Messages
```javascript
{
  id: "msg-001",
  role: "user",
  content: "What is the weather?",
  createdAt: "2024-01-01T12:00:00Z"
}
```

## Performance Baselines

Expected performance:
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s
- CLS (Cumulative Layout Shift): < 0.1
- TTFB (Time to First Byte): < 600ms

## Accessibility Testing

### Tools
- axe DevTools
- WAVE
- Lighthouse
- VoiceOver (Mac)
- NVDA (Windows)

### Checklist
- All images have alt text
- Buttons are keyboard accessible
- Focus order is logical
- Color contrast is sufficient
- Text is resizable
- No autoplay media

## Next Steps

1. Set up test environment
2. Run manual test checklist
3. Fix any issues
4. Set up CI/CD
5. Monitor in production

For more info, see:
- README.md
- COMPONENTS_OVERVIEW.md
- AGENT_TARS_WEB_IMPLEMENTATION.md
