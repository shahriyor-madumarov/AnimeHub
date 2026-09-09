/**
 * Lightweight in-memory Circuit Breaker to prevent cascading failures,
 * noisy error logging, and slow response timeouts when upstream external APIs
 * (such as AniList, Jikan, or RSS feeds) experience temporary outages, Cloudflare
 * challenges, or rate limits.
 */
export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Failures before tripping (default 2)
  cooldownMs?: number; // Cooldown duration in ms (default 5 minutes)
}

export class CircuitBreaker {
  readonly name: string;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private nextAttemptTime = 0;
  private lastErrorMessage = '';

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 2;
    this.cooldownMs = options.cooldownMs ?? 5 * 60 * 1000;
  }

  /**
   * Returns true if the circuit breaker is currently OPEN (blocking requests).
   * Automatically transitions to HALF_OPEN when cooldown expires.
   */
  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Resets the circuit breaker back to CLOSED on successful request.
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastErrorMessage = '';
  }

  /**
   * Records a failure. If forceTrip is true (e.g. on 403 disabled or 504 gateway timeout),
   * trips the breaker to OPEN immediately.
   */
  recordFailure(errOrMessage: any, forceTrip = false, customCooldownMs?: number): void {
    const message =
      typeof errOrMessage === 'string'
        ? errOrMessage
        : errOrMessage?.message || String(errOrMessage);
    this.lastErrorMessage = message;
    this.failureCount++;

    const cooldown = customCooldownMs ?? this.cooldownMs;

    if (forceTrip || this.failureCount >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + cooldown;
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    this.isOpen();
    return this.state;
  }

  getLastError(): string {
    return this.lastErrorMessage;
  }
}
