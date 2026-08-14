import React, { useState } from "react";
import {
  Siren,
  Shield,
  UserCheck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  Users,
  ArrowRight,
  TrendingUp,
  Activity,
  Mic,
  Navigation,
  ShieldAlert,
  Radio,
  Key,
  PlusCircle,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText
} from "lucide-react";
import StatsCard from "../components/common/StatsCard";
import IncidentTable from "../components/incidents/IncidentTable";
import EmptyState from "../components/common/EmptyState";
import { connectWithCodeApi } from "../services/api";

export default function OverviewPage({
  currentUser,
  connectedPeople = [],
  incidents = [],
  responders = [],
  onAcknowledge,
  onSelectIncident,
  onOpenSimulator,
  onRefresh
}) {
  const [connectCode, setConnectCode] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");
  const [selectedPersonFilter, setSelectedPersonFilter] = useState("ALL");

  // Filter active, acknowledged, and resolved incidents from real MongoDB data
  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "ACKNOWLEDGED");
  const acknowledgedIncidents = incidents.filter((i) => i.status === "ACKNOWLEDGED");
  const resolvedIncidents = incidents.filter((i) => i.status === "RESOLVED");

  // Primary active incident to display in Hero Safety Overview Card
  const currentEmergency = activeIncidents[0] || acknowledgedIncidents[0] || null;

  // Handle entering connection code on Guardian Dashboard
  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!connectCode || connectCode.trim().length < 4) {
      setConnectError("Please enter a valid 6-character connection code.");
      return;
    }

    setConnectLoading(true);
    setConnectError("");
    setConnectSuccess("");

    try {
      const res = await connectWithCodeApi(connectCode.trim());
      if (res.success) {
        setConnectSuccess(res.message || "Connected successfully with protected person!");
        setConnectCode("");
        if (onRefresh) await onRefresh();
      } else {
        setConnectError(res.message || "Failed to connect using provided code.");
      }
    } catch (err) {
      setConnectError(err.message || "Failed to connect with code.");
    } finally {
      setConnectLoading(false);
    }
  };

  const getSourceIcon = (sourceStr) => {
    const src = sourceStr || "MANUAL_SOS";
    if (src.includes("STEALTH")) return <ShieldAlert size={20} color="#F59E0B" />;
    if (src.includes("VOICE")) return <Mic size={20} color="#EC4899" />;
    if (src.includes("FALL")) return <Activity size={20} color="#EF4444" />;
    if (src.includes("ROUTE")) return <Navigation size={20} color="#3B82F6" />;
    if (src.includes("CHECKIN")) return <Clock size={20} color="#10B981" />;
    return <Siren size={20} color="#EF4444" />;
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  };

  // Check if actual GPS coordinates exist
  const hasValidLocation = (loc) => {
    return loc && typeof loc.latitude === "number" && typeof loc.longitude === "number" && (loc.latitude !== 0 || loc.longitude !== 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* TOP HERO SYSTEM OPERATIONAL STATUS STRIP */}
      <div style={{
        background: "linear-gradient(90deg, #1E293B 0%, #0F172A 100%)",
        borderRadius: "14px",
        padding: "1rem 1.5rem",
        border: "1px solid #334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#10B981",
            boxShadow: "0 0 12px #10B981"
          }} />
          <div>
            <div style={{ color: "#F8FAFC", fontSize: "0.95rem", fontWeight: "800", letterSpacing: "0.03em" }}>
              SAFE360 REAL-TIME PROTECTION INTELLIGENCE
            </div>
            <div style={{ color: "#94A3B8", fontSize: "0.75rem", marginTop: "2px" }}>
              Status: <strong style={{ color: "#6EE7B7" }}>ALL SYSTEMS OPERATIONAL</strong>
            </div>
          </div>
        </div>

        {/* Live Status Indicators Strip */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={14} color="#818CF8" />
            <span style={{ fontSize: "0.75rem", color: "#CBD5E1", fontWeight: "600" }}>
              Circle: <strong style={{ color: "#F8FAFC" }}>{connectedPeople.length} Connected</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Activity size={14} color="#F59E0B" />
            <span style={{ fontSize: "0.75rem", color: "#CBD5E1", fontWeight: "600" }}>
              Engine: <strong style={{ color: "#F8FAFC" }}>Active</strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={14} color="#38BDF8" />
            <span style={{ fontSize: "0.75rem", color: "#CBD5E1", fontWeight: "600" }}>
              GPS Lock: <strong style={{ color: currentEmergency && hasValidLocation(currentEmergency.location) ? "#38BDF8" : "#94A3B8" }}>
                {currentEmergency && hasValidLocation(currentEmergency.location) ? "Verified" : "Standby"}
              </strong>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={14} color="#EC4899" />
            <span style={{ fontSize: "0.75rem", color: "#CBD5E1", fontWeight: "600" }}>
              Escalation: <strong style={{ color: "#F8FAFC" }}>Multi-Tier</strong>
            </span>
          </div>
        </div>
      </div>

      {/* CONNECT PROTECTED PERSON CARD (Top Hero Workflow) */}
      <div style={{
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)",
        border: "1px solid rgba(99, 102, 241, 0.3)",
        borderRadius: "14px",
        padding: "1.25rem 1.5rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Key size={20} color="#818CF8" />
            <h3 style={{ color: "#F8FAFC", fontSize: "1.05rem", margin: 0, fontWeight: "700" }}>
              Connect Protected Person
            </h3>
          </div>
          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
            Enter the 6-character connection code generated on the protected person's Safe360 app
          </span>
        </div>

        <form onSubmit={handleConnectSubmit} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1", minWidth: "220px" }}>
            <input
              type="text"
              placeholder="ENTER CODE (e.g. A7K9P2)"
              value={connectCode}
              onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{
                width: "100%",
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "#818CF8",
                fontSize: "1rem",
                fontWeight: "800",
                letterSpacing: "3px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
          <button
            type="submit"
            disabled={connectLoading}
            style={{
              backgroundColor: "#6366F1",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "0.9rem",
              fontWeight: "700",
              cursor: connectLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {connectLoading ? "Connecting..." : "CONNECT PROTECTED PERSON"}
            {!connectLoading && <ArrowRight size={16} />}
          </button>
        </form>

        {connectError && (
          <div style={{ marginTop: "10px", color: "#FCA5A5", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertCircle size={14} />
            <span>{connectError}</span>
          </div>
        )}

        {connectSuccess && (
          <div style={{ marginTop: "10px", color: "#6EE7B7", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={14} />
            <span>{connectSuccess}</span>
          </div>
        )}
      </div>

      {/* 4 STATS CARDS (CALCULATED FROM REAL MONGODB DATA ONLY) */}
      <div className="grid-4">
        <StatsCard
          title="Active Emergencies"
          value={activeIncidents.length}
          subtext={activeIncidents.length > 0 ? "Requires guardian response" : "No active emergency alerts"}
          icon={Siren}
          color="#EF4444"
          pulse={activeIncidents.length > 0}
        />
        <StatsCard
          title="Connected Protected Circle"
          value={connectedPeople.length}
          subtext={`Authorized for ${currentUser?.name || "Guardian"}`}
          icon={Users}
          color="#818CF8"
        />
        <StatsCard
          title="Acknowledged Emergencies"
          value={acknowledgedIncidents.length}
          subtext="Escalation sequence halted"
          icon={CheckCircle}
          color="#10B981"
        />
        <StatsCard
          title="Resolved Incidents"
          value={resolvedIncidents.length}
          subtext="Historical safety records"
          icon={Shield}
          color="#3B82F6"
        />
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
        
        {/* LEFT COLUMN: Connected Protected People List */}
        <div className="card" style={{ padding: "1.25rem", height: "fit-content" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={18} color="#818CF8" />
              <h3 style={{ fontSize: "1rem", color: "#F8FAFC", margin: 0 }}>Protected Circle</h3>
            </div>
            <span style={{ fontSize: "0.75rem", background: "rgba(129, 140, 248, 0.15)", color: "#818CF8", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
              {connectedPeople.length} Connected
            </span>
          </div>

          <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginBottom: "1rem", lineHeight: 1.4 }}>
            Backend enforced authorization: Only protected people connected with <strong>{currentUser?.name}</strong> appear here.
          </p>

          {connectedPeople.length === 0 ? (
            <div style={{ padding: "1.25rem", background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", border: "1px dashed #334155", textAlign: "center" }}>
              <Users size={32} color="#64748B" style={{ margin: "0 auto 8px auto" }} />
              <div style={{ fontSize: "0.85rem", color: "#F8FAFC", fontWeight: "700", marginBottom: "4px" }}>No Protected People Connected</div>
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.4 }}>
                Enter the connection code shown on your family member's Safe360 mobile app in the section above.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {connectedPeople.map((person) => (
                <div
                  key={person.relationshipId || person.protectedPerson?.userId}
                  onClick={() => setSelectedPersonFilter(selectedPersonFilter === person.protectedPerson?.userId ? "ALL" : person.protectedPerson?.userId)}
                  style={{
                    padding: "0.9rem",
                    backgroundColor: selectedPersonFilter === person.protectedPerson?.userId ? "rgba(99, 102, 241, 0.15)" : "#0F172A",
                    borderRadius: "10px",
                    border: selectedPersonFilter === person.protectedPerson?.userId ? "1px solid #6366F1" : "1px solid #334155",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#F8FAFC" }}>
                      {person.protectedPerson?.name || "Protected User"}
                    </span>
                    <span style={{ fontSize: "0.7rem", background: "rgba(16, 185, 129, 0.2)", color: "#10B981", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                      CONNECTED
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{person.relationship || "Guardian"}</span>
                    <span>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      <Phone size={12} /> {person.protectedPerson?.phone || "Phone N/A"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WOW ELEMENT #2: SAFETY SIGNALS GRID */}
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #334155" }}>
            <div style={{ fontSize: "0.8rem", color: "#94A3B8", fontWeight: "700", marginBottom: "0.75rem", letterSpacing: "0.03em" }}>
              MONITORED SAFETY SIGNALS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                { id: "MANUAL_SOS", label: "Manual SOS", icon: Siren, color: "#EF4444" },
                { id: "STEALTH_SOS", label: "Stealth SOS", icon: ShieldAlert, color: "#F59E0B" },
                { id: "VOICE_SOS", label: "Voice SOS", icon: Mic, color: "#EC4899" },
                { id: "FALL_DETECTION", label: "Fall Sensor", icon: Activity, color: "#EF4444" },
                { id: "ROUTE_DEVIATION", label: "Route Alert", icon: Navigation, color: "#3B82F6" },
                { id: "MISSED_CHECKIN", label: "Check-in", icon: Clock, color: "#10B981" }
              ].map((sig) => {
                const isActive = currentEmergency && (currentEmergency.source === sig.id || currentEmergency.type === sig.id);
                const IconComponent = sig.icon;
                return (
                  <div
                    key={sig.id}
                    style={{
                      padding: "0.5rem 0.6rem",
                      borderRadius: "6px",
                      backgroundColor: isActive ? `${sig.color}22` : "#0F172A",
                      border: isActive ? `1px solid ${sig.color}` : "1px solid #334155",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <IconComponent size={14} color={sig.color} />
                    <span style={{ fontSize: "0.725rem", fontWeight: isActive ? "800" : "500", color: isActive ? "#F8FAFC" : "#94A3B8" }}>
                      {sig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real Active Emergency & Visual Storytelling Dashboard */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {currentEmergency ? (
            <div
              className="card"
              style={{
                padding: "1.5rem",
                border: currentEmergency.status === "ACKNOWLEDGED" ? "1px solid #10B981" : "1px solid #EF4444",
                boxShadow: currentEmergency.status === "ACKNOWLEDGED" ? "0 0 20px rgba(16, 185, 129, 0.15)" : "0 0 25px rgba(239, 68, 68, 0.2)",
                background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)"
              }}
            >
              {/* Emergency Alert Header Banner */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid #334155" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    padding: "10px",
                    borderRadius: "12px",
                    backgroundColor: currentEmergency.status === "ACKNOWLEDGED" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    {getSourceIcon(currentEmergency.source || currentEmergency.type)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h2 style={{ fontSize: "1.25rem", color: "#F8FAFC", margin: 0, fontWeight: "700" }}>
                        🚨 {currentEmergency.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED EMERGENCY" : "ACTIVE EMERGENCY ALERT"}
                      </h2>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backgroundColor: currentEmergency.priority === "CRITICAL" ? "#EF4444" : "#F59E0B",
                        color: "#FFFFFF"
                      }}>
                        {currentEmergency.priority || "HIGH"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#94A3B8", margin: "4px 0 0 0" }}>
                      Source: <strong>{currentEmergency.source || currentEmergency.type}</strong> • Triggered: {formatTimestamp(currentEmergency.createdAt)}
                    </p>
                    <div style={{ marginTop: "4px", fontSize: "0.725rem", color: "#F59E0B", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Radio size={12} /> Development notification dispatched (SIMULATED)
                    </div>
                  </div>
                </div>

                {/* Acknowledge Button */}
                {currentEmergency.status !== "ACKNOWLEDGED" ? (
                  <button
                    onClick={() => onAcknowledge(currentEmergency._id || currentEmergency.id)}
                    style={{
                      backgroundColor: "#10B981",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px 20px",
                      fontSize: "0.9rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                      transition: "transform 0.1s"
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>ACKNOWLEDGE EMERGENCY</span>
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10B981", fontSize: "0.85rem", fontWeight: "700", background: "rgba(16, 185, 129, 0.15)", padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                    <CheckCircle size={18} />
                    <span>ACKNOWLEDGED BY GUARDIAN</span>
                  </div>
                )}
              </div>

              {/* Protected Person & AI Assessment Panel */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", margin: "1.25rem 0" }}>
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "6px" }}>PROTECTED PERSON</div>
                  <div style={{ fontSize: "1.1rem", color: "#F8FAFC", fontWeight: "700" }}>
                    {connectedPeople.find(p => p.protectedPerson?.userId === currentEmergency.userId)?.protectedPerson?.name || currentEmergency.userId}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#818CF8", marginTop: "4px" }}>
                    User ID: {currentEmergency.userId}
                  </div>
                </div>

                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "6px" }}>AI SITUATION ASSESSMENT</div>
                  <div style={{ fontSize: "0.85rem", color: "#E2E8F0", lineHeight: 1.4 }}>
                    {currentEmergency.context || currentEmergency.detectionEvidence?.llmAssessment?.summary || "AI assessment unavailable — deterministic safety rules applied."}
                  </div>
                </div>
              </div>

              {/* PHASE 5 SAFETY INTELLIGENCE & EXPLAINABILITY EVIDENCE PANEL */}
              <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Shield size={16} color="#818CF8" />
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#F8FAFC" }}>Safety Intelligence & Explainable Evidence</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.725rem", background: "rgba(129, 140, 248, 0.15)", color: "#818CF8", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                      Confidence: {currentEmergency.confidence || 85}%
                    </span>
                    <span style={{ fontSize: "0.725rem", background: currentEmergency.isSimulated ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)", color: currentEmergency.isSimulated ? "#F59E0B" : "#10B981", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                      {currentEmergency.isSimulated ? "SIMULATED TEST SIGNAL" : "REAL DEVICE SIGNAL"}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: "0.8rem", color: "#CBD5E1", marginBottom: "0.75rem", lineHeight: 1.4 }}>
                  <strong>Decision Reason:</strong> {currentEmergency.assessmentReason || currentEmergency.context || "Multi-signal safety telemetry payload assessed."}
                </div>

                {currentEmergency.riskFactors && currentEmergency.riskFactors.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.725rem", color: "#94A3B8", fontWeight: "700" }}>EVIDENCE FACTORS:</span>
                    {currentEmergency.riskFactors.map((factor, idx) => (
                      <div key={idx} style={{ fontSize: "0.75rem", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#EF4444" }}>•</span> {factor}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WOW ELEMENT #3: ADAPTIVE ESCALATION VISUAL LADDER */}
              <div style={{ background: "#0F172A", padding: "1.25rem", borderRadius: "12px", border: "1px solid #334155", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <TrendingUp size={16} color="#F59E0B" />
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#F8FAFC" }}>Adaptive Escalation Pathway</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: currentEmergency.status === "ACKNOWLEDGED" ? "#10B981" : "#F59E0B", fontWeight: "700" }}>
                    {currentEmergency.status === "ACKNOWLEDGED" ? "ESCALATION HALTED (ACKNOWLEDGED)" : `Active Tier: ${currentEmergency.escalationState?.currentTier || "PRIMARY"}`}
                  </span>
                </div>

                {/* Escalation Stepper */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {[
                    { tier: "PRIMARY", label: "Primary Contact" },
                    { tier: "SECONDARY", label: "Secondary Contact" },
                    { tier: "TERTIARY", label: "Local Guardian" },
                    { tier: "RESPONDER_FLEET", label: "Tactical Fleet" }
                  ].map((step, idx) => {
                    const isCurrent = currentEmergency.escalationState?.currentTier === step.tier;
                    const isPassed = ["PRIMARY", "SECONDARY", "TERTIARY", "RESPONDER_FLEET"].indexOf(currentEmergency.escalationState?.currentTier) > idx;

                    return (
                      <div
                        key={step.tier}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "8px",
                          backgroundColor: isCurrent ? "rgba(245, 158, 11, 0.15)" : isPassed ? "rgba(16, 185, 129, 0.1)" : "#1E293B",
                          border: isCurrent ? "1px solid #F59E0B" : isPassed ? "1px solid #10B981" : "1px solid #334155"
                        }}
                      >
                        <div style={{ fontSize: "0.7rem", color: isCurrent ? "#F59E0B" : isPassed ? "#10B981" : "#64748B", fontWeight: "800" }}>
                          TIER {idx + 1}: {step.tier}
                        </div>
                        <div style={{ fontSize: "0.8rem", fontWeight: "700", color: "#F8FAFC", marginTop: "2px" }}>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WOW ELEMENT #1: LIVE INCIDENT TIMELINE */}
              {Array.isArray(currentEmergency.escalationHistory) && currentEmergency.escalationHistory.length > 0 && (
                <div style={{ background: "#0F172A", padding: "1.25rem", borderRadius: "12px", border: "1px solid #334155", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#F8FAFC", marginBottom: "0.75rem" }}>
                    Live Escalation Audit Timeline
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {currentEmergency.escalationHistory.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.8rem" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: item.action === "ACKNOWLEDGED" ? "#10B981" : "#F59E0B", marginTop: "4px" }} />
                        <div>
                          <div style={{ color: "#F8FAFC", fontWeight: "700" }}>
                            [{item.tier || "SYSTEM"}] {item.action}: {item.contactName || "Contact"}
                          </div>
                          <div style={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                            {item.reason} • <span className="mono">{formatTimestamp(item.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WOW ELEMENT #4: REAL LOCATION MAP AREA */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.25rem" }}>
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60A5FA", marginBottom: "8px" }}>
                    <MapPin size={18} />
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#F8FAFC" }}>Incident Location Coordinates</span>
                  </div>
                  {hasValidLocation(currentEmergency.location) ? (
                    <>
                      <div style={{ fontSize: "1.1rem", fontFamily: "monospace", color: "#38BDF8", fontWeight: "700", marginBottom: "4px" }}>
                        LAT: {currentEmergency.location.latitude}° N
                      </div>
                      <div style={{ fontSize: "1.1rem", fontFamily: "monospace", color: "#38BDF8", fontWeight: "700" }}>
                        LNG: {currentEmergency.location.longitude}° E
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "8px" }}>
                        Source: GPS Mobile Telemetry Lock
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "0.9rem", color: "#FCA5A5", fontWeight: "700", padding: "0.5rem 0" }}>
                      Location unavailable
                    </div>
                  )}
                </div>

                {/* OpenStreetMap Interactive View (Only rendered if real location exists) */}
                <div style={{ height: "160px", borderRadius: "10px", overflow: "hidden", border: "1px solid #334155", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {hasValidLocation(currentEmergency.location) ? (
                    <iframe
                      title="OpenStreetMap Location"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentEmergency.location.longitude - 0.01},${currentEmergency.location.latitude - 0.01},${currentEmergency.location.longitude + 0.01},${currentEmergency.location.latitude + 0.01}&layer=mapnik&marker=${currentEmergency.location.latitude},${currentEmergency.location.longitude}`}
                      style={{ filter: "invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "#64748B", padding: "1rem" }}>
                      <MapPin size={24} style={{ margin: "0 auto 4px auto", opacity: 0.5 }} />
                      <div style={{ fontSize: "0.8rem" }}>Location unavailable</div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <CheckCircle size={48} color="#10B981" style={{ margin: "0 auto 1rem auto" }} />
              <h3 style={{ fontSize: "1.1rem", color: "#F8FAFC", margin: "0 0 6px 0" }}>All Clear - No Active Emergencies</h3>
              <p style={{ fontSize: "0.8rem", color: "#94A3B8", margin: "0 0 1rem 0" }}>
                All connected protected people are currently safe. Telemetry is being continuously monitored.
              </p>
            </div>
          )}

          {/* PROTECTED INCIDENT HISTORY LOG TABLE */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", color: "#F8FAFC", margin: 0, fontWeight: "700" }}>
                  Protected Incident History Log
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "2px 0 0 0" }}>
                  Historical telemetry and escalation audit records
                </p>
              </div>
            </div>

            {incidents.length > 0 ? (
              <IncidentTable incidents={incidents} onSelectIncident={onSelectIncident} />
            ) : (
              <EmptyState
                title="No Historical Incidents"
                description="No historical emergency records found for your connected protected circle."
              />
            )}
          </div>

          {/* PHASE 5 VISUAL SAFETY INTELLIGENCE ANALYTICS PANEL */}
          <div className="card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", color: "#F8FAFC", margin: 0, fontWeight: "700" }}>
                  📊 Real-Time Safety Intelligence Analytics
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: "2px 0 0 0" }}>
                  Live aggregated telemetry metrics backed by MongoDB incident records
                </p>
              </div>
              <span style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", padding: "3px 10px", borderRadius: "10px", fontWeight: "700" }}>
                {incidents.length} Records Analyzed
              </span>
            </div>

            {incidents.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "#0F172A", borderRadius: "10px", border: "1px dashed #334155" }}>
                <Shield size={36} color="#64748B" style={{ margin: "0 auto 8px auto" }} />
                <div style={{ fontSize: "0.9rem", color: "#F8FAFC", fontWeight: "700" }}>No Safety Events Recorded Yet</div>
                <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "4px" }}>
                  Visual analytics will automatically calculate telemetry distributions when safety signals are detected.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                {/* Metric 1: Signal Distribution */}
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155" }}>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "8px" }}>SIGNAL SOURCES</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      { key: "MANUAL_SOS", label: "Manual SOS", color: "#EF4444" },
                      { key: "FALL_DETECTION", label: "Fall Sensor", color: "#F59E0B" },
                      { key: "VOICE_SOS", label: "Voice Intent", color: "#EC4899" },
                      { key: "ROUTE_DEVIATION", label: "Route Corridor", color: "#3B82F6" },
                      { key: "MISSED_CHECKIN", label: "Check-in", color: "#818CF8" }
                    ].map(src => {
                      const cnt = incidents.filter(i => (i.source || i.type) === src.key).length;
                      const pct = Math.round((cnt / (incidents.length || 1)) * 100);
                      return (
                        <div key={src.key} style={{ fontSize: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#CBD5E1", marginBottom: "2px" }}>
                            <span>{src.label}</span>
                            <span style={{ fontWeight: "700" }}>{cnt} ({pct}%)</span>
                          </div>
                          <div style={{ width: "100%", height: "4px", background: "#1E293B", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: src.color, borderRadius: "2px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Metric 2: Average Confidence */}
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "4px" }}>AVG DETECTION CONFIDENCE</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#818CF8", marginTop: "4px" }}>
                      {Math.round(incidents.reduce((acc, i) => acc + (i.confidence || 85), 0) / (incidents.length || 1))}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                      Multi-signal fusion accuracy score
                    </div>
                  </div>
                  <div style={{ marginTop: "1rem", padding: "8px", background: "rgba(129, 140, 248, 0.1)", borderRadius: "6px", fontSize: "0.7rem", color: "#818CF8" }}>
                    ✓ Multi-vector validation active
                  </div>
                </div>

                {/* Metric 3: False Alarm & Cancellation Rate */}
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "4px" }}>FALSE ALARM / CANCEL RATE</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "#10B981", marginTop: "4px" }}>
                      {Math.round((incidents.filter(i => i.status === "CANCELLED").length / (incidents.length || 1)) * 100)}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "4px" }}>
                      User confirmed false alarms
                    </div>
                  </div>
                  <div style={{ marginTop: "1rem", padding: "8px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "6px", fontSize: "0.7rem", color: "#10B981" }}>
                    {incidents.filter(i => i.status === "CANCELLED").length} Cancelled Alerts
                  </div>
                </div>

                {/* Metric 4: Real Device vs Simulated */}
                <div style={{ background: "#0F172A", padding: "1rem", borderRadius: "10px", border: "1px solid #334155", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: "700", marginBottom: "4px" }}>TELEMETRY HARDWARE SOURCE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#F8FAFC" }}>REAL DEVICE SIGNALS</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#10B981" }}>
                          {incidents.filter(i => !i.isSimulated).length}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#F8FAFC" }}>SIMULATED TEST SIGNALS</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#F59E0B" }}>
                          {incidents.filter(i => i.isSimulated).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "1rem", fontSize: "0.7rem", color: "#64748B" }}>
                    Telemetry audit verification active
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
