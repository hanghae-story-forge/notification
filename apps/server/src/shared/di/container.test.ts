import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { container, createToken } from './container';
import { DIContainer } from './container';

describe('DIContainer', () => {
  let testContainer: DIContainer;

  beforeEach(() => {
    testContainer = new DIContainer();
  });

  afterEach(() => {
    testContainer.clear();
  });

  describe('Basic Registration and Resolution', () => {
    it('should register and resolve a simple dependency', () => {
      const TEST_TOKEN = createToken<string>('TestToken');

      testContainer.register(TEST_TOKEN, () => 'test-value');

      const result = testContainer.resolve<string>(TEST_TOKEN);
      expect(result).toBe('test-value');
    });

    it('should register and resolve a class instance', () => {
      class TestService {
        getValue() {
          return 'service-value';
        }
      }

      const SERVICE_TOKEN = createToken<TestService>('TestService');

      testContainer.register(SERVICE_TOKEN, () => new TestService());

      const service = testContainer.resolve<TestService>(SERVICE_TOKEN);
      expect(service.getValue()).toBe('service-value');
    });

    it('should throw an error when resolving unregistered dependency', () => {
      const UNREGISTERED_TOKEN = createToken<string>('UnregisteredToken');

      expect(() => testContainer.resolve<string>(UNREGISTERED_TOKEN)).toThrow(
        'Dependency not found'
      );
    });
  });

  describe('Singleton Lifecycle', () => {
    it('should return the same instance for singletons', () => {
      class SingletonService {
        counter = 0;
        increment() {
          this.counter++;
        }
      }

      const SINGLETON_TOKEN = createToken<SingletonService>('SingletonService');

      testContainer.register(
        SINGLETON_TOKEN,
        () => new SingletonService(),
        'singleton'
      );

      const instance1 =
        testContainer.resolve<SingletonService>(SINGLETON_TOKEN);
      const instance2 =
        testContainer.resolve<SingletonService>(SINGLETON_TOKEN);

      instance1.increment();
      expect(instance2.counter).toBe(1);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Transient Lifecycle', () => {
    it('should return a new instance for each resolution', () => {
      class TransientService {
        counter = 0;
        increment() {
          this.counter++;
        }
      }

      const TRANSIENT_TOKEN = createToken<TransientService>('TransientService');

      testContainer.register(
        TRANSIENT_TOKEN,
        () => new TransientService(),
        'transient'
      );

      const instance1 =
        testContainer.resolve<TransientService>(TRANSIENT_TOKEN);
      const instance2 =
        testContainer.resolve<TransientService>(TRANSIENT_TOKEN);

      instance1.increment();
      expect(instance2.counter).toBe(0);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Dependency Chain Resolution', () => {
    it('should resolve dependencies with nested dependencies', () => {
      class Database {
        query() {
          return 'data';
        }
      }

      class Repository {
        constructor(private db: Database) {}
        get() {
          return this.db.query();
        }
      }

      class Service {
        constructor(private repo: Repository) {}
        execute() {
          return this.repo.get();
        }
      }

      const DB_TOKEN = createToken<Database>('Database');
      const REPO_TOKEN = createToken<Repository>('Repository');
      const SERVICE_TOKEN = createToken<Service>('Service');

      testContainer.register(DB_TOKEN, () => new Database(), 'singleton');
      testContainer.register(
        REPO_TOKEN,
        () => new Repository(testContainer.resolve(DB_TOKEN)),
        'singleton'
      );
      testContainer.register(
        SERVICE_TOKEN,
        () => new Service(testContainer.resolve(REPO_TOKEN)),
        'singleton'
      );

      const service = testContainer.resolve<Service>(SERVICE_TOKEN);
      expect(service.execute()).toBe('data');
    });
  });

  describe('Token Types', () => {
    it('should work with string tokens', () => {
      const STRING_TOKEN = 'string-token' as const;

      testContainer.register(STRING_TOKEN, () => 'string-value');

      const result = testContainer.resolve<string>(STRING_TOKEN);
      expect(result).toBe('string-value');
    });

    it('should work with symbol tokens', () => {
      const SYMBOL_TOKEN = Symbol('symbol-token');

      testContainer.register(SYMBOL_TOKEN, () => 'symbol-value');

      const result = testContainer.resolve<string>(SYMBOL_TOKEN);
      expect(result).toBe('symbol-value');
    });
  });

  describe('Instance Registration', () => {
    it('should register a pre-created instance', () => {
      class InstanceService {
        value = 'pre-created';
      }

      const INSTANCE_TOKEN = createToken<InstanceService>('InstanceService');
      const instance = new InstanceService();

      testContainer.registerInstance(INSTANCE_TOKEN, instance);

      const resolved = testContainer.resolve<InstanceService>(INSTANCE_TOKEN);
      expect(resolved).toBe(instance);
      expect(resolved.value).toBe('pre-created');
    });
  });

  describe('Has Method', () => {
    it('should return true for registered tokens', () => {
      const TOKEN = createToken<string>('Token');

      testContainer.register(TOKEN, () => 'value');

      expect(testContainer.has(TOKEN)).toBe(true);
    });

    it('should return false for unregistered tokens', () => {
      const TOKEN = createToken<string>('UnregisteredToken');

      expect(testContainer.has(TOKEN)).toBe(false);
    });
  });

  describe('Clear Method', () => {
    it('should clear all registrations', () => {
      const TOKEN = createToken<string>('Token');

      testContainer.register(TOKEN, () => 'value');
      expect(testContainer.has(TOKEN)).toBe(true);

      testContainer.clear();
      expect(testContainer.has(TOKEN)).toBe(false);
    });
  });
});
