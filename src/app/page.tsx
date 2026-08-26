"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, DollarSign, Percent, CreditCard, Shield,
  Lock, GitBranch, Zap, BookOpen, Wifi
} from 'lucide-react';

// Layout
import Sidebar from '@/components/layout/Sidebar';
import EventTerminal from '@/components/shared/EventTerminal';

// Dashboard
import StatCard from '@/components/dashboard/StatCard';
import ProviderTable from '@/components/dashboard/ProviderTable';
import PaymentsList from '@/components/dashboard/PaymentsList';

// Simulator
import CheckoutForm from '@/components/simulator/CheckoutForm';
import PipelineVisualizer from '@/components/simulator/PipelineVisualizer';
import TraceLog from '@/components/simulator/TraceLog';

// Infrastructure
import ProviderCard from '@/components/providers/ProviderCard';
import BalanceSummary from '@/components/ledger/BalanceSummary';
import LedgerTable from '@/components/ledger/LedgerTable';
import RuleCard from '@/components/fraud/RuleCard';

// Operations
import ReconTrigger from '@/components/reconciliation/ReconTrigger';
import WebhooksPanel from '@/components/reconciliation/WebhooksPanel';

// Documentation
import ProductionNotes from '@/components/production/ProductionNotes';

type TabType = 'dashboard' | 'simulator' | 'ledger' | 'providers' | 'fraud' | 'reconciliation' | 'webhooks' | 'production';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // System Telemetry
  const [circuitBreakers, setCircuitBreakers] = useState<any>({});
  const [eventStream, setEventStream] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [idempotencyKeys, setIdempotencyKeys] = useState<any[]>([]);

  // Analytics
  const [analytics, setAnalytics] = useState<any>({
    total_payments: 0, settled_volume: 0, refunded_volume: 0,
    success_rate: 100, status_distribution: [], daily_volume: []
  });
  const [providerComparison, setProviderComparison] = useState<any[]>([]);
  const [fraudAnalytics, setFraudAnalytics] = useState<any>({
    blocked_payments: 0, flagged_payments: 0, total_rules: 0, active_rules: 0
  });

  // Data lists
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [reconciliationReports, setReconciliationReports] = useState<any[]>([]);

  // Simulator form state
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [amount, setAmount] = useState('100.00');
  const [currency, setCurrency] = useState('USD');
  const [customerEmail, setCustomerEmail] = useState('buyer@company.com');
  const [customerIpCountry, setCustomerIpCountry] = useState('US');
  const [cardCountry, setCardCountry] = useState('US');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [routingStrategy, setRoutingStrategy] = useState<'HIGHEST_SUCCESS' | 'LOWEST_COST' | 'MANUAL'>('HIGHEST_SUCCESS');
  const [manualProvider, setManualProvider] = useState('stripe');
  const [capturePayment, setCapturePayment] = useState(true);
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState('Jane Doe');

  // Simulation trace
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<string[]>([]);
  const [simulationResponse, setSimulationResponse] = useState<any>(null);
  const [pipelineSteps, setPipelineSteps] = useState<{ label: string; icon: React.ReactNode; status: 'pending' | 'active' | 'done' | 'failed' }[]>([]);

  // Merchant onboard
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantCurrency, setNewMerchantCurrency] = useState('USD');
  const [newMerchantWebhook, setNewMerchantWebhook] = useState('');
  const [onboardedSecret, setOnboardedSecret] = useState<any>(null);

  // Reconciliation
  const [reconProvider, setReconProvider] = useState('stripe');
  const [reconDate, setReconDate] = useState(new Date().toISOString().split('T')[0]);
  const [latestReconResult, setLatestReconResult] = useState<any>(null);
  const [reconProcessing, setReconProcessing] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Boot & telemetry
  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventStream]);

  const fetchInitialData = async () => {
    try {
      const resMch = await fetch('/api/v1/merchants');
      const dataMch = await resMch.json();
      setMerchants(dataMch);
      if (dataMch.length > 0) setSelectedMerchant(dataMch[0].id);

      const resRules = await fetch('/api/v1/fraud/rules');
      const dataRules = await resRules.json();
      setFraudRules(dataRules);

      fetchTelemetry();
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const resTel = await fetch('/api/v1/simulation');
      const dataTel = await resTel.json();
      setCircuitBreakers(dataTel.circuitBreakers || {});
      setEventStream(dataTel.eventStream || []);
      setWebhookLogs(dataTel.webhookLogs || []);
      setIdempotencyKeys(dataTel.idempotencyKeys || []);

      const resAn = await fetch('/api/v1/analytics/payments');
      const dataAn = await resAn.json();
      setAnalytics(dataAn);

      const resProv = await fetch('/api/v1/analytics/providers');
      const dataProv = await resProv.json();
      setProviderComparison(dataProv);

      const resFr = await fetch('/api/v1/analytics/fraud');
      const dataFr = await resFr.json();
      setFraudAnalytics(dataFr);

      const resPay = await fetch('/api/v1/payments?limit=30');
      const dataPay = await resPay.json();
      setPayments(dataPay);

      const resLed = await fetch('/api/v1/ledger/entries?limit=50');
      const dataLed = await resLed.json();
      setLedgerEntries(dataLed);

      const resRep = await fetch('/api/v1/reconciliation/reports');
      const dataRep = await resRep.json();
      setReconciliationReports(dataRep);
    } catch (e) {
      console.error('Telemetry fetch error:', e);
    }
  };

  // Pipeline step builder
  const buildPipelineSteps = (phase: string, failed = false) => {
    const allPhases = ['tokenize', 'fraud', 'route', 'provider', 'ledger', 'webhook'];
    const icons = [
      <Lock key="lock" size={16} />,
      <Shield key="shield" size={16} />,
      <GitBranch key="branch" size={16} />,
      <Zap key="zap" size={16} />,
      <BookOpen key="book" size={16} />,
      <Wifi key="wifi" size={16} />
    ];
    const labels = ['Tokenize', 'Fraud', 'Route', 'Provider', 'Ledger', 'Webhook'];
    const currentIdx = allPhases.indexOf(phase);

    return allPhases.map((_, i) => ({
      label: labels[i],
      icon: icons[i],
      status: (i < currentIdx ? 'done' : i === currentIdx ? (failed ? 'failed' : 'active') : 'pending') as 'pending' | 'active' | 'done' | 'failed'
    }));
  };

  // Card scenario presets
  const setCardScenario = (type: 'success' | 'decline' | 'timeout' | 'auth3ds') => {
    if (type === 'success') { setCardNumber('4111 1111 1111 4242'); setCardHolder('Jane Doe'); setCardCvv('123'); }
    else if (type === 'decline') { setCardNumber('4111 1111 1111 9999'); setCardHolder('Declined Dave'); setCardCvv('999'); }
    else if (type === 'timeout') { setCardNumber('4111 1111 1111 8888'); setCardHolder('Slow Sam'); setCardCvv('888'); }
    else if (type === 'auth3ds') { setCardNumber('4111 1111 1111 7777'); setCardHolder('Secure Sarah'); setCardCvv('777'); }
  };

  const generateIdempotencyKey = () => {
    setIdempotencyKey('idemp_' + Math.random().toString(36).substring(2, 15));
  };

  // Payment simulation
  const runPaymentSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    setIsProcessing(true);
    setCheckoutStep([]);
    setSimulationResponse(null);
    setPipelineSteps(buildPipelineSteps('tokenize'));

    const logStep = (msg: string) => {
      setCheckoutStep(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      logStep('PCI Vault: Intercepting card details...');
      logStep('PCI Vault: Exchanging for secure token via /api/v1/vault/tokenize...');

      const tokenRes = await fetch('/api/v1/vault/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cardNumber, expiry: cardExpiry, cvv: cardCvv, holder: cardHolder })
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        logStep(`PCI Vault: Encryption failed - ${tokenData.error}`);
        setPipelineSteps(buildPipelineSteps('tokenize', true));
        setIsProcessing(false);
        return;
      }

      logStep(`PCI Vault: Token created: ${tokenData.token} (${tokenData.brand} ${tokenData.maskedNumber})`);
      setPipelineSteps(buildPipelineSteps('fraud'));
      logStep('Checkout: Initiating payment via /api/v1/payments...');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
        logStep(`Idempotency: Key header attached - ${idempotencyKey}`);
      }

      const checkoutPayload = {
        merchant_id: selectedMerchant,
        amount: parseFloat(amount),
        currency,
        card_token: tokenData.token,
        customer_id: 'cust_sandbox_' + Math.random().toString(36).substring(2, 7),
        capture: capturePayment,
        routing_strategy: routingStrategy,
        manual_provider: manualProvider,
        metadata: { email: customerEmail, ipCountry: customerIpCountry, cardCountry }
      };

      const payRes = await fetch('/api/v1/payments', {
        method: 'POST', headers,
        body: JSON.stringify(checkoutPayload)
      });
      const payData = await payRes.json();

      if (payRes.headers.get('X-Cache') === 'HIT') {
        logStep('Idempotency: Response from cache (no new DB writes)');
        setPipelineSteps(buildPipelineSteps('webhook'));
      } else {
        setPipelineSteps(buildPipelineSteps('route'));
        logStep(`Fraud engine: Score ${payData.fraud_check?.score ?? 'Passed'}, Action: ${payData.fraud_check?.action ?? 'ALLOW'}`);

        if (payData.status === 'FAILED') {
          logStep(`Payment engine: Failed - ${payData.failure_reason}`);
          setPipelineSteps(buildPipelineSteps('provider', true));
        } else {
          setPipelineSteps(buildPipelineSteps('provider'));
          logStep(`Routing: Smart routed to ${payData.provider?.toUpperCase()}`);
          logStep(`Payment: Resolved as ${payData.status} (Tx: ${payData.provider_transaction_id})`);
          setPipelineSteps(buildPipelineSteps('ledger'));

          if (capturePayment) {
            logStep('Ledger: Double-entry posted to merchant, provider, platform accounts');
          }
          setPipelineSteps(buildPipelineSteps('webhook'));
          logStep('Webhook: Dispatched to merchant endpoint');
        }
      }

      // Mark all done
      setTimeout(() => {
        if (payData.status !== 'FAILED') {
          setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));
        }
      }, 500);

      setSimulationResponse(payData);
      fetchTelemetry();
    } catch (err: any) {
      logStep(`System error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Merchant onboard
  const onboardMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantName) return;
    try {
      const res = await fetch('/api/v1/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMerchantName,
          default_currency: newMerchantCurrency,
          webhook_url: newMerchantWebhook || undefined
        })
      });
      const data = await res.json();
      setOnboardedSecret(data);
      setNewMerchantName('');
      setNewMerchantWebhook('');
      fetchInitialData();
    } catch (e) { console.error(e); }
  };

  // Fraud rule toggle
  const toggleFraudRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/v1/fraud/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });
      fetchInitialData();
    } catch (e) { console.error(e); }
  };

  // Provider sim settings
  const updateProviderSimSettings = async (provider: string, successRate: number, latency: number) => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_PROVIDER_CONFIG', provider, successRate, latency })
      });
      fetchTelemetry();
    } catch (e) { console.error(e); }
  };

  const forceCircuitState = async (provider: string, state: 'CLOSED' | 'OPEN') => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FORCE_CIRCUIT_STATE', provider, state })
      });
      fetchTelemetry();
    } catch (e) { console.error(e); }
  };

  // Reconciliation
  const runReconciliation = async () => {
    setReconProcessing(true);
    setLatestReconResult(null);
    try {
      const res = await fetch('/api/v1/reconciliation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: reconProvider, date: reconDate })
      });
      const data = await res.json();
      setLatestReconResult(data);
      fetchTelemetry();
    } catch (e) { console.error(e); }
    finally { setReconProcessing(false); }
  };

  const clearKafkaLogs = async () => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_KAFKA_LOGS' })
      });
      fetchTelemetry();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
        idempotencyKeysCount={idempotencyKeys.length}
        eventStreamCount={eventStream.length}
      />

      {/* Main Content + Terminal */}
      <div className="app-content">
        <div className="content-area">

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Orchestration Dashboard</h1>
                <p className="page-subtitle">Real-time payment volumes, routing health, and ledger statistics.</p>
              </div>

              <div className="stat-grid">
                <StatCard
                  label="Total Volume"
                  value={`$${analytics.settled_volume?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  detail={`Refunded: $${analytics.refunded_volume?.toFixed(2)}`}
                  icon={<DollarSign size={16} />}
                />
                <StatCard
                  label="Success Rate"
                  value={`${analytics.success_rate?.toFixed(1)}%`}
                  detail={`Total Transactions: ${analytics.total_payments}`}
                  icon={<Percent size={16} />}
                  valueColor={analytics.success_rate >= 90 ? 'var(--green-text)' : 'var(--orange)'}
                />
                <StatCard
                  label="Active Gateways"
                  value={Object.keys(circuitBreakers).length}
                  detail={`${Object.values(circuitBreakers).filter((cb: any) => cb.state === 'CLOSED').length} healthy`}
                  icon={<Activity size={16} />}
                />
              </div>

              <ProviderTable providers={providerComparison} circuitBreakers={circuitBreakers} />
              <PaymentsList payments={payments} />
            </>
          )}

          {/* ═══ SIMULATOR ═══ */}
          {activeTab === 'simulator' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Interactive Checkout Simulator</h1>
                <p className="page-subtitle">Execute mock checkouts through the full payment pipeline.</p>
              </div>

              <PipelineVisualizer steps={pipelineSteps.length > 0 ? pipelineSteps : buildPipelineSteps('')} />

              <div className="grid-split">
                <CheckoutForm
                  merchants={merchants}
                  selectedMerchant={selectedMerchant}
                  setSelectedMerchant={setSelectedMerchant}
                  amount={amount}
                  setAmount={setAmount}
                  currency={currency}
                  setCurrency={setCurrency}
                  idempotencyKey={idempotencyKey}
                  setIdempotencyKey={setIdempotencyKey}
                  generateIdempotencyKey={generateIdempotencyKey}
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv}
                  setCardCvv={setCardCvv}
                  cardHolder={cardHolder}
                  setCardHolder={setCardHolder}
                  customerEmail={customerEmail}
                  setCustomerEmail={setCustomerEmail}
                  customerIpCountry={customerIpCountry}
                  setCustomerIpCountry={setCustomerIpCountry}
                  cardCountry={cardCountry}
                  setCardCountry={setCardCountry}
                  routingStrategy={routingStrategy}
                  setRoutingStrategy={setRoutingStrategy}
                  manualProvider={manualProvider}
                  setManualProvider={setManualProvider}
                  capturePayment={capturePayment}
                  setCapturePayment={setCapturePayment}
                  isProcessing={isProcessing}
                  onSubmit={runPaymentSimulation}
                  setCardScenario={setCardScenario}
                />
                <TraceLog steps={checkoutStep} response={simulationResponse} />
              </div>
            </>
          )}

          {/* ═══ LEDGER ═══ */}
          {activeTab === 'ledger' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Double-Entry Ledger</h1>
                <p className="page-subtitle">Auditable accounting records — Sum(Debits) = Sum(Credits).</p>
              </div>
              <BalanceSummary merchants={merchants} ledgerEntries={ledgerEntries} />
              <LedgerTable entries={ledgerEntries} />
            </>
          )}

          {/* ═══ PROVIDERS ═══ */}
          {activeTab === 'providers' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Gateway Health & Circuit Breakers</h1>
                <p className="page-subtitle">Configure simulated error rates, latencies, and circuit breaker states.</p>
              </div>

              {['stripe', 'paypal', 'razorpay'].map((provider) => (
                <ProviderCard
                  key={provider}
                  provider={provider}
                  state={circuitBreakers[provider] || { state: 'CLOSED', failures: 0, customSuccessRate: 95, customLatency: 150 }}
                  onForceCircuitState={forceCircuitState}
                  onUpdateSimSettings={updateProviderSimSettings}
                />
              ))}

              {/* Merchant Onboard */}
              <div className="card mt-20">
                <div className="card-header">
                  <span className="card-title">Onboard New Merchant</span>
                </div>
                <div className="card-body">
                  <form onSubmit={onboardMerchant}>
                    <div className="grid-3 mb-16">
                      <div>
                        <label className="input-label">Merchant Name</label>
                        <input type="text" placeholder="e.g. Tesla Inc" value={newMerchantName} onChange={(e) => setNewMerchantName(e.target.value)} className="input-field" required />
                      </div>
                      <div>
                        <label className="input-label">Default Currency</label>
                        <select value={newMerchantCurrency} onChange={(e) => setNewMerchantCurrency(e.target.value)} className="input-field">
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="INR">INR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                      <div>
                        <label className="input-label">Webhook URL</label>
                        <input type="url" placeholder="https://webhook.site/..." value={newMerchantWebhook} onChange={(e) => setNewMerchantWebhook(e.target.value)} className="input-field" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn-primary">Onboard Merchant</button>
                    </div>
                  </form>

                  {onboardedSecret && (
                    <div className="success-alert mt-16">
                      <div className="success-alert-title">Merchant Onboarded!</div>
                      <div style={{ fontSize: 13 }}>
                        ID: <code className="mono text-bold">{onboardedSecret.id}</code>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        API Key: <code className="mono text-bold text-orange">{onboardedSecret.api_key}</code>
                      </div>
                      <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Store this key securely. In production, API authentication uses HMAC signature verification.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══ FRAUD ═══ */}
          {activeTab === 'fraud' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Fraud Rules Configuration</h1>
                <p className="page-subtitle">Manage real-time transaction screening rules and anomaly blocking.</p>
              </div>

              <div className="stat-grid">
                <StatCard label="Blocked" value={fraudAnalytics.blocked_payments} icon={<Shield size={16} />} valueColor="var(--red-text)" />
                <StatCard label="Flagged" value={fraudAnalytics.flagged_payments} icon={<Shield size={16} />} valueColor="var(--amber-text)" />
                <StatCard label="Rules Active" value={`${fraudAnalytics.active_rules}/${fraudAnalytics.total_rules}`} icon={<Shield size={16} />} valueColor="var(--orange)" />
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Screening Rules</span>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fraudRules.map((rule) => (
                    <RuleCard key={rule.id} rule={rule} onToggle={toggleFraudRule} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ RECONCILIATION ═══ */}
          {activeTab === 'reconciliation' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Payment Reconciliation</h1>
                <p className="page-subtitle">Match internal ledger against provider settlement statements.</p>
              </div>
              <ReconTrigger
                reconProvider={reconProvider}
                setReconProvider={setReconProvider}
                reconDate={reconDate}
                setReconDate={setReconDate}
                reconProcessing={reconProcessing}
                latestReconResult={latestReconResult}
                onRunRecon={runReconciliation}
                reconciliationReports={reconciliationReports}
              />
            </>
          )}

          {/* ═══ WEBHOOKS ═══ */}
          {activeTab === 'webhooks' && (
            <>
              <div className="page-header">
                <h1 className="page-title">Webhook Dispatch Log</h1>
                <p className="page-subtitle">Trace webhook deliveries, HTTP responses, and retry attempts.</p>
              </div>
              <WebhooksPanel webhookLogs={webhookLogs} />
            </>
          )}

          {/* ═══ PRODUCTION NOTES ═══ */}
          {activeTab === 'production' && <ProductionNotes />}

        </div>

        {/* Event Terminal */}
        <EventTerminal
          eventStream={eventStream}
          onClear={clearKafkaLogs}
          terminalEndRef={terminalEndRef}
        />
      </div>
    </div>
  );
}
