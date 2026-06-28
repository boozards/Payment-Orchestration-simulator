"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  DollarSign,
  CreditCard,
  BookOpen,
  Shield,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Wifi,
  ArrowRight,
  Clock,
  Terminal,
  User,
  Globe,
  Power,
  Percent,
  Zap,
  Play
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'ledger' | 'providers' | 'fraud' | 'reconciliation' | 'webhooks'>('dashboard');
  
  // System State Telemetry
  const [circuitBreakers, setCircuitBreakers] = useState<any>({});
  const [eventStream, setEventStream] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [idempotencyKeys, setIdempotencyKeys] = useState<any[]>([]);
  
  // Aggregated Analytics
  const [analytics, setAnalytics] = useState<any>({
    total_payments: 0,
    settled_volume: 0,
    refunded_volume: 0,
    success_rate: 100,
    status_distribution: [],
    daily_volume: []
  });
  const [providerComparison, setProviderComparison] = useState<any[]>([]);
  const [fraudAnalytics, setFraudAnalytics] = useState<any>({
    blocked_payments: 0,
    flagged_payments: 0,
    total_rules: 0,
    active_rules: 0
  });

  // Database lists
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [reconciliationReports, setReconciliationReports] = useState<any[]>([]);

  // Simulation Form States
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
  
  // Mock Card Inputs
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState('Jane Doe');

  // Interactive checkout steps
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<string[]>([]);
  const [simulationResponse, setSimulationResponse] = useState<any>(null);

  // New Merchant onboard state
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantCurrency, setNewMerchantCurrency] = useState('USD');
  const [newMerchantWebhook, setNewMerchantWebhook] = useState('');
  const [onboardedSecret, setOnboardedSecret] = useState<any>(null);

  // Reconciliation Trigger parameters
  const [reconProvider, setReconProvider] = useState('stripe');
  const [reconDate, setReconDate] = useState(new Date().toISOString().split('T')[0]);
  const [latestReconResult, setLatestReconResult] = useState<any>(null);
  const [reconProcessing, setReconProcessing] = useState(false);

  // Terminal scroll ref
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initial Boot & Telemetry Loop
  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll console
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventStream]);

  const fetchInitialData = async () => {
    try {
      // Merchants
      const resMch = await fetch('/api/v1/merchants');
      const dataMch = await resMch.json();
      setMerchants(dataMch);
      if (dataMch.length > 0) setSelectedMerchant(dataMch[0].id);

      // Fraud rules
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
      // Telemetry
      const resTel = await fetch('/api/v1/simulation');
      const dataTel = await resTel.json();
      setCircuitBreakers(dataTel.circuitBreakers || {});
      setEventStream(dataTel.eventStream || []);
      setWebhookLogs(dataTel.webhookLogs || []);
      setIdempotencyKeys(dataTel.idempotencyKeys || []);

      // Analytics
      const resAn = await fetch('/api/v1/analytics/payments');
      const dataAn = await resAn.json();
      setAnalytics(dataAn);

      const resProv = await fetch('/api/v1/analytics/providers');
      const dataProv = await resProv.json();
      setProviderComparison(dataProv);

      const resFr = await fetch('/api/v1/analytics/fraud');
      const dataFr = await resFr.json();
      setFraudAnalytics(dataFr);

      // General lists
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

  // Helper: Pre-fill simulated scenarios
  const setCardScenario = (type: 'success' | 'decline' | 'timeout' | 'auth3ds') => {
    if (type === 'success') {
      setCardNumber('4111 1111 1111 4242');
      setCardHolder('Jane Doe');
      setCardCvv('123');
    } else if (type === 'decline') {
      setCardNumber('4111 1111 1111 9999'); // Trigger mock fail insufficiency
      setCardHolder('Declined Dave');
      setCardCvv('999');
    } else if (type === 'timeout') {
      setCardNumber('4111 1111 1111 8888'); // Trigger mock timeout
      setCardHolder('Slow Sam');
      setCardCvv('888');
    } else if (type === 'auth3ds') {
      setCardNumber('4111 1111 1111 7777'); // Trigger mock 3DS fail
      setCardHolder('Secure Sarah');
      setCardCvv('777');
    }
  };

  // Generate a random Idempotency Key
  const generateIdempotencyKey = () => {
    setIdempotencyKey('idemp_' + Math.random().toString(36).substring(2, 15));
  };

  // Submit checkout simulation
  const runPaymentSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    setIsProcessing(true);
    setCheckoutStep([]);
    setSimulationResponse(null);

    const logStep = (msg: string) => {
      setCheckoutStep(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      // Step 1: Client Card Tokenization (PCI DSS compliance pattern)
      logStep('PCI Vault: Intercepting card details on frontend...');
      logStep('PCI Vault: Exchanging card details for secure token via /api/v1/vault/tokenize...');
      
      const tokenRes = await fetch('/api/v1/vault/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: cardNumber,
          expiry: cardExpiry,
          cvv: cardCvv,
          holder: cardHolder
        })
      });
      
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        logStep(`PCI Vault: Encryption failed - ${tokenData.error}`);
        setIsProcessing(false);
        return;
      }

      logStep(`PCI Vault: Token successfully created: ${tokenData.token} (${tokenData.brand} ${tokenData.maskedNumber})`);
      logStep('Checkout: Initiating payment payload to gateway api/v1/payments...');

      // Step 2: Run Checkout Request
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
        logStep(`Idempotency: Appending key header - ${idempotencyKey}`);
      }

      const checkoutPayload = {
        merchant_id: selectedMerchant,
        amount: parseFloat(amount),
        currency: currency,
        card_token: tokenData.token,
        customer_id: 'cust_sandbox_' + Math.random().toString(36).substring(2, 7),
        capture: capturePayment,
        routing_strategy: routingStrategy,
        manual_provider: manualProvider,
        metadata: {
          email: customerEmail,
          ipCountry: customerIpCountry,
          cardCountry: cardCountry
        }
      };

      const payRes = await fetch('/api/v1/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify(checkoutPayload)
      });

      const payData = await payRes.json();

      if (payRes.headers.get('X-Cache') === 'HIT') {
        logStep('Idempotency: Response returned directly from Cache! (No DB transactions generated)');
      } else {
        logStep(`Fraud engine: Completed scan - Score: ${payData.fraud_check?.score ?? 'Passed'} Action: ${payData.fraud_check?.action ?? 'ALLOW'}`);
        if (payData.status === 'FAILED') {
          logStep(`Payment engine: Processing failed - ${payData.failure_reason}`);
        } else {
          logStep(`Routing Engine: Smart Routed to ${payData.provider.toUpperCase()}`);
          logStep(`Payment state: Resolved as ${payData.status} (Transaction ID: ${payData.provider_transaction_id})`);
          if (capturePayment) {
            logStep('Ledger posted: Balanced Double-Entry posted to Ledger Accounts (Merchant, Provider, Platform)');
          }
        }
      }

      setSimulationResponse(payData);
      fetchTelemetry();
    } catch (err: any) {
      logStep(`System error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Onboard new merchant
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
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle fraud rule
  const toggleFraudRule = async (ruleId: string, enabled: boolean) => {
    try {
      await fetch(`/api/v1/fraud/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  // Update provider simulated health
  const updateProviderSimSettings = async (provider: string, successRate: number, latency: number) => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PROVIDER_CONFIG',
          provider,
          successRate,
          latency
        })
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  // Force circuit breaker reset
  const forceCircuitState = async (provider: string, state: 'CLOSED' | 'OPEN') => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FORCE_CIRCUIT_STATE',
          provider,
          state
        })
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  // Run reconciliation
  const runReconciliation = async () => {
    setReconProcessing(true);
    setLatestReconResult(null);
    try {
      const res = await fetch('/api/v1/reconciliation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: reconProvider,
          date: reconDate
        })
      });
      const data = await res.json();
      setLatestReconResult(data);
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    } finally {
      setReconProcessing(false);
    }
  };

  const clearKafkaLogs = async () => {
    try {
      await fetch('/api/v1/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR_KAFKA_LOGS' })
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      
      {/* 1. LEFT SIDEBAR */}
      <aside style={{
        width: '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid var(--color-border-dark)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
            paddingLeft: '8px'
          }}>
            <Zap size={20} color="var(--color-orange)" fill="var(--color-orange)" />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.05em'
            }}>ORCHESTRA</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00ff66',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite'
            }}></span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'dashboard' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'dashboard' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Activity size={18} />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'simulator' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'simulator' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'simulator' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <CreditCard size={18} />
              Checkout Simulator
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'ledger' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'ledger' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'ledger' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <BookOpen size={18} />
              Ledger Bookkeeping
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'providers' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'providers' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'providers' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Sliders size={18} />
              Circuits & Gateway Health
            </button>

            <button
              onClick={() => setActiveTab('fraud')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'fraud' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'fraud' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'fraud' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Shield size={18} />
              Fraud Rules
            </button>

            <button
              onClick={() => setActiveTab('reconciliation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'reconciliation' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'reconciliation' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'reconciliation' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Database size={18} />
              Reconciliation
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: activeTab === 'webhooks' ? 'var(--color-orange-light)' : 'transparent',
                color: activeTab === 'webhooks' ? 'var(--color-orange)' : 'var(--foreground)',
                fontWeight: activeTab === 'webhooks' ? 700 : 500,
                textAlign: 'left',
                width: '100%',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Wifi size={18} />
              Webhooks Log
            </button>
          </nav>
        </div>

        {/* Sidebar Telemetry Badges */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-muted)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>SQLITE:</span>
            <span style={{ color: '#1e8a44', fontWeight: 'bold' }}>CONNECTED</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>REDIS KEYS:</span>
            <span style={{ color: '#2b70f0', fontWeight: 'bold' }}>{idempotencyKeys.length} ACTIVE</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>KAFKA EVENT:</span>
            <span style={{ color: 'var(--color-orange)', fontWeight: 'bold' }}>ONLINE</span>
          </div>
        </div>
      </aside>

      {/* 2. DYNAMIC WORKSPACE PANEL */}
      <main style={{
        flexGrow: 1,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden'
      }}>
        {/* VIEW AREA */}
        <section style={{
          width: '65%',
          padding: '32px',
          overflowY: 'auto',
          borderRight: '1px solid var(--color-border)',
          height: '100vh'
        }}>
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Orchestration Dashboard</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Real-time payment volumes, routing health and ledger statistics.</p>
              </div>

              {/* Statistics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '32px'
              }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                    <span>Total Volume</span>
                    <DollarSign size={16} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>
                    ${analytics.settled_volume?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    Refunded: ${analytics.refunded_volume?.toFixed(2)}
                  </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                    <span>Success Rate</span>
                    <Percent size={16} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: analytics.success_rate >= 90 ? '#1e8a44' : 'var(--color-orange)' }}>
                    {analytics.success_rate?.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    Total Transactions: {analytics.total_payments}
                  </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>
                    <span>Active Gateway Health</span>
                    <Activity size={16} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {Object.keys(circuitBreakers).map((provider) => {
                      const state = circuitBreakers[provider].state;
                      return (
                        <div key={provider} style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          border: '1px solid',
                          borderColor: state === 'CLOSED' ? '#1e8a44' : state === 'OPEN' ? '#cc2929' : '#b37400',
                          color: state === 'CLOSED' ? '#1e8a44' : state === 'OPEN' ? '#cc2929' : '#b37400',
                          textTransform: 'uppercase'
                        }}>
                          {provider}: {state === 'CLOSED' ? 'closed' : state === 'OPEN' ? 'open (down)' : 'half-open'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Provider Comparison and Charts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="card">
                  <div className="card-title">
                    <span>Provider Performance Comparison</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        <th style={{ padding: '8px 0' }}>Provider</th>
                        <th>Total Attempts</th>
                        <th>Success Rate</th>
                        <th>Avg Latency</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerComparison.map((row) => (
                        <tr key={row.provider} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '12px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>{row.provider}</td>
                          <td>{row.total_attempts}</td>
                          <td style={{ fontWeight: 'bold', color: row.success_rate >= 90 ? '#1e8a44' : 'var(--color-orange)' }}>
                            {row.success_rate.toFixed(1)}%
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{row.avg_latency_ms}ms</td>
                          <td>
                            <span className={`badge ${circuitBreakers[row.provider]?.state === 'CLOSED' ? 'badge-success' : circuitBreakers[row.provider]?.state === 'OPEN' ? 'badge-failed' : 'badge-warning'}`}>
                              {circuitBreakers[row.provider]?.state === 'CLOSED' ? 'Healthy' : circuitBreakers[row.provider]?.state === 'OPEN' ? 'Tripped' : 'Recovering'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Payments Table */}
              <div className="card">
                <div className="card-title">
                  <span>Recent Payments Log (SQLite Sync)</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th style={{ padding: '8px' }}>Payment ID</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Gateway</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 8).map((pay) => (
                        <tr key={pay.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{pay.id}</td>
                          <td style={{ fontWeight: 'bold' }}>${pay.amount.toFixed(2)}</td>
                          <td>{pay.currency}</td>
                          <td style={{ textTransform: 'uppercase', fontSize: '11px' }}>{pay.provider || 'None'}</td>
                          <td>
                            <span className={`badge ${pay.status === 'SETTLED' || pay.status === 'CAPTURED' ? 'badge-success' : pay.status === 'FAILED' ? 'badge-failed' : 'badge-warning'}`}>
                              {pay.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{new Date(pay.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SIMULATOR */}
          {activeTab === 'simulator' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Interactive Checkout Simulator</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Execute mock checkouts to verify smart routing, fraud blocking, and idempotency rules.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                {/* Simulator Form */}
                <form onSubmit={runPaymentSimulation} className="card">
                  <div className="card-title">
                    <span>Transaction Details</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Merchant selector */}
                    <div>
                      <label className="input-label">Select Merchant Profile</label>
                      <select
                        value={selectedMerchant}
                        onChange={(e) => setSelectedMerchant(e.target.value)}
                        className="input-field"
                        style={{ height: '40px' }}
                      >
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id}>{m.name} ({m.default_currency})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="input-label">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="input-label">Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="input-field"
                          style={{ height: '40px' }}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="INR">INR</option>
                          <option value="AUD">AUD</option>
                          <option value="JPY">JPY</option>
                        </select>
                      </div>
                    </div>

                    {/* Idempotency Config */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="input-label" style={{ margin: 0 }}>Idempotency Key</label>
                        <button type="button" onClick={generateIdempotencyKey} style={{ border: 'none', background: 'none', color: 'var(--color-orange)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                          Generate Key
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional (prevent double charging)"
                        value={idempotencyKey}
                        onChange={(e) => setIdempotencyKey(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    {/* Credit Card Inputs */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className="input-label" style={{ margin: 0 }}>PCI Tokenization Card Vault</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" onClick={() => setCardScenario('success')} style={{ padding: '2px 6px', fontSize: '10px', border: '1px solid #1e8a44', color: '#1e8a44', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Succeed</button>
                          <button type="button" onClick={() => setCardScenario('decline')} style={{ padding: '2px 6px', fontSize: '10px', border: '1px solid #cc2929', color: '#cc2929', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                          <button type="button" onClick={() => setCardScenario('timeout')} style={{ padding: '2px 6px', fontSize: '10px', border: '1px solid #b37400', color: '#b37400', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Timeout</button>
                          <button type="button" onClick={() => setCardScenario('auth3ds')} style={{ padding: '2px 6px', fontSize: '10px', border: '1px solid #7928ca', color: '#7928ca', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>3DS Fail</button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <input
                            type="text"
                            placeholder="Card Number"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="input-field"
                            style={{ fontFamily: 'var(--font-mono)' }}
                            required
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '10px' }}>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="input-field"
                            required
                          />
                          <input
                            type="text"
                            placeholder="CVV"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="input-field"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Holder Name"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="input-field"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Routing Config */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                      <label className="input-label">Routing Strategy</label>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="radio" checked={routingStrategy === 'HIGHEST_SUCCESS'} onChange={() => setRoutingStrategy('HIGHEST_SUCCESS')} />
                          Success Optimized
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="radio" checked={routingStrategy === 'LOWEST_COST'} onChange={() => setRoutingStrategy('LOWEST_COST')} />
                          Cost Optimized
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                          <input type="radio" checked={routingStrategy === 'MANUAL'} onChange={() => setRoutingStrategy('MANUAL')} />
                          Manual Selection
                        </label>
                      </div>

                      {routingStrategy === 'MANUAL' && (
                        <div>
                          <label className="input-label">Select Destination Gateway</label>
                          <select value={manualProvider} onChange={(e) => setManualProvider(e.target.value)} className="input-field" style={{ height: '40px' }}>
                            <option value="stripe">Stripe</option>
                            <option value="paypal">PayPal</option>
                            <option value="razorpay">Razorpay</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Fraud engine controls */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '8px' }}>
                      <label className="input-label">Simulate Customer Location & Device (Fraud evaluation)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr', gap: '10px' }}>
                        <input
                          type="email"
                          placeholder="Email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="input-field"
                        />
                        <input
                          type="text"
                          placeholder="IP Country"
                          value={customerIpCountry}
                          onChange={(e) => setCustomerIpCountry(e.target.value)}
                          className="input-field"
                        />
                        <input
                          type="text"
                          placeholder="Card Country"
                          value={cardCountry}
                          onChange={(e) => setCardCountry(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={capturePayment} onChange={(e) => setCapturePayment(e.target.checked)} />
                        Auto-capture Authorized funds immediately
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={isProcessing} style={{ height: '44px', width: '100%', marginTop: '12px' }}>
                      {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Play size={16} />}
                      {isProcessing ? 'PROCESSING TRANSACTION...' : 'EXECUTE SIMULATION'}
                    </button>

                  </div>
                </form>

                {/* Simulation Trace Steps */}
                <div>
                  <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-title">
                      <span>Gateway Processing trace</span>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {checkoutStep.length === 0 && (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                          Run a simulation transaction to watch the step-by-step trace here.
                        </div>
                      )}
                      {checkoutStep.map((step, idx) => (
                        <div key={idx} style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          padding: '6px 8px',
                          backgroundColor: 'var(--color-bg-alt)',
                          borderLeft: '2px solid var(--color-orange)',
                          lineHeight: '1.4'
                        }}>
                          {step}
                        </div>
                      ))}

                      {simulationResponse && (
                        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
                          <span className="input-label">Response Payload (JSON)</span>
                          <pre style={{
                            backgroundColor: '#111111',
                            color: '#ffffff',
                            padding: '12px',
                            fontSize: '10px',
                            overflowX: 'auto',
                            maxHeight: '150px'
                          }}>
                            {JSON.stringify(simulationResponse, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LEDGER */}
          {activeTab === 'ledger' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Double-Entry Ledger</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Auditable double-entry accounting records verifying transaction balance ($Sum(Debits) = Sum(Credits)$).</p>
              </div>

              {/* Balances Display */}
              <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '20px' }}>
                <div>
                  <span className="input-label">Merchant Balances</span>
                  {merchants.map((m) => {
                    const accountId = `merchant:${m.id}`;
                    // Find latest entry for this merchant
                    const lastEntry = ledgerEntries.find(e => e.account_id === accountId);
                    const bal = lastEntry ? lastEntry.balance_after : 0;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 'bold' }}>{m.name}:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#1e8a44', fontWeight: 'bold' }}>
                          ${bal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span className="input-label">Provider Cash Reserves</span>
                  {['stripe', 'paypal', 'razorpay'].map((p) => {
                    const accountId = `provider:${p}`;
                    const lastEntry = ledgerEntries.find(e => e.account_id === accountId);
                    const bal = lastEntry ? lastEntry.balance_after : 0;
                    return (
                      <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '13px', textTransform: 'uppercase' }}>
                        <span style={{ fontWeight: 'bold' }}>{p}:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: bal < 0 ? '#cc2929' : '#111111' }}>
                          ${bal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span className="input-label">Platform Fee Collected</span>
                  {(() => {
                    const lastEntry = ledgerEntries.find(e => e.account_id === 'platform:fees');
                    const bal = lastEntry ? lastEntry.balance_after : 0;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '18px', fontWeight: 'bold' }}>
                        <span>TOTAL FEES:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-orange)' }}>
                          ${bal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Ledger Entries List */}
              <div className="card">
                <div className="card-title">
                  <span>Ledger Sheet Entries</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <th style={{ padding: '8px' }}>Entry ID</th>
                        <th>Payment ID</th>
                        <th>Type</th>
                        <th>Account ID</th>
                        <th>Amount</th>
                        <th>Currency</th>
                        <th>Balance After</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{entry.id}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{entry.payment_id}</td>
                          <td style={{ fontWeight: 'bold', color: entry.entry_type === 'DEBIT' ? '#1e8a44' : '#cc2929' }}>{entry.entry_type}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{entry.account_id}</td>
                          <td style={{ fontWeight: 'bold' }}>
                            {entry.entry_type === 'DEBIT' ? '+' : '-'}${entry.amount.toFixed(2)}
                          </td>
                          <td>{entry.currency}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>${entry.balance_after.toFixed(2)}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{new Date(entry.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROVIDERS */}
          {activeTab === 'providers' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Gateway Health & Circuit Breakers</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Configure simulated error rates, latencies, and reset provider circuit breaker states manually.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {['stripe', 'paypal', 'razorpay'].map((provider) => {
                  const state = circuitBreakers[provider] || { state: 'CLOSED', failures: 0, customSuccessRate: 95, customLatency: 150 };
                  return (
                    <div key={provider} className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <h3 style={{ textTransform: 'uppercase', fontSize: '18px' }}>{provider}</h3>
                          <span className={`badge ${state.state === 'CLOSED' ? 'badge-success' : state.state === 'OPEN' ? 'badge-failed' : 'badge-warning'}`}>
                            {state.state}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-text-muted)' }}>
                          <div>Consecutive Failures: <strong style={{ color: state.failures > 0 ? 'var(--color-orange)' : '#111111' }}>{state.failures}/3</strong></div>
                          <div>Circuit Cooldown remaining: <strong>{state.state === 'OPEN' ? `${Math.max(0, Math.ceil((state.cooldownEnd - Date.now()) / 1000))}s` : 'None'}</strong></div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                          <button
                            type="button"
                            onClick={() => forceCircuitState(provider, 'CLOSED')}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Reset Circuit (Heal)
                          </button>
                          <button
                            type="button"
                            onClick={() => forceCircuitState(provider, 'OPEN')}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#cc2929', color: '#cc2929' }}
                          >
                            Force Trip (Fail)
                          </button>
                        </div>
                      </div>

                      {/* Config Inputs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
                        <span className="input-label" style={{ margin: 0 }}>Simulated Gateway Performance Configuration</span>
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span>Simulated Success Rate:</span>
                            <strong>{state.customSuccessRate}%</strong>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={state.customSuccessRate}
                            onChange={(e) => updateProviderSimSettings(provider, Number(e.target.value), state.customLatency)}
                            style={{ width: '100%', accentColor: 'var(--color-orange)' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span>Simulated Latency:</span>
                            <strong>{state.customLatency}ms</strong>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="2000"
                            step="50"
                            value={state.customLatency}
                            onChange={(e) => updateProviderSimSettings(provider, state.customSuccessRate, Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--color-orange)' }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Merchant configuration panel */}
              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-title">
                  <span>Onboard New Sandbox Merchant</span>
                </div>
                <form onSubmit={onboardMerchant} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'flex-end' }}>
                  <div>
                    <label className="input-label">Merchant Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tesla Inc"
                      value={newMerchantName}
                      onChange={(e) => setNewMerchantName(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Default Currency</label>
                    <select
                      value={newMerchantCurrency}
                      onChange={(e) => setNewMerchantCurrency(e.target.value)}
                      className="input-field"
                      style={{ height: '40px' }}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="INR">INR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Webhook URL (Async Events)</label>
                    <input
                      type="url"
                      placeholder="https://webhook.site/..."
                      value={newMerchantWebhook}
                      onChange={(e) => setNewMerchantWebhook(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button type="submit" className="btn-primary">
                      Onboard Merchant
                    </button>
                  </div>
                </form>

                {onboardedSecret && (
                  <div style={{ marginTop: '20px', padding: '12px', border: '1px solid #1e8a44', backgroundColor: '#e6f7ed', fontSize: '13px' }}>
                    <p style={{ fontWeight: 'bold', color: '#1e8a44', marginBottom: '6px' }}>Merchant Onboarded Successfully!</p>
                    <div>ID: <code style={{ fontWeight: 'bold' }}>{onboardedSecret.id}</code></div>
                    <div>API Key: <code style={{ fontWeight: 'bold', color: 'var(--color-orange)' }}>{onboardedSecret.api_key}</code></div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Store this API key. In a real integration, hash verification secures all endpoints.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: FRAUD RULES */}
          {activeTab === 'fraud' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Fraud Rules Config</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Manage real-time transaction screening rules and view anomaly blocking records.</p>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Blocked Charges</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#cc2929' }}>{fraudAnalytics.blocked_payments}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Flagged Charges</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#b37400' }}>{fraudAnalytics.flagged_payments}</div>
                </div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Rules Enabled</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-orange)' }}>{fraudAnalytics.active_rules}/{fraudAnalytics.total_rules}</div>
                </div>
              </div>

              {/* Rules Management List */}
              <div className="card">
                <div className="card-title">
                  <span>Fraud Screening Rules</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {fraudRules.map((rule) => (
                    <div key={rule.id} style={{
                      padding: '16px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: rule.enabled ? 'white' : 'var(--color-bg-alt)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ color: rule.enabled ? 'var(--foreground)' : 'var(--color-text-muted)' }}>{rule.name}</h4>
                          <span className={`badge ${rule.action === 'BLOCK' ? 'badge-failed' : 'badge-warning'}`}>{rule.action}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          Type: <code>{rule.condition_type}</code> | Parameters: <code>{JSON.stringify(rule.parameters)}</code>
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: rule.enabled ? '#1e8a44' : 'var(--color-text-muted)' }}>
                          {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => toggleFraudRule(rule.id, rule.enabled === 1)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: rule.enabled ? '#cc2929' : 'white',
                            color: rule.enabled ? 'white' : '#cc2929',
                            border: '1px solid #cc2929',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {rule.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: RECONCILIATION */}
          {activeTab === 'reconciliation' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Payment Reconciliation Engine</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Match internal ledger captures against mock bank statements to identify and resolve transaction differences.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
                {/* Trigger Control */}
                <div className="card">
                  <div className="card-title">
                    <span>Trigger Reconciliation Scan</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="input-label">Select Payment Provider</label>
                      <select value={reconProvider} onChange={(e) => setReconProvider(e.target.value)} className="input-field" style={{ height: '40px' }}>
                        <option value="stripe">Stripe</option>
                        <option value="paypal">PayPal</option>
                        <option value="razorpay">Razorpay</option>
                      </select>
                    </div>

                    <div>
                      <label className="input-label">Settlement Date</label>
                      <input
                        type="date"
                        value={reconDate}
                        onChange={(e) => setReconDate(e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={runReconciliation}
                      disabled={reconProcessing}
                      className="btn-primary"
                      style={{ height: '40px' }}
                    >
                      {reconProcessing ? <RefreshCw className="animate-spin" size={16} /> : 'RUN RECON SCAN'}
                    </button>
                  </div>

                  {latestReconResult && (
                    <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '20px', paddingTop: '16px' }}>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '8px' }}>
                        Scan Status: 
                        <span className={`badge ${latestReconResult.status === 'MATCHED' ? 'badge-success' : 'badge-failed'}`}>
                          {latestReconResult.status.replace('_', ' ')}
                        </span>
                      </h4>
                      
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Internal Ledger Total:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>${latestReconResult.our_total.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Provider Statement Total:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>${latestReconResult.provider_total.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted var(--color-border)', paddingTop: '4px', fontWeight: 'bold' }}>
                          <span>Discrepancy:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: latestReconResult.discrepancy > 0 ? '#cc2929' : '#1e8a44' }}>
                            ${latestReconResult.discrepancy.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Discrepancies details */}
                <div className="card">
                  <div className="card-title">
                    <span>Discrepancies Found ({latestReconResult?.discrepancies?.length || 0})</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                    {(!latestReconResult || latestReconResult.discrepancies.length === 0) && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                        No discrepancies identified. Run scan to inspect discrepancies.
                      </div>
                    )}

                    {latestReconResult?.discrepancies?.map((disc: any, idx: number) => (
                      <div key={idx} style={{
                        padding: '12px',
                        border: '1px solid #cc2929',
                        backgroundColor: '#fcebeb',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#cc2929', textTransform: 'uppercase' }}>{disc.type}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                            {disc.payment_id ? `ID: ${disc.payment_id}` : `Tx: ${disc.provider_transaction_id}`}
                          </span>
                        </div>
                        <p style={{ color: 'var(--foreground)' }}>{disc.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              alert(`Resolving discrepancy of type: ${disc.type}. Resolving posts correcting adjusting entry to general ledger.`);
                              fetchTelemetry();
                            }}
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: '10px' }}
                          >
                            Post Adjustment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reports list */}
              <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-title">
                  <span>Historical Reconciliation Reports</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ padding: '8px' }}>Report ID</th>
                      <th>Gateway</th>
                      <th>Settlement Date</th>
                      <th>Discrepancy</th>
                      <th>Status</th>
                      <th>Ran At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationReports.map((rep) => (
                      <tr key={rep.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)' }}>{rep.id}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: '11px' }}>{rep.provider}</td>
                        <td>{rep.date}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: rep.discrepancy > 0 ? '#cc2929' : '#1e8a44' }}>
                          ${rep.discrepancy.toFixed(2)}
                        </td>
                        <td>
                          <span className={`badge ${rep.status === 'MATCHED' ? 'badge-success' : 'badge-failed'}`}>
                            {rep.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{new Date(rep.generated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: WEBHOOKS */}
          {activeTab === 'webhooks' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Simulated Merchant Webhooks</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Trace webhook dispatches, HTTP status responses, and automated backoff retry queue attempts.</p>
              </div>

              <div className="card">
                <div className="card-title">
                  <span>Webhook Despatch Queue Logs</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {webhookLogs.length === 0 && (
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                      No webhooks dispatched yet. Trigger a successful payment to send webhooks.
                    </div>
                  )}

                  {webhookLogs.map((log) => (
                    <div key={log.id} style={{
                      border: '1px solid var(--color-border)',
                      padding: '16px',
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 2fr',
                      gap: '24px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 'bold' }}>{log.id}</span>
                          <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : log.status === 'FAILED' ? 'badge-failed' : 'badge-warning'}`}>
                            {log.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--color-text-muted)' }}>
                          <div>Payment ID: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground)' }}>{log.paymentId}</strong></div>
                          <div>Target Endpoint: <code style={{ color: 'var(--foreground)', wordBreak: 'break-all' }}>{log.url}</code></div>
                          <div>Attempts: <strong>{log.attempts}/{log.maxAttempts}</strong></div>
                          <div>Last HTTP Status: <strong style={{ color: log.status === 'SUCCESS' ? '#1e8a44' : '#cc2929' }}>{log.lastResponse || 'None'}</strong></div>
                        </div>
                      </div>

                      {/* Terminal log window for retry history */}
                      <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '24px' }}>
                        <span className="input-label" style={{ marginBottom: '6px' }}>Connection Trace Logs</span>
                        <div style={{
                          backgroundColor: '#111111',
                          color: '#00ff66',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          padding: '10px',
                          height: '110px',
                          overflowY: 'auto'
                        }}>
                          {log.logs.map((item: string, i: number) => (
                            <div key={i} style={{ marginBottom: '4px' }}>{item}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </section>

        {/* 3. PERSISTENT RIGHT CONSOLE: EVENT STREAM TERMINAL */}
        <section style={{
          width: '35%',
          backgroundColor: '#111111',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #000000',
          flexShrink: 0
        }}>
          {/* Console Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #222222',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} color="var(--color-orange)" />
              <span style={{
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.05em'
              }}>KAFKA EVENT LOGSTREAM</span>
            </div>
            
            <button
              onClick={clearKafkaLogs}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #444444',
                color: '#888888',
                padding: '3px 8px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#444444'; e.currentTarget.style.color = '#888888'; }}
            >
              CLEAR FEED
            </button>
          </div>

          {/* Console Output */}
          <div style={{
            flexGrow: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {eventStream.length === 0 ? (
              <div style={{
                color: '#555555',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textAlign: 'center',
                paddingTop: '60px'
              }}>
                No events streamed yet.
              </div>
            ) : (
              eventStream.map((evt) => {
                let tagClass = 'tag-system';
                const topic = evt.topic.split('.')[0];
                if (topic === 'payment') tagClass = 'tag-system';
                else if (topic === 'idempotency') tagClass = 'tag-redis';
                else if (topic === 'vault') tagClass = 'tag-kms';
                else if (topic === 'ledger') tagClass = 'tag-ledger';
                else if (topic === 'provider') tagClass = 'tag-circuit';
                else if (topic === 'webhook') tagClass = 'tag-webhook';
                else if (topic === 'fraud') tagClass = 'tag-fraud';
                else if (topic === 'reconciliation') tagClass = 'tag-router';

                return (
                  <div key={evt.id} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    borderBottom: '1px solid #1a1a1a',
                    paddingBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className={`terminal-tag ${tagClass}`}>{evt.topic.toUpperCase()}</span>
                      <span style={{ color: '#555555', fontSize: '9px' }}>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: '#e5e5e5' }}>{evt.message}</div>
                    
                    {/* Event metadata details expand */}
                    {Object.keys(evt.payload || {}).length > 0 && (
                      <pre style={{
                        marginTop: '4px',
                        color: '#666666',
                        fontSize: '9px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {JSON.stringify(evt.payload)}
                      </pre>
                    )}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </section>

      </main>

      {/* Inject css keyframe for side pulsing */}
      <style jsx global>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
