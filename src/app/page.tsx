"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { NavTab } from "@/components/layout/Sidebar";

// View Modules
import OverviewView from "@/components/overview/OverviewView";
import PaymentsView from "@/components/payments/PaymentsView";
import PaymentDetailDrawer from "@/components/payments/PaymentDetailDrawer";
import ProvidersView from "@/components/providers/ProvidersView";
import RoutingView from "@/components/routing/RoutingView";
import LedgerView from "@/components/ledger/LedgerView";
import ReconciliationView from "@/components/reconciliation/ReconciliationView";
import WebhooksView from "@/components/webhooks/WebhooksView";
import EventsView from "@/components/events/EventsView";
import SimulatorView from "@/components/simulator/SimulatorView";
import ArchitectureView from "@/components/architecture/ArchitectureView";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [selectedPaymentForDetail, setSelectedPaymentForDetail] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // System Telemetry States
  const [circuitBreakers, setCircuitBreakers] = useState<Record<string, any>>({});
  const [eventStream, setEventStream] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [idempotencyKeys, setIdempotencyKeys] = useState<any[]>([]);

  // Analytics
  const [analytics, setAnalytics] = useState<any>({
    total_payments: 0,
    settled_volume: 0,
    refunded_volume: 0,
    success_rate: 100,
  });
  const [providerComparison, setProviderComparison] = useState<any[]>([]);

  // Database Entities
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [reconciliationReports, setReconciliationReports] = useState<any[]>([]);

  // Simulator Form State
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [amount, setAmount] = useState("100.00");
  const [currency, setCurrency] = useState("USD");
  const [customerEmail, setCustomerEmail] = useState("buyer@acmeglobal.com");
  const [customerIpCountry, setCustomerIpCountry] = useState("US");
  const [cardCountry, setCardCountry] = useState("US");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [routingStrategy, setRoutingStrategy] = useState<"HIGHEST_SUCCESS" | "LOWEST_COST" | "MANUAL">("HIGHEST_SUCCESS");
  const [manualProvider, setManualProvider] = useState("stripe");
  const [capturePayment, setCapturePayment] = useState(true);
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [cardHolder, setCardHolder] = useState("Jane Doe");

  // Simulation Trace & Outcome
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionTrace, setExecutionTrace] = useState<string[]>([]);
  const [lastSimulationResponse, setLastSimulationResponse] = useState<any | null>(null);

  // Reconciliation
  const [reconProvider, setReconProvider] = useState("stripe");
  const [reconDate, setReconDate] = useState(new Date().toISOString().split("T")[0]);
  const [latestReconResult, setLatestReconResult] = useState<any | null>(null);
  const [reconProcessing, setReconProcessing] = useState(false);

  // Boot & Poll
  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const resMch = await fetch("/api/v1/merchants");
      const dataMch = await resMch.json();
      setMerchants(dataMch);
      if (dataMch.length > 0 && !selectedMerchant) {
        setSelectedMerchant(dataMch[0].id);
      }
      fetchTelemetry();
    } catch (e) {
      console.error("Failed to load initial data:", e);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const [resTel, resAn, resProv, resPay, resLed, resRep] = await Promise.all([
        fetch("/api/v1/simulation"),
        fetch("/api/v1/analytics/payments"),
        fetch("/api/v1/analytics/providers"),
        fetch("/api/v1/payments?limit=50"),
        fetch("/api/v1/ledger/entries?limit=80"),
        fetch("/api/v1/reconciliation/reports"),
      ]);

      const [dataTel, dataAn, dataProv, dataPay, dataLed, dataRep] = await Promise.all([
        resTel.json(),
        resAn.json(),
        resProv.json(),
        resPay.json(),
        resLed.json(),
        resRep.json(),
      ]);

      setCircuitBreakers(dataTel.circuitBreakers || {});
      setEventStream(dataTel.eventStream || []);
      setWebhookLogs(dataTel.webhookLogs || []);
      setIdempotencyKeys(dataTel.idempotencyKeys || []);
      setAnalytics(dataAn || {});
      setProviderComparison(dataProv || []);
      setPayments(dataPay || []);
      setLedgerEntries(dataLed || []);
      setReconciliationReports(dataRep || []);

      // If drawer is open, keep selected payment updated
      if (selectedPaymentForDetail) {
        const fresh = (dataPay || []).find((p: any) => p.id === selectedPaymentForDetail.id);
        if (fresh) setSelectedPaymentForDetail(fresh);
      }
    } catch (e) {
      console.error("Telemetry fetch error:", e);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchTelemetry();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const generateIdempotencyKey = () => {
    setIdempotencyKey("idem_" + Math.random().toString(36).substring(2, 14));
  };

  const setCardScenario = (type: "success" | "decline" | "timeout" | "auth3ds") => {
    if (type === "success") {
      setCardNumber("4111 1111 1111 4242");
      setCardHolder("Jane Doe");
      setCardCvv("123");
    } else if (type === "decline") {
      setCardNumber("4111 1111 1111 9999");
      setCardHolder("Declined Dave");
      setCardCvv("999");
    } else if (type === "timeout") {
      setCardNumber("4111 1111 1111 8888");
      setCardHolder("Timeout Tester");
      setCardCvv("888");
    } else if (type === "auth3ds") {
      setCardNumber("4111 1111 1111 7777");
      setCardHolder("Secure Sarah");
      setCardCvv("777");
    }
  };

  // Run Simulator Transaction
  const runPaymentSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchant) return;

    setIsProcessing(true);
    setExecutionTrace([]);
    setLastSimulationResponse(null);

    const log = (msg: string) => {
      setExecutionTrace((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      log("PCI Vault: Tokenizing card data via /api/v1/vault/tokenize...");
      const tokenRes = await fetch("/api/v1/vault/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: cardNumber, expiry: cardExpiry, cvv: cardCvv, holder: cardHolder }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        log(`PCI Vault: Tokenization rejected (${tokenData.error})`);
        setIsProcessing(false);
        return;
      }

      log(`PCI Vault: Generated token ${tokenData.token} (${tokenData.brand} ${tokenData.maskedNumber})`);
      log("API Gateway: Acquiring atomic idempotency lock & screening fraud...");

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
        log(`Idempotency: Key attached -> ${idempotencyKey}`);
      }

      const checkoutPayload = {
        merchant_id: selectedMerchant,
        amount: parseFloat(amount),
        currency,
        card_token: tokenData.token,
        customer_id: "cust_" + Math.random().toString(36).substring(2, 8),
        capture: capturePayment,
        routing_strategy: routingStrategy,
        manual_provider: manualProvider,
        metadata: { email: customerEmail, ipCountry: customerIpCountry, cardCountry },
      };

      const payRes = await fetch("/api/v1/payments", {
        method: "POST",
        headers,
        body: JSON.stringify(checkoutPayload),
      });

      const payData = await payRes.json();

      if (payRes.headers.get("X-Cache") === "HIT") {
        log("Idempotency: Cache HIT — Returned stored response payload");
      } else {
        if (payData.status === "PENDING_INQUIRY") {
          log(`Timeout Guard: Provider timed out. Set to PENDING_INQUIRY without blind failover.`);
        } else if (payData.status === "FAILED") {
          log(`Payment Engine: Declined -> ${payData.failure_reason}`);
        } else {
          log(`Smart Router: Selected ${payData.provider?.toUpperCase()} (Status: ${payData.status})`);
          log(`Ledger Engine: Double-entry posted to merchant, platform, and reserve accounts`);
          log(`Outbox: Webhook enqueued with HMAC-SHA256 signature`);
        }
      }

      setLastSimulationResponse(payData);
      await fetchTelemetry();
    } catch (err: any) {
      log(`System Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Issue Partial or Full Refund
  const handleRefundPayment = async (paymentId: string, refundAmount?: number) => {
    const res = await fetch(`/api/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: refundAmount }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Refund failed");
    }
    await fetchTelemetry();
  };

  // Run Reconciliation Scan
  const runReconciliation = async () => {
    setReconProcessing(true);
    setLatestReconResult(null);
    try {
      const res = await fetch("/api/v1/reconciliation/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: reconProvider, date: reconDate }),
      });
      const data = await res.json();
      setLatestReconResult(data);
      await fetchTelemetry();
    } catch (e) {
      console.error("Reconciliation error:", e);
    } finally {
      setReconProcessing(false);
    }
  };

  // Provider Telemetry Sliders
  const updateProviderSimSettings = async (provider: string, successRate: number, latency: number) => {
    try {
      await fetch("/api/v1/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_PROVIDER_CONFIG", provider, successRate, latency }),
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  const forceCircuitState = async (provider: string, state: "CLOSED" | "OPEN") => {
    try {
      await fetch("/api/v1/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "FORCE_CIRCUIT_STATE", provider, state }),
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  const clearKafkaLogs = async () => {
    try {
      await fetch("/api/v1/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLEAR_KAFKA_LOGS" }),
      });
      fetchTelemetry();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      merchants={merchants}
      selectedMerchant={selectedMerchant}
      onSelectMerchant={setSelectedMerchant}
      onOpenSimulator={() => setActiveTab("simulator")}
      onRefreshTelemetry={handleManualRefresh}
      isRefreshing={isRefreshing}
      paymentsCount={payments.length}
      unresolvedDiscrepancies={
        reconciliationReports.filter((r) => r.status === "DISCREPANCY_FOUND").length
      }
      activeIdempotencyKeys={idempotencyKeys.length}
    >
      {/* 1. Overview Dashboard */}
      {activeTab === "overview" && (
        <OverviewView
          analytics={analytics}
          providerComparison={providerComparison}
          circuitBreakers={circuitBreakers}
          recentPayments={payments}
          eventStream={eventStream}
          onSelectPayment={setSelectedPaymentForDetail}
          onOpenSimulator={() => setActiveTab("simulator")}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 2. Payments Explorer */}
      {activeTab === "payments" && (
        <PaymentsView
          payments={payments}
          onSelectPayment={setSelectedPaymentForDetail}
          onOpenSimulator={() => setActiveTab("simulator")}
        />
      )}

      {/* 3. Gateways & Circuit Breakers */}
      {activeTab === "providers" && (
        <ProvidersView
          circuitBreakers={circuitBreakers}
          onForceCircuitState={forceCircuitState}
          onUpdateSimSettings={updateProviderSimSettings}
        />
      )}

      {/* 4. Smart Routing Engine */}
      {activeTab === "routing" && <RoutingView />}

      {/* 5. Double-Entry Ledger */}
      {activeTab === "ledger" && (
        <LedgerView merchants={merchants} ledgerEntries={ledgerEntries} />
      )}

      {/* 6. Reconciliation */}
      {activeTab === "reconciliation" && (
        <ReconciliationView
          reconProvider={reconProvider}
          setReconProvider={setReconProvider}
          reconDate={reconDate}
          setReconDate={setReconDate}
          reconProcessing={reconProcessing}
          latestReconResult={latestReconResult}
          onRunRecon={runReconciliation}
          reconciliationReports={reconciliationReports}
        />
      )}

      {/* 7. Webhooks Delivery Queue */}
      {activeTab === "webhooks" && <WebhooksView webhookLogs={webhookLogs} />}

      {/* 8. Developer Simulation Studio */}
      {activeTab === "simulator" && (
        <SimulatorView
          merchants={merchants}
          selectedMerchant={selectedMerchant}
          onSelectMerchant={setSelectedMerchant}
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
          executionTrace={executionTrace}
          lastResponse={lastSimulationResponse}
        />
      )}

      {/* 9. Live Developer Event Logs */}
      {activeTab === "events" && (
        <EventsView eventStream={eventStream} onClear={clearKafkaLogs} />
      )}

      {/* 10. Engine Architecture Blueprint */}
      {activeTab === "architecture" && <ArchitectureView />}

      {/* Deep Payment Investigation Slide-Over Drawer */}
      <PaymentDetailDrawer
        payment={selectedPaymentForDetail}
        isOpen={selectedPaymentForDetail !== null}
        onClose={() => setSelectedPaymentForDetail(null)}
        onRefundPayment={handleRefundPayment}
        ledgerEntries={ledgerEntries}
      />
    </AppShell>
  );
}
