/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/tests/manual/test.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
type Baz = { qux: string } | undefined;

const bar = {
  baz: {
    qux: 'quux',
  } as Baz,
};

console.log(bar);

console.log('bar.baz', bar.baz);

console.log('bar.baz.qux', bar.baz?.qux);

function setRandom(): Baz {
  return Math.random() > 0.5 ? { qux: 'random' } : undefined;
}

bar.baz = setRandom();

console.log('bar.baz.qux', bar.baz?.qux);

type FooString = { foo?: string };

console.log();
function dump(fooString: FooString) {
  if (fooString.foo) {
    console.log(fooString.foo);
  } else {
    console.log('NOPE');
  }
}

const foo: FooString = { foo: 'bar' };
dump(foo);

const foo1 = { foo: undefined } as FooString;
dump(foo1);

const foo2 = { foo: '' } as FooString;
dump(foo2);

const hello = [1, 2];

console.log([3].concat(hello));
