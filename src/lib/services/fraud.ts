import { db } from '../db/connection';
import { memoryStore } from '../store/memoryCache';

export interface FraudEvaluationResult {
  action: 'BLOCK' | 'FLAG' | 'ALLOW';
  score: number;
  reasons: string[];
}

export interface FraudRuleRow {
  id: string;
  name: string;
  condition_type: string;
  parameters: string; // JSON string
  action: string;
  enabled: number;
}

export class FraudEngine {
  /**
   * Evaluates a payment request against active rules and calculates an anomaly score.
   */
  public static async evaluate(
    merchantId: string,
    amount: number,
    currency: string,
    customerId: string,
    cardToken: string,
    metadata: { email?: string; ipCountry?: string; cardCountry?: string } = {}
  ): Promise<FraudEvaluationResult> {
    const reasons: string[] = [];
    let overallAction: 'BLOCK' | 'FLAG' | 'ALLOW' = 'ALLOW';
    let anomalyScore = 0;

    // 1. Fetch active fraud rules from SQLite
    let activeRules: FraudRuleRow[] = [];
    try {
      activeRules = await db.all<FraudRuleRow>(
        'SELECT * FROM fraud_rules WHERE enabled = 1'
      );
    } catch (e) {
      console.error('Error fetching fraud rules:', e);
    }

    // 2. Anomaly Scoring Heuristics
    // Heuristic A: Email Domain check
    if (metadata.email) {
      const email = metadata.email.toLowerCase();
      const riskyDomains = ['tempmail.com', 'throwaway.com', 'yopmail.com', 'dispostable.com'];
      const domain = email.split('@')[1];
      if (riskyDomains.includes(domain)) {
        anomalyScore += 40;
        reasons.push(`Risky email domain: ${domain}`);
      }
    }

    // Heuristic B: Transaction amount scaling
    if (amount > 1000) {
      const amountScore = Math.min(Math.floor((amount - 1000) / 100), 30);
      if (amountScore > 0) {
        anomalyScore += amountScore;
        reasons.push(`High transaction amount (scored +${amountScore})`);
      }
    }

    // 3. Evaluate Configured Database Rules
    for (const rule of activeRules) {
      let params: any = {};
      try {
        params = JSON.parse(rule.parameters);
      } catch (err) {
        console.error(`Failed to parse parameters for rule ${rule.name}`, err);
        continue;
      }

      switch (rule.condition_type) {
        case 'AMOUNT_THRESHOLD': {
          const limit = Number(params.limit || 5000);
          if (amount > limit) {
            reasons.push(`Amount $${amount} exceeds limit $${limit} (Rule: ${rule.name})`);
            overallAction = this.escalateAction(rule.action as any, overallAction);
          }
          break;
        }

        case 'VELOCITY': {
          const limit = Number(params.limit || 5);
          const windowMinutes = Number(params.windowMinutes || 1);
          
          // Query SQLite to check payment attempts in last windowMinutes for this customer
          try {
            const timeAgo = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
            const countResult = await db.get<{ count: number }>(
              `SELECT COUNT(*) as count FROM payments 
               WHERE customer_id = ? AND created_at > ?`,
              [customerId, timeAgo]
            );
            
            const recentAttempts = countResult?.count || 0;
            if (recentAttempts >= limit) {
              anomalyScore += 25;
              reasons.push(`High velocity: ${recentAttempts} attempts in last ${windowMinutes} min (Rule: ${rule.name})`);
              overallAction = this.escalateAction(rule.action as any, overallAction);
            }
          } catch (e) {
            console.error('Error querying payment velocity:', e);
          }
          break;
        }

        case 'GEO_MISMATCH': {
          const ipCountry = metadata.ipCountry || 'US';
          const cardCountry = metadata.cardCountry || 'US';
          if (ipCountry !== cardCountry && !params.allowMismatch) {
            anomalyScore += 20;
            reasons.push(`Geo mismatch: IP Country (${ipCountry}) vs Card Country (${cardCountry}) (Rule: ${rule.name})`);
            overallAction = this.escalateAction(rule.action as any, overallAction);
          }
          break;
        }
      }
    }

    // 4. Fallback based on final anomaly score
    if (anomalyScore >= 80 && overallAction !== 'BLOCK') {
      overallAction = 'BLOCK';
      reasons.push(`Anomaly score (${anomalyScore}) exceeded blocking threshold (80)`);
    } else if (anomalyScore >= 50 && overallAction === 'ALLOW') {
      overallAction = 'FLAG';
      reasons.push(`Anomaly score (${anomalyScore}) exceeded flagging threshold (50)`);
    }

    // Publish event
    memoryStore.publishEvent('fraud.check', `Fraud check for ${customerId}: ${overallAction} (Score: ${anomalyScore})`, {
      customerId,
      amount,
      currency,
      action: overallAction,
      score: anomalyScore,
      reasons
    });

    return {
      action: overallAction,
      score: anomalyScore,
      reasons
    };
  }

  private static escalateAction(
    ruleAction: 'BLOCK' | 'FLAG' | 'ALLOW',
    currentAction: 'BLOCK' | 'FLAG' | 'ALLOW'
  ): 'BLOCK' | 'FLAG' | 'ALLOW' {
    if (ruleAction === 'BLOCK') return 'BLOCK';
    if (ruleAction === 'FLAG' && currentAction !== 'BLOCK') return 'FLAG';
    return currentAction;
  }
}
