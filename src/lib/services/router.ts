import { CircuitBreakerManager } from './circuitBreaker';
import { memoryStore } from '../store/memoryCache';

export interface ProviderRoute {
  name: string;
  expectedFee: number;
  successRate: number;
  isAvailable: boolean;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  reason?: string;
}

export class SmartRouter {
  // Provider currency support rules
  private static PROVIDER_CURRENCIES: Record<string, string[]> = {
    stripe: ['USD', 'EUR', 'GBP', 'CAD'],
    paypal: ['USD', 'EUR', 'GBP', 'AUD', 'JPY'],
    razorpay: ['INR', 'USD'],
  };

  /**
   * Calculates the fee for a provider in the transaction currency
   */
  public static calculateFee(provider: string, amount: number, currency: string): number {
    const prov = provider.toLowerCase();
    switch (prov) {
      case 'stripe':
        return amount * 0.029 + 0.30;
      case 'paypal':
        return amount * 0.0349 + 0.49;
      case 'razorpay':
        // Razorpay domestic fee is 2%, international is 3%. Let's assume 2% for INR, 3% for others.
        const rate = currency === 'INR' ? 0.02 : 0.03;
        return amount * rate;
      default:
        return amount * 0.03;
    }
  }

  /**
   * Evaluates all enabled providers and selects the optimal one based on strategy
   */
  public static routePayment(
    enabledProviders: string[],
    amount: number,
    currency: string,
    strategy: 'LOWEST_COST' | 'HIGHEST_SUCCESS' | 'MANUAL',
    manualProvider?: string
  ): { selectedProvider: string; routes: ProviderRoute[] } {
    const routes: ProviderRoute[] = [];
    const normalizedCurrency = currency.toUpperCase();

    // 1. Evaluate each provider's status
    for (const provName of ['stripe', 'paypal', 'razorpay']) {
      const isEnabled = enabledProviders.map(p => p.toLowerCase()).includes(provName);
      const isCurrencySupported = this.PROVIDER_CURRENCIES[provName]?.includes(normalizedCurrency) ?? false;
      const circuitState = CircuitBreakerManager.checkCircuit(provName);
      
      const cbState = memoryStore.circuitBreakers[provName];
      const successRate = cbState?.customSuccessRate ?? 90;
      const expectedFee = this.calculateFee(provName, amount, normalizedCurrency);

      let isAvailable = isEnabled && isCurrencySupported && circuitState !== 'OPEN';
      let reason = '';

      if (!isEnabled) {
        reason = 'Disabled by Merchant';
      } else if (!isCurrencySupported) {
        reason = `Currency ${normalizedCurrency} not supported`;
      } else if (circuitState === 'OPEN') {
        reason = 'Circuit Breaker OPEN';
      } else {
        reason = 'Available';
      }

      routes.push({
        name: provName,
        expectedFee,
        successRate,
        isAvailable,
        circuitState,
        reason
      });
    }

    // 2. Select route based on Strategy
    let selectedProvider = '';
    const availableRoutes = routes.filter(r => r.isAvailable);

    if (availableRoutes.length === 0) {
      // Emergency: If all are disabled/blocked, fallback to any provider that supports the currency
      const emergencyFallback = routes.find(r => r.reason !== `Currency ${normalizedCurrency} not supported`);
      selectedProvider = emergencyFallback ? emergencyFallback.name : 'stripe';
      memoryStore.publishEvent('router.emergency', `All providers are unavailable. Forcing emergency fallback to: ${selectedProvider}`, { currency });
      return { selectedProvider, routes };
    }

    if (strategy === 'MANUAL' && manualProvider) {
      const match = availableRoutes.find(r => r.name === manualProvider.toLowerCase());
      if (match) {
        selectedProvider = match.name;
      } else {
        // Smart Failover: manual provider is unhealthy/unavailable, pick best alternative
        const fallback = this.selectBestRoute(availableRoutes, 'HIGHEST_SUCCESS');
        selectedProvider = fallback.name;
        memoryStore.publishEvent('router.failover', `Requested manual provider ${manualProvider} was unavailable. Smart failover selected: ${selectedProvider}`, {
          requested: manualProvider,
          selected: selectedProvider
        });
      }
    } else {
      const best = this.selectBestRoute(availableRoutes, strategy);
      selectedProvider = best.name;
    }

    memoryStore.publishEvent('router.routing_decision', `Smart Routing selected ${selectedProvider} using strategy ${strategy}`, {
      strategy,
      amount,
      currency,
      selectedProvider,
      availableRoutes: availableRoutes.map(r => r.name)
    });

    return { selectedProvider, routes };
  }

  private static selectBestRoute(availableRoutes: ProviderRoute[], strategy: string): ProviderRoute {
    if (strategy === 'LOWEST_COST') {
      // Sort ascending by fee
      return [...availableRoutes].sort((a, b) => a.expectedFee - b.expectedFee)[0];
    } else {
      // Default: HIGHEST_SUCCESS rate
      return [...availableRoutes].sort((a, b) => b.successRate - a.successRate)[0];
    }
  }
}
