import { describe, it, expect } from 'vitest';
import { SnapshotNormalizer } from './snapshot-normalizer';

describe('SnapshotNormalizer', () => {
  it('should normalize basic fields correctly', () => {
    const normalizer = new SnapshotNormalizer();

    const input = {
      id: 'abc123',
      userId: 'user_456',
      timestamp: 1625097600000,
      name: 'Test User',
      createdAt: 1625097600000,
    };

    const normalized = normalizer.normalize(input);

    expect(normalized).toEqual({
      id: '<<ID>>',
      userId: '<<ID>>',
      timestamp: '<<TIMESTAMP>>',
      name: 'Test User',
      createdAt: 1625097600000, // not matched by default patterns
    });
  });

  it('should normalize nested objects', () => {
    const normalizer = new SnapshotNormalizer();

    const input = {
      id: 'abc123',
      user: {
        id: 'user_456',
        profile: {
          userId: 'profile_789',
          lastLoginTime: 1625097600000,
        },
      },
      timestamp: 1625097600000,
    };

    const normalized = normalizer.normalize(input);

    expect(normalized).toEqual({
      id: '<<ID>>',
      user: {
        id: '<<ID>>',
        profile: {
          userId: '<<ID>>',
          lastLoginTime: '<<TIMESTAMP>>',
        },
      },
      timestamp: '<<TIMESTAMP>>',
    });
  });

  it('should normalize arrays', () => {
    const normalizer = new SnapshotNormalizer();

    const input = {
      items: [
        { id: 'item1', timestamp: 1625097600000 },
        { id: 'item2', timestamp: 1625097700000 },
      ],
    };

    const normalized = normalizer.normalize(input);

    expect(normalized).toEqual({
      items: [
        { id: '<<ID>>', timestamp: '<<TIMESTAMP>>' },
        { id: '<<ID>>', timestamp: '<<TIMESTAMP>>' },
      ],
    });
  });

  it('should support custom normalizers', () => {
    const normalizer = new SnapshotNormalizer({
      customNormalizers: [
        {
          pattern: 'email',
          normalizer: () => '<<EMAIL>>',
        },
        {
          pattern: /^secret/,
          normalizer: () => '<<REDACTED>>',
        },
      ],
    });

    const input = {
      id: 'abc123',
      email: 'user@example.com',
      secretKey: 'very-secret-value',
      secretToken: 'another-secret',
    };

    const normalized = normalizer.normalize(input);

    expect(normalized).toEqual({
      id: '<<ID>>',
      email: '<<EMAIL>>',
      secretKey: '<<REDACTED>>',
      secretToken: '<<REDACTED>>',
    });
  });

  it('should ignore specified fields', () => {
    const normalizer = new SnapshotNormalizer({
      fieldsToIgnore: ['password', /private/],
    });

    const input = {
      id: 'abc123',
      username: 'testuser',
      password: 'secret123',
      privateKey: 'very-private',
      privateData: { sensitive: true },
    };

    const normalized = normalizer.normalize(input);

    expect(normalized).toEqual({
      id: '<<ID>>',
      username: 'testuser',
      // password and private* fields should be removed
    });

    expect(normalized).not.toHaveProperty('password');
    expect(normalized).not.toHaveProperty('privateKey');
    expect(normalized).not.toHaveProperty('privateData');
  });

  it('should correctly compare two objects', () => {
    const normalizer = new SnapshotNormalizer();

    const obj1 = {
      id: 'abc123',
      timestamp: 1625097600000,
      data: { value: 42 },
    };

    const obj2 = {
      id: 'def456', // different ID, should be normalized
      timestamp: 1625097700000, // different timestamp, should be normalized
      data: { value: 42 }, // same data
    };

    const result = normalizer.compare(obj1, obj2);
    expect(result.equal).toBe(true);
    expect(result.diff).toBeNull();

    // Now with actually different data
    const obj3 = {
      id: 'abc123',
      timestamp: 1625097600000,
      data: { value: 43 }, // different value
    };

    const differentResult = normalizer.compare(obj1, obj3);
    expect(differentResult.equal).toBe(false);
    expect(differentResult.diff).not.toBeNull();
  });
});
