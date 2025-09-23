// 快速验证 basePath 功能
const { createPathMatcher, extractActualBasename, isRegexPattern } = require('./multimodal/tarko/shared-utils/dist/webui-routing.js');

console.log('🧪 Quick BasePath Function Test\n');

// 测试用例
const testCases = [
  // Static basePath tests
  { basePath: '/foo', testPath: '/foo', expected: { matches: true, extracted: '/' } },
  { basePath: '/foo', testPath: '/foo/chat', expected: { matches: true, extracted: '/chat' } },
  { basePath: '/foo', testPath: '/bar', expected: { matches: false, extracted: '/bar' } },
  
  // Regex basePath tests  
  { basePath: '/tenant-.+', testPath: '/tenant-abc', expected: { matches: true, extracted: '/' } },
  { basePath: '/tenant-.+', testPath: '/tenant-xyz/dashboard', expected: { matches: true, extracted: '/dashboard' } },
  { basePath: '/tenant-.+', testPath: '/other-abc', expected: { matches: false, extracted: '/other-abc' } },
  
  // Complex regex tests
  { basePath: '/(dev|staging|prod)/app', testPath: '/dev/app', expected: { matches: true, extracted: '/' } },
  { basePath: '/(dev|staging|prod)/app', testPath: '/staging/app/settings', expected: { matches: true, extracted: '/settings' } },
  { basePath: '/(dev|staging|prod)/app', testPath: '/test/app', expected: { matches: false, extracted: '/test/app' } },
  
  // Undefined basePath tests
  { basePath: undefined, testPath: '/any/path', expected: { matches: true, extracted: '/any/path' } },
];

console.log('📋 Running test cases...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const { basePath, testPath, expected } = testCase;
  
  console.log(`Test ${index + 1}: ${basePath || 'undefined'} -> ${testPath}`);
  
  // Test createPathMatcher
  const matcher = createPathMatcher(basePath);
  const matches = matcher.test(testPath);
  const extracted = matcher.extract(testPath);
  
  // Test extractActualBasename
  const basename = extractActualBasename(basePath, testPath);
  
  // Check results
  const matchesOk = matches === expected.matches;
  const extractedOk = extracted === expected.extracted;
  
  if (matchesOk && extractedOk) {
    console.log(`  ✅ PASS - matches: ${matches}, extracted: ${extracted}, basename: ${basename}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL - expected matches: ${expected.matches}, got: ${matches}`);
    console.log(`           expected extracted: ${expected.extracted}, got: ${extracted}`);
    failed++;
  }
  
  // Show regex detection
  if (basePath) {
    console.log(`  🔍 isRegexPattern: ${isRegexPattern(basePath)}`);
  }
  
  console.log('');
});

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! BasePath functionality is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please check the implementation.');
}

console.log('\n🌐 Real-world examples:');
console.log('Static deployment:     /agent-ui/chat -> basePath: /agent-ui');
console.log('Multi-tenant:          /tenant-company1/dashboard -> basePath: /tenant-.+');
console.log('Environment-specific:  /dev/app/settings -> basePath: /(dev|staging|prod)/app');
console.log('Random ID:             /abc123xyz/workspace -> basePath: /[a-zA-Z0-9]+');