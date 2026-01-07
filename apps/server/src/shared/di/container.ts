/**
 * Simple Dependency Injection Container
 *
 * A lightweight DI container with:
 * - Singleton lifecycle (default)
 * - Transient lifecycle (new instance each time)
 * - Factory registration
 * - Type-safe resolution
 */

// ========================================
// Types
// ========================================

export type Lifecycle = 'singleton' | 'transient';

export type Factory<T> = () => T;

interface Registration<T> {
  factory: Factory<T>;
  lifecycle: Lifecycle;
  instance?: T;
}

type Token<T = unknown> = string | symbol;

// ========================================
// Container
// ========================================

class DIContainer {
  private readonly registrations = new Map<Token, Registration<unknown>>();

  /**
   * Register a dependency with a factory
   */
  register<T>(
    token: Token,
    factory: Factory<T>,
    lifecycle: Lifecycle = 'singleton'
  ): void {
    this.registrations.set(token, { factory, lifecycle });
  }

  /**
   * Register a singleton instance directly
   */
  registerInstance<T>(token: Token, instance: T): void {
    this.registrations.set(token, {
      factory: () => instance,
      lifecycle: 'singleton',
      instance,
    });
  }

  /**
   * Resolve a dependency by token
   */
  resolve<T>(token: Token): T {
    const registration = this.registrations.get(token);

    if (!registration) {
      throw new Error(`Dependency not found: ${String(token)}`);
    }

    // Return cached singleton instance
    if (registration.lifecycle === 'singleton' && registration.instance) {
      return registration.instance as T;
    }

    // Create new instance
    const instance = registration.factory();

    // Cache singleton instance
    if (registration.lifecycle === 'singleton') {
      registration.instance = instance;
    }

    return instance as T;
  }

  /**
   * Check if a token is registered
   */
  has(token: Token): boolean {
    return this.registrations.has(token);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.registrations.clear();
  }
}

// ========================================
// Global Container Instance
// ========================================

export const container = new DIContainer();

// ========================================
// Helper Types
// ========================================

export type InjectableToken<T> = Token;

// Helper to create typed tokens
export function createToken<T>(description: string): InjectableToken<T> {
  return Symbol(description);
}

// ========================================
// Decorator (optional, for property injection)
// ========================================

/**
 * Mark a class as injectable
 * Usage: @Injectable()
 */
export function Injectable() {
  return function <T extends new (...args: unknown[]) => object>(
    constructor: T
  ): T {
    return constructor;
  };
}
