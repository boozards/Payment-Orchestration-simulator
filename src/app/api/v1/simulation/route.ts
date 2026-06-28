import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/lib/store/memoryCache';

export async function GET() {
  try {
    return NextResponse.json({
      circuitBreakers: memoryStore.circuitBreakers,
      eventStream: memoryStore.eventStream,
      webhookLogs: memoryStore.webhookLogs,
      idempotencyKeys: memoryStore.listIdempotencyKeys()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, provider, state, successRate, latency } = body;

    if (action === 'UPDATE_PROVIDER_CONFIG' && provider) {
      const cleanProv = provider.toLowerCase();
      const updates: any = {};
      if (successRate !== undefined) updates.customSuccessRate = Number(successRate);
      if (latency !== undefined) updates.customLatency = Number(latency);

      memoryStore.updateCircuit(cleanProv, updates);
      memoryStore.publishEvent('simulation.config_changed', `Updated simulator settings for ${provider}: Success Rate ${successRate}%, Latency ${latency}ms`, {
        provider,
        ...updates
      });

      return NextResponse.json({ success: true, config: memoryStore.circuitBreakers[cleanProv] });
    }

    if (action === 'FORCE_CIRCUIT_STATE' && provider && state) {
      const cleanProv = provider.toLowerCase();
      
      const updates: any = { state };
      if (state === 'OPEN') {
        updates.cooldownEnd = Date.now() + 30000; // 30s cooldown
      } else if (state === 'CLOSED') {
        updates.failures = 0;
        updates.cooldownEnd = 0;
      }
      
      memoryStore.updateCircuit(cleanProv, updates);
      memoryStore.publishEvent('simulation.circuit_forced', `Forced circuit state of ${provider} to ${state}`, {
        provider,
        state
      });

      return NextResponse.json({ success: true, config: memoryStore.circuitBreakers[cleanProv] });
    }

    if (action === 'CLEAR_KAFKA_LOGS') {
      memoryStore.eventStream = [];
      memoryStore.publishEvent('simulation.logs_cleared', 'Cleared event stream logs', {});
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid simulation action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
