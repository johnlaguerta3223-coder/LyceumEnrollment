import React, { useEffect, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import LoginForm from "./components/LoginForm";
import RegistrarDashboard from "./components/RegistrarDashboard";
import StudentDashboard from "./components/StudentDashboard";

type AppPage =
  | "login"
  | "enroll"
  | "student_portal"
  | "registrar_portal"
  | "admin_portal";

interface NetworkProfile {
  tier: "strong" | "moderate" | "weak";
  label: string;
  durationMs: number;
}

function detectNetworkProfile(): NetworkProfile {
  const nav = navigator as any;
  const conn =
    nav.connection || nav.mozConnection || nav.webkitConnection || null;

  const effectiveType: string = conn?.effectiveType || "4g";
  const downlink: number =
    typeof conn?.downlink === "number" ? conn.downlink : 10;
  const rtt: number = typeof conn?.rtt === "number" ? conn.rtt : 50;

  if (
    !navigator.onLine ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    downlink < 1.2 ||
    rtt > 450
  ) {
    return {
      tier: "weak",
      label: "Slow internet detected — loading...",
      durationMs: 2400,
    };
  }

  if (effectiveType === "3g" || downlink < 4.0 || rtt > 180) {
    return {
      tier: "moderate",
      label: "Moderate internet — loading...",
      durationMs: 1300,
    };
  }

  return {
    tier: "strong",
    label: "Loading...",
    durationMs: 550,
  };
}

function getInitialPage(): AppPage {
  const savedToken = localStorage.getItem("token");
  const savedRole = localStorage.getItem("user_role");

  if (savedToken) {
    if (savedRole === "parent") return "student_portal";
    if (savedRole === "registrar") return "registrar_portal";
    if (savedRole === "admin") return "admin_portal";
  }

  const savedPage = localStorage.getItem("lka_current_page") as string | null;
  if (savedPage === "enroll") {
    return "enroll";
  }

  return "login";
}

function App() {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem("token") || ""
  );
  const [page, setPageState] = useState<AppPage>(() => getInitialPage());

  // Network-Adaptive Transition Loader State
  const [isTransitionLoading, setIsTransitionLoading] =
    useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingRoleLabel, setLoadingRoleLabel] = useState<string>("Student");
  const [netProfile, setNetProfile] = useState<NetworkProfile>(() =>
    detectNetworkProfile()
  );
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const setPage = (nextPage: AppPage) => {
    localStorage.setItem("lka_current_page", nextPage);
    setPageState(nextPage);
  };

  useEffect(() => {
    if (!isTransitionLoading) return;

    const profile = detectNetworkProfile();
    setNetProfile(profile);
    setLoadingProgress(8);

    const totalMs = profile.durationMs;
    const stepMs = 45;
    const increment = 92 / Math.max(1, totalMs / stepMs);

    const intervalId = window.setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev + increment >= 100) {
          return 100;
        }
        return prev + increment;
      });
    }, stepMs);

    const timerId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      setLoadingProgress(100);
      setIsTransitionLoading(false);
    }, totalMs);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timerId);
    };
  }, [isTransitionLoading]);

  const handleLoginSuccess = (accessToken: string, role: string) => {
    setToken(accessToken);
    if (role === "parent") {
      setLoadingRoleLabel("Student Portal");
      setPage("student_portal");
    } else if (role === "registrar") {
      setLoadingRoleLabel("Registrar Portal");
      setPage("registrar_portal");
    } else if (role === "admin") {
      setLoadingRoleLabel("Admin Portal");
      setPage("admin_portal");
    }
    setIsTransitionLoading(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    localStorage.removeItem("lka_student_tab");
    localStorage.removeItem("lka_registrar_tab");
    localStorage.removeItem("lka_admin_tab");
    setToken("");
    setIsTransitionLoading(false);
    setPage("login");
  };

  if (isTransitionLoading) {
    const pct = Math.min(100, Math.round(loadingProgress));
    return (
      <div className="portal-loading-screen">
        <div
          className="portal-loading-card adaptive-loader-card"
          style={{ maxWidth: "340px", padding: "28px 24px" }}
        >
          <div className="loader-spinner-wrap">
            <div
              className={`loader-ring ${
                netProfile.tier === "weak"
                  ? "slow-ring"
                  : netProfile.tier === "moderate"
                  ? "med-ring"
                  : "fast-ring"
              }`}
            />
            <img
              src="/logo.jpg"
              alt="LKA Logo"
              className="portal-loading-logo"
            />
          </div>

          <h3 style={{ marginTop: "8px", marginBottom: "6px" }}>
            Opening {loadingRoleLabel}
          </h3>
          <p className="loader-step-text" style={{ marginBottom: "14px" }}>
            {netProfile.label}
          </p>

          <div className="loader-progress-track">
            <div
              className="loader-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  const renderInstallPopup = () => {
    if (!installPrompt || installDismissed) return null;
    return (
      <div
        style={{
          position: "fixed",
          bottom: "18px",
          right: "18px",
          zIndex: 9998,
          background: "#ffffff",
          border: "1px solid #f3c4dc",
          borderRadius: "14px",
          padding: "12px 14px",
          boxShadow: "0 14px 34px rgba(15, 23, 42, 0.16)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          maxWidth: "330px",
        }}
      >
        <img
          src="/logo.jpg"
          alt="LKA"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: "0.84rem", color: "#111827" }}>
            LKA Portal App
          </strong>
          <span style={{ display: "block", fontSize: "0.73rem", color: "#64748b" }}>
            Install for quick desktop access
          </span>
        </div>
        <button
          type="button"
          className="table-pay-btn"
          style={{ width: "auto", padding: "7px 13px", flexShrink: 0 }}
          onClick={handleInstallApp}
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setInstallDismissed(true)}
          aria-label="Close install prompt"
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontWeight: 700,
            fontSize: "1.05rem",
            cursor: "pointer",
            padding: "2px 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    );
  };

  if (page === "student_portal" && token) {
    return (
      <>
        <StudentDashboard token={token} onLogout={handleLogout} />
        {renderInstallPopup()}
      </>
    );
  }

  if (page === "registrar_portal" && token) {
    return (
      <>
        <RegistrarDashboard token={token} onLogout={handleLogout} />
        {renderInstallPopup()}
      </>
    );
  }

  if (page === "admin_portal" && token) {
    return (
      <>
        <AdminDashboard token={token} onLogout={handleLogout} />
        {renderInstallPopup()}
      </>
    );
  }

  return (
    <>
      <LoginForm
        key={page === "enroll" ? "enroll" : "login"}
        initialView={page === "enroll" ? "register" : "login"}
        onLoginSuccess={handleLoginSuccess}
      />
      {renderInstallPopup()}
    </>
  );
}

export default App;
