// 快速验证 base 功能
const { createPathMatcher, extractActualBasename, isRegexPattern } = require('./multimodal/tarko/shared-utils/dist/webui-routing.js');

console.log('🧪 Quick Base Function Test\n');

// 测试用例
const testCases = [
  // Static base tests
  { base: '/foo', testPath: '/foo', expected: { matches: true, extracted: '/' } },
  { base: '/foo', testPath: '/foo/chat', expected: { matches: true, extracted: '/chat' } },
  { base: '/foo', testPath: '/bar', expected: { matches: false, extracted: '/bar' } },
  
  // Regex base tests  
  { base: '/tenant-.+', testPath: '/tenant-abc', expected: { matches: true, extracted: '/' } },
  { base: '/tenant-.+', testPath: '/tenant-xyz/dashboard', expected: { matches: true, extracted: '/dashboard' } },
  { base: '/tenant-.+', testPath: '/other-abc', expected: { matches: false, extracted: '/other-abc' } },
  
  // Complex regex tests
  { base: '/(dev|staging|prod)/app', testPath: '/dev/app', expected: { matches: true, extracted: '/' } },
  { base: '/(dev|staging|prod)/app', testPath: '/staging/app/settings', expected: { matches: true, extracted: '/settings' } },
  { base: '/(dev|staging|prod)/app', testPath: '/test/app', expected: { matches: false, extracted: '/test/app' } },
  
  // Undefined base tests
  { base: undefined, testPath: '/any/path', expected: { matches: true, extracted: '/any/path' } },
];

console.log('📋 Running test cases...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const { base, testPath, expected } = testCase;
  
  console.log(`Test ${index + 1}: ${base || 'undefined'} -> ${testPath}`);
  
  // Test createPathMatcher
  const matcher = createPathMatcher(base);
  const matches = matcher.test(testPath);
  const extracted = matcher.extract(testPath);
  
  // Test extractActualBasename
  const basename = extractActualBasename(base, testPath);
  
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
  if (base) {
    console.log(`  🔍 isRegexPattern: ${isRegexPattern(base)}`);
  }
  
  console.log('');
});

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Base functionality is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please check the implementation.');
}

console.log('\n🌐 Real-world examples:');
console.log('Static deployment:     /agent-ui/chat -> base: /agent-ui');
console.log('Multi-tenant:          /tenant-company1/dashboard -> base: /tenant-.+');
console.log('Environment-specific:  /dev/app/settings -> base: /(dev|staging|prod)/app');
console.log('Random ID:             /abc123xyz/workspace -> base: /[a-zA-Z0-9]+');