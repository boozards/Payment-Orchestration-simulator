import { memoryStore } from '../store/memoryCache';

export class CircuitBreakerManager {
  private static COOLDOWN_MS = 30000; // 30 seconds cooldown for simulation
  private static FAILURE_THRESHOLD = 3;

  /**
   * Evaluates the current circuit state for a provider.
   * If state is OPEN and cooldown has expired, transitions to HALF_OPEN.
   */
  public static checkCircuit(provider: string): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const cb = memoryStore.circuitBreakers[provider.toLowerCase()];
    if (!cb) return 'CLOSED';

    if (cb.state === 'OPEN') {
      if (Date.now() >= cb.cooldownEnd) {
        // Cooldown expired, transition to HALF_OPEN
        memoryStore.updateCircuit(provider.toLowerCase(), {
          state: 'HALF_OPEN',
          failures: 0
        });
        return 'HALF_OPEN';
      }
    }
    return cb.state;
  }

  /**
   * Record a successful request.
   * If the circuit was HALF_OPEN or OPEN, this success closes the circuit.
   */
  public static recordSuccess(provider: string) {
    const providerKey = provider.toLowerCase();
    const cb = memoryStore.circuitBreakers[providerKey];
    if (!cb) return;

    if (cb.state !== 'CLOSED') {
      memoryStore.updateCircuit(providerKey, {
        state: 'CLOSED',
        failures: 0,
        cooldownEnd: 0
      });
      memoryStore.publishEvent('provider.circuit_heal', `Provider ${provider} circuit has healed and is now CLOSED`, {
        provider
      });
    } else {
      // Just keep failures count at 0
      memoryStore.updateCircuit(providerKey, { failures: 0 });
    }
  }

  /**
   * Record a failed request.
   * Increments the failure counter. If failure counter reaches threshold, opens the circuit.
   */
  public static recordFailure(provider: string, reason: string = 'API Error') {
    const providerKey = provider.toLowerCase();
    const cb = memoryStore.circuitBreakers[providerKey];
    if (!cb) return;

    const newFailures = cb.failures + 1;
    const update: any = { failures: newFailures };

    if (newFailures >= this.FAILURE_THRESHOLD || cb.state === 'HALF_OPEN') {
      update.state = 'OPEN';
      update.cooldownEnd = Date.now() + this.COOLDOWN_MS;
      
      memoryStore.updateCircuit(providerKey, update);
      memoryStore.publishEvent('provider.circuit_tripped', `Provider ${provider} circuit TRIPPED (State: OPEN) due to repeated failures: ${reason}`, {
        provider,
        failures: newFailures,
        cooldownSeconds: this.COOLDOWN_MS / 1000
      });
    } else {
      memoryStore.updateCircuit(providerKey, update);
      memoryStore.publishEvent('provider.failure', `Provider ${provider} recorded a failure (${newFailures}/${this.FAILURE_THRESHOLD})`, {
        provider,
        failures: newFailures
      });
    }
  }
}
