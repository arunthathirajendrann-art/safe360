import React, { useState } from "react";
import { Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { loginGuardianApi } from "../../services/api";

export default function LoginView({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await loginGuardianApi(email, password);
      if (response.success && response.user) {
        onLoginSuccess(response.user, response.token);
      } else {
        setError(response.message || "Invalid authentication credentials.");
      }
    } catch (err) {
      setError(err.message || "Failed to connect to Safe360 authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0F172A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        backgroundColor: "#1E293B",
        borderRadius: "16px",
        border: "1px solid #334155",
        padding: "36px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px"
          }}>
            <Shield style={{ width: "30px", height: "30px", color: "#818CF8" }} />
          </div>
          <h1 style={{ color: "#F8FAFC", fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0" }}>
            SAFE360 Command Center
          </h1>
          <p style={{ color: "#94A3B8", fontSize: "14px", margin: 0 }}>
            Guardian & Responder Access Portal
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#FCA5A5",
            fontSize: "13px"
          }}>
            <AlertCircle style={{ width: "18px", height: "18px", flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", color: "#CBD5E1", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
              GUARDIAN EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748B", width: "18px", height: "18px" }} />
              <input
                type="email"
                placeholder="hema_guardian@safe360.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "12px 14px 12px 42px",
                  color: "#F8FAFC",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", color: "#CBD5E1", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748B", width: "18px", height: "18px" }} />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  backgroundColor: "#0F172A",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "12px 14px 12px 42px",
                  color: "#F8FAFC",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              backgroundColor: loading ? "#475569" : "#6366F1",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background-color 0.2s"
            }}
          >
            {loading ? "Authenticating Guardian..." : "Authenticate Guardian"}
            {!loading && <ArrowRight style={{ width: "18px", height: "18px" }} />}
          </button>
        </form>

        {/* Quick Demo Login Presets */}
        <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
          <p style={{ color: "#64748B", fontSize: "12px", textAlign: "center", marginBottom: "12px", fontWeight: "600" }}>
            DEMO GUARDIAN ACCOUNTS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleDemoFill("hema_guardian@safe360.internal", "HemaPassword123!")}
              style={{
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#94A3B8",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>Hema (Authorized Guardian for Arun)</span>
              <CheckCircle2 style={{ width: "14px", height: "14px", color: "#10B981" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
