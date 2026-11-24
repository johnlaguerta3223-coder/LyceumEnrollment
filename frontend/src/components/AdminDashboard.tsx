import { API_BASE } from "../api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  IconCalculator,
  IconCheck,
  IconClipboard,
  IconKey,
  IconSchool,
  IconShield,
  IconUser,
  IconUsers,
} from "./Icons";

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

interface GradeBreakdownRow {
  grade_level: string;
  official_baseline: number;
  portal_enrolled: number;
  pending: number;
}

interface AnalyticsData {
  school_population_total: number;
  morning_shift_total: number;
  afternoon_shift_total: number;
  portal_registered_total: number;
  portal_officially_enrolled: number;
  portal_pending_verification: number;
  total_assessed: number;
  total_collected: number;
  total_receivables: number;
  plan_counts: {
    cash: number;
    quarterly: number;
    monthly: number;
  };
  channel_totals: {
    Cash: number;
    GCash: number;
    "Online Banking": number;
  };
  grade_breakdown: GradeBreakdownRow[];
}

interface FeeTier {
  tier_id: string;
  label: string;
  tuition_fee: number;
  misc_fee: number;
  computer_fee: number;
  cash_discount_percent: number;
}

interface CollectionRow {
  id: number;
  or_number: string;
  student_id_no: string;
  student_name: string;
  grade_level: string;
  guardian_name: string;
  description: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  paid_at: string;
  status: string;
}

interface UserAccountRow {
  id: number;
  name: string;
  guardian_name: string;
  email: string;
  phone: string;
  role: "parent" | "registrar" | "admin";
  is_active: boolean;
  student_id_no: string;
  grade_level: string;
  enrollment_status: string;
}

function formatPeso(amount: number): string {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function AdminDashboard({
  token,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTabState] = useState<
    "analytics" | "fees" | "reports" | "users"
  >(() => {
    const saved = localStorage.getItem("lka_admin_tab");
    if (
      saved === "analytics" ||
      saved === "fees" ||
      saved === "reports" ||
      saved === "users"
    ) {
      return saved;
    }
    return "analytics";
  });

  const setActiveTab = (
    tab: "analytics" | "fees" | "reports" | "users"
  ) => {
    localStorage.setItem("lka_admin_tab", tab);
    setActiveTabState(tab);
  };
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [enrollmentOpen, setEnrollmentOpen] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [feeTiers, setFeeTiers] = useState<FeeTier[]>([]);
  const [collectionReport, setCollectionReport] = useState<CollectionRow[]>([]);
  const [users, setUsers] = useState<UserAccountRow[]>([]);

  // Tab 3: Collection Report Filter State
  const [reportSearch, setReportSearch] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("All Channels");

  // Tab 4: User & Staff Management State
  const [staffName, setStaffName] = useState<string>("");
  const [staffEmail, setStaffEmail] = useState<string>("");
  const [staffPhone, setStaffPhone] = useState<string>("");
  const [staffRole, setStaffRole] = useState<"registrar" | "admin">(
    "registrar"
  );
  const [staffPassword, setStaffPassword] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "staff" | "student"
  >("all");
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [resetNewPass, setResetNewPass] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth > 920 : true
  );
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/auth/admin/overview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEnrollmentOpen(Boolean(res.data.enrollment_open));
      setAnalytics(res.data.analytics);
      setFeeTiers(res.data.fee_tiers || []);
      setCollectionReport(res.data.collection_report || []);
      setUsers(res.data.users || []);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        onLogout();
        return;
      }
      setBannerMsg({
        type: "error",
        text: "Could not load Admin Dashboard data. Please click Retry.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, [token]);

  const handleToggleEnrollmentPeriod = async () => {
    const nextState = !enrollmentOpen;
    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/admin/enrollment-toggle`,
        { enrollment_open: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrollmentOpen(nextState);
      setBannerMsg({ type: "success", text: res.data.message });
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Failed to change online enrollment status.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFeeFieldChange = (
    tierId: string,
    field:
      | "tuition_fee"
      | "misc_fee"
      | "computer_fee"
      | "cash_discount_percent",
    value: string
  ) => {
    const numericVal = Number(value) || 0;
    setFeeTiers((prev) =>
      prev.map((t) =>
        t.tier_id === tierId ? { ...t, [field]: numericVal } : t
      )
    );
  };

  const handleSaveFeeMatrix = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/admin/fees`,
        { tiers: feeTiers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchAdminOverview();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Failed to save updated tuition fee matrix.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCsvReport = () => {
    const headers = [
      "Record ID",
      "Cashier OR Code",
      "Student ID",
      "Student Name",
      "Grade Level",
      "Guardian Name",
      "Payment Description",
      "Payment Mode",
      "Physical OR / Reference",
      "Date & Time",
      "Amount Paid (PHP)",
    ];
    const rows = filteredCollections.map((c) => [
      c.id,
      `"${c.or_number}"`,
      `"${c.student_id_no}"`,
      `"${c.student_name}"`,
      `"${c.grade_level}"`,
      `"${c.guardian_name}"`,
      `"${c.description}"`,
      `"${c.payment_method}"`,
      `"${c.reference_no}"`,
      `"${c.paid_at}"`,
      c.amount.toFixed(2),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      "LKA_Tuition_Collection_Report_SY2026-2027.csv"
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setBannerMsg({
      type: "success",
      text: "Official Tuition Collection Report exported to CSV (Excel)!",
    });
  };

  const handleCreateStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/admin/users`,
        {
          name: staffName,
          email: staffEmail,
          phone: staffPhone,
          role: staffRole,
          password: staffPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      await fetchAdminOverview();
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text: err.response?.data?.detail || "Could not create staff account.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleUserActive = async (user: UserAccountRow) => {
    try {
      setProcessing(true);
      const res = await axios.put(
        `${API_BASE}/api/auth/admin/users/${user.id}/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchAdminOverview();
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.detail || "Failed to change account active status.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent, userId: number) => {
    e.preventDefault();
    try {
      setProcessing(true);
      const res = await axios.put(
        `${API_BASE}/api/auth/admin/users/${userId}/reset-password`,
        { new_password: resetNewPass },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      setResettingUserId(null);
      setResetNewPass("");
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to reset password.",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-loading-screen">
        <div className="portal-loading-card">
          <img src="/logo.jpg" alt="LKA Logo" className="portal-loading-logo" />
          <h3>Loading LKA Administrator Portal...</h3>
          <p>
            Connecting to server and fetching school-wide analytics and settings.
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="portal-loading-screen">
        <div className="portal-loading-card">
          <img src="/logo.jpg" alt="LKA Logo" className="portal-loading-logo" />
          <h3>Unable to Load Admin Portal</h3>
          <p>
            The server may be waking up or your session expired. Please try
            again or return to the login screen.
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="login-btn"
              style={{ width: "auto", padding: "10px 20px" }}
              onClick={() => fetchAdminOverview()}
            >
              Retry Connection
            </button>
            <button
              type="button"
              className="portal-logout-btn"
              onClick={onLogout}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredCollections = collectionReport.filter((c) => {
    if (channelFilter !== "All Channels") {
      if (
        channelFilter === "GCash" &&
        !c.payment_method.toLowerCase().includes("gcash")
      ) {
        return false;
      }
      if (
        channelFilter === "Online Banking" &&
        !c.payment_method.toLowerCase().includes("bank")
      ) {
        return false;
      }
      if (
        channelFilter === "Cash" &&
        (c.payment_method.toLowerCase().includes("gcash") ||
          c.payment_method.toLowerCase().includes("bank"))
      ) {
        return false;
      }
    }
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      return (
        c.student_name.toLowerCase().includes(q) ||
        c.student_id_no.toLowerCase().includes(q) ||
        c.or_number.toLowerCase().includes(q) ||
        c.guardian_name.toLowerCase().includes(q) ||
        (c.reference_no || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === "staff" && u.role === "parent") return false;
    if (userRoleFilter === "student" && u.role !== "parent") return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.student_id_no.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const adminDisplayName =
    localStorage.getItem("user_name") || "School Administrator";

  return (
    <div className="lka-app-shell">
      {/* ===== HOA-STYLE LEFT SIDEBAR ===== */}
      {sidebarOpen && (
        <div
          className="lka-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`lka-sidebar ${sidebarOpen ? "" : "collapsed"}`}
        onClick={(e) => {
          if (
            window.innerWidth <= 920 &&
            (e.target as HTMLElement).closest(".lka-nav-item")
          ) {
            setSidebarOpen(false);
          }
        }}
      >
        <div className="lka-sidebar-brand">
          <img src="/logo.jpg" alt="LKA Logo" className="lka-sidebar-logo" />
          <div>
            <strong>LKA</strong>
            <span>Enrollment &amp; Billing System</span>
          </div>
        </div>

        <div className="lka-sidebar-group">
          <span className="lka-sidebar-label">Workspace</span>
          <nav className="lka-sidebar-nav">
            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "analytics" ? "active" : ""
              }`}
              onClick={() => setActiveTab("analytics")}
            >
              <span className="lka-nav-item-left">
                <IconSchool size={16} />
                <span>Dashboard</span>
              </span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${activeTab === "users" ? "active" : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <span className="lka-nav-item-left">
                <IconUsers size={16} />
                <span>Accounts</span>
              </span>
              <span className="lka-nav-badge">{users.length}</span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "reports" ? "active" : ""
              }`}
              onClick={() => setActiveTab("reports")}
            >
              <span className="lka-nav-item-left">
                <IconClipboard size={16} />
                <span>Collection Reports</span>
              </span>
              <span className="lka-nav-badge">{collectionReport.length}</span>
            </button>
          </nav>
        </div>

        <div className="lka-sidebar-group">
          <span className="lka-sidebar-label">Manage System</span>
          <nav className="lka-sidebar-nav">
            <button
              type="button"
              className={`lka-nav-item ${activeTab === "fees" ? "active" : ""}`}
              onClick={() => setActiveTab("fees")}
            >
              <span className="lka-nav-item-left">
                <IconCalculator size={16} />
                <span>Tuition &amp; Fee Matrix</span>
              </span>
            </button>

            <button
              type="button"
              className="lka-nav-item"
              onClick={handleToggleEnrollmentPeriod}
              disabled={processing}
            >
              <span className="lka-nav-item-left">
                <IconShield size={16} />
                <span>
                  Enrollment: {enrollmentOpen ? "OPEN" : "CLOSED"}
                </span>
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="lka-main-area">
        <header className="lka-topbar">
          <div className="lka-topbar-left">
            <button
              type="button"
              className="lka-sidebar-toggle-btn"
              title="Toggle Sidebar"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              ☰
            </button>
            <span className="lka-topbar-title">
              Lyceum ng Kabataan Academy, Inc. · S.Y. 2026–2027
            </span>
          </div>

          <div className="lka-topbar-right">
            <span
              className={`portal-status-pill ${
                enrollmentOpen ? "enrolled" : "pending"
              }`}
            >
              <IconCheck size={12} />
              Enrollment: {enrollmentOpen ? "OPEN" : "CLOSED"}
            </span>
            <div className="lka-user-menu-wrap">
              <button
                type="button"
                className="lka-user-pill-btn"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <div className="lka-avatar-circle">
                  {adminDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="lka-user-pill-info">
                  <strong>{adminDisplayName}</strong>
                  <span>Administrator</span>
                </div>
                <span className="lka-user-caret">▾</span>
              </button>

              {userMenuOpen && (
                <div className="lka-user-dropdown">
                  <div className="lka-dropdown-header">
                    <strong>{adminDisplayName}</strong>
                    <span>School Administrator</span>
                  </div>
                  <button
                    type="button"
                    className="lka-dropdown-logout"
                    onClick={onLogout}
                  >
                    <span>Logout</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="lka-workspace-wrap">
          <div className="lka-workspace-card">
            {bannerMsg && (
              <div
                className={`alert ${bannerMsg.type}`}
                style={{ marginBottom: "18px" }}
              >
                {bannerMsg.text}
              </div>
            )}

            {/* ==================== TAB 1: ANALYTICS & ENROLLMENT OVERVIEW ==================== */}
            {activeTab === "analytics" && (
              <div className="portal-tab-content">
                {/* HOA-Style Welcome Banner */}
                <section className="lka-welcome-banner">
                  <div>
                    <div className="lka-welcome-date">{dateStr}</div>
                    <div className="lka-welcome-time">{timeStr}</div>
                    <h1>Hello {adminDisplayName}!</h1>
                    <p>
                      Monitor {analytics.school_population_total} learners across
                      27 sections, review tuition collections, and manage staff
                      and student accounts for S.Y. 2026–2027.
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="lka-cta-pill-btn"
                        onClick={() => setActiveTab("users")}
                      >
                        Manage Accounts →
                      </button>
                      <button
                        type="button"
                        className="portal-logout-btn"
                        onClick={() => setActiveTab("reports")}
                      >
                        View Collection Reports
                      </button>
                    </div>
                  </div>

                  {/* Clean Flat Academic Illustration */}
                  <div className="lka-welcome-art" aria-hidden="true">
                    <svg width="210" height="135" viewBox="0 0 210 135" fill="none">
                      <rect x="20" y="96" width="170" height="8" rx="4" fill="#FBCFE8" />
                      <rect x="44" y="42" width="66" height="44" rx="8" fill="#FFFFFF" stroke="#D43783" strokeWidth="2.5" />
                      <rect x="52" y="50" width="50" height="24" rx="4" fill="#FDF2F8" />
                      <rect x="72" y="86" width="10" height="10" fill="#D43783" />
                      <circle cx="145" cy="46" r="14" fill="#F9A8D4" stroke="#4A0E2E" strokeWidth="2" />
                      <path d="M126 96C126 77 134 66 145 66C156 66 164 77 164 96H126Z" fill="#EC4899" stroke="#4A0E2E" strokeWidth="2" />
                      <circle cx="182" cy="70" r="18" fill="#FCE7F3" />
                    </svg>
                  </div>
                </section>

                {/* HOA-Style 5 Stat Cards */}
                <div className="lka-stat-row-5">
                  <div className="lka-mini-stat">
                    <span className="lka-mini-stat-label">School Population</span>
                    <strong className="lka-mini-stat-val">
                      {analytics.school_population_total}
                    </strong>
                    <span className="lka-mini-stat-sub">
                      {analytics.morning_shift_total} AM ·{" "}
                      {analytics.afternoon_shift_total} PM
                    </span>
                  </div>

                  <div className="lka-mini-stat">
                    <span className="lka-mini-stat-label">Total Sections</span>
                    <strong className="lka-mini-stat-val">27</strong>
                    <span className="lka-mini-stat-sub">
                      14 Morning · 13 Afternoon
                    </span>
                  </div>

                  <div className="lka-mini-stat">
                    <span className="lka-mini-stat-label">Portal Accounts</span>
                    <strong className="lka-mini-stat-val">{users.length}</strong>
                    <span className="lka-mini-stat-sub">
                      Students &amp; Staff Users
                    </span>
                  </div>

                  <div className="lka-mini-stat accent-pink">
                    <span className="lka-mini-stat-label">Enrolled Online</span>
                    <strong className="lka-mini-stat-val">
                      {analytics.portal_officially_enrolled}
                    </strong>
                    <span className="lka-mini-stat-sub">
                      Verified by Registrar
                    </span>
                  </div>

                  <div className="lka-mini-stat accent-amber">
                    <span className="lka-mini-stat-label">Pending Approval</span>
                    <strong className="lka-mini-stat-val">
                      {analytics.portal_pending_verification}
                    </strong>
                    <span className="lka-mini-stat-sub">
                      Waiting Verification
                    </span>
                  </div>
                </div>

                {/* HOA-Style 2 Large Financial Summary Cards */}
                <div className="lka-finance-row-2">
                  <div className="lka-finance-card green-card">
                    <div className="lka-finance-top">
                      <div>
                        <strong>Total Tuition Collected</strong>
                        <span>
                          {collectionReport.length} verified payment
                          transaction(s)
                        </span>
                      </div>
                      <span className="sched-badge paid">Paid</span>
                    </div>
                    <div className="lka-finance-bottom">
                      <span>Total Collected</span>
                      <strong>{formatPeso(analytics.total_collected)}</strong>
                    </div>
                  </div>

                  <div className="lka-finance-card amber-card">
                    <div className="lka-finance-top">
                      <div>
                        <strong>Total Remaining Balance (Receivables)</strong>
                        <span>
                          Across {analytics.portal_registered_total} online
                          student account(s)
                        </span>
                      </div>
                      <span className="sched-badge due">Pending</span>
                    </div>
                    <div className="lka-finance-bottom">
                      <span>Remaining Receivables</span>
                      <strong>{formatPeso(analytics.total_receivables)}</strong>
                    </div>
                  </div>
                </div>

            <div className="portal-two-col">
              {/* Left: Grade Level Population Breakdown */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconSchool size={19} />
                  </span>
                  <div>
                    <h3>Enrollment Population per Grade Level</h3>
                    <p>
                      Official LKA S.Y. 2026–2027 enrollees and online portal
                      registrations
                    </p>
                  </div>
                </div>

                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Grade Level</th>
                        <th>LKA Total Enrollees</th>
                        <th>Portal Enrolled</th>
                        <th>Pending Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.grade_breakdown.map((row) => (
                        <tr key={row.grade_level}>
                          <td>
                            <strong>{row.grade_level}</strong>
                          </td>
                          <td>
                            <strong>{row.official_baseline} Students</strong>
                          </td>
                          <td>
                            <span className="sched-badge paid">
                              {row.portal_enrolled} Enrolled
                            </span>
                          </td>
                          <td>
                            <span className="sched-badge due">
                              {row.pending} Pending
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Payment Mode & Payment Plan Breakdown + Enrollment Control */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalculator size={19} />
                  </span>
                  <div>
                    <h3>Collection by Payment Mode &amp; Plan</h3>
                    <p>
                      Breakdown of tuition revenue and parent payment
                      preferences
                    </p>
                  </div>
                </div>

                <div
                  className="soa-breakdown-list"
                  style={{ marginBottom: "18px" }}
                >
                  <div className="soa-row">
                    <span>Cash at LKA School Cashier</span>
                    <strong className="text-green">
                      {formatPeso(analytics.channel_totals.Cash || 0)}
                    </strong>
                  </div>
                  <div className="soa-row">
                    <span>GCash (0926-549-3089)</span>
                    <strong className="text-green">
                      {formatPeso(analytics.channel_totals.GCash || 0)}
                    </strong>
                  </div>
                  <div className="soa-row">
                    <span>Online Banking Transfer</span>
                    <strong className="text-green">
                      {formatPeso(
                        analytics.channel_totals["Online Banking"] || 0
                      )}
                    </strong>
                  </div>
                  <div className="soa-row subtotal-row">
                    <span>Full Cash Basis (10% Discount) Accounts</span>
                    <strong>{analytics.plan_counts.cash} Student(s)</strong>
                  </div>
                  <div className="soa-row">
                    <span>Quarterly Plan (4 Exams) Accounts</span>
                    <strong>
                      {analytics.plan_counts.quarterly} Student(s)
                    </strong>
                  </div>
                  <div className="soa-row">
                    <span>Monthly Plan (10 Months) Accounts</span>
                    <strong>{analytics.plan_counts.monthly} Student(s)</strong>
                  </div>
                </div>

                {/* Open / Close Online Enrollment Control Box */}
                <div className="enroll-assessment-box">
                  <div className="assessment-header">
                    <IconShield size={16} />
                    <strong>
                      Online Enrollment Status Control (S.Y. 2026–2027)
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: "0.83rem",
                      color: "#5f4350",
                      marginBottom: "12px",
                    }}
                  >
                    When set to <strong>CLOSED</strong>, parents will not be
                    able to submit new online registrations on the website until
                    re-opened by the Admin.
                  </p>
                  <button
                    type="button"
                    className="login-btn"
                    onClick={handleToggleEnrollmentPeriod}
                    disabled={processing}
                  >
                    {enrollmentOpen
                      ? "Online Enrollment is OPEN — Click to Close Enrollment"
                      : "Online Enrollment is CLOSED — Click to Open Enrollment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: TUITION & SCHOOL FEES MANAGEMENT ==================== */}
        {activeTab === "fees" && (
          <div className="portal-tab-content">
            <div className="portal-panel-card">
              <div className="panel-card-header">
                <span className="panel-header-icon">
                  <IconCalculator size={19} />
                </span>
                <div>
                  <h3>
                    Official Tuition, Miscellaneous &amp; Computer Fee Matrix
                  </h3>
                  <p>
                    Admin-only configuration for LKA school fees and Full Cash
                    Discount percentage
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveFeeMatrix}>
                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Grade Group &amp; Category</th>
                        <th>Tuition Fee (PHP)</th>
                        <th>Misc Fee / Downpayment (PHP)</th>
                        <th>Computer Fee (PHP)</th>
                        <th>Cash Discount (%)</th>
                        <th>Regular Sub-Total</th>
                        <th>Full Cash Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeTiers.map((tier) => {
                        const regularSub =
                          Number(tier.tuition_fee) +
                          Number(tier.misc_fee) +
                          Number(tier.computer_fee);
                        const discountAmt =
                          regularSub *
                          (Number(tier.cash_discount_percent) / 100);
                        const cashTotal = regularSub - discountAmt;
                        return (
                          <tr key={tier.tier_id}>
                            <td>
                              <strong>{tier.label}</strong>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="form-select"
                                style={{ padding: "8px 10px", width: "130px" }}
                                value={tier.tuition_fee}
                                onChange={(e) =>
                                  handleFeeFieldChange(
                                    tier.tier_id,
                                    "tuition_fee",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="form-select"
                                style={{ padding: "8px 10px", width: "130px" }}
                                value={tier.misc_fee}
                                onChange={(e) =>
                                  handleFeeFieldChange(
                                    tier.tier_id,
                                    "misc_fee",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                className="form-select"
                                style={{ padding: "8px 10px", width: "120px" }}
                                value={tier.computer_fee}
                                onChange={(e) =>
                                  handleFeeFieldChange(
                                    tier.tier_id,
                                    "computer_fee",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.5"
                                className="form-select"
                                style={{ padding: "8px 10px", width: "85px" }}
                                value={tier.cash_discount_percent}
                                onChange={(e) =>
                                  handleFeeFieldChange(
                                    tier.tier_id,
                                    "cash_discount_percent",
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="price-cell">
                              <strong>{formatPeso(regularSub)}</strong>
                            </td>
                            <td className="price-cell text-green">
                              <strong>{formatPeso(cashTotal)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="submit"
                    className="login-btn"
                    style={{ maxWidth: "340px" }}
                    disabled={processing}
                  >
                    {processing
                      ? "Saving Fee Matrix..."
                      : "Save Official Tuition & Fee Matrix →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: COLLECTION & ENROLLMENT REPORTS (EXPORT / PRINT) ==================== */}
        {activeTab === "reports" && (
          <div className="portal-tab-content">
            <div className="portal-panel-card">
              <div
                className="panel-card-header"
                style={{ justifyContent: "space-between", flexWrap: "wrap" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span className="panel-header-icon">
                    <IconClipboard size={19} />
                  </span>
                  <div>
                    <h3>
                      Automated Tuition Collection &amp; Official Receipt Report
                    </h3>
                    <p>
                      Replaces the 20–30 minute manual daily tally with instant
                      channel totals and Excel/CSV export
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="register-switch-btn"
                    style={{ width: "auto", padding: "10px 16px" }}
                    onClick={() => window.print()}
                  >
                    Print Official Report
                  </button>
                  <button
                    type="button"
                    className="login-btn"
                    style={{
                      width: "auto",
                      marginTop: 0,
                      padding: "10px 18px",
                    }}
                    onClick={handleExportCsvReport}
                  >
                    Export Report to CSV (Excel) →
                  </button>
                </div>
              </div>

              {/* Auto-Computed Collection Summary Bar */}
              <div
                className="portal-stats-grid"
                style={{ marginBottom: "18px" }}
              >
                <div className="portal-stat-card">
                  <span className="stat-label">Cash at School Cashier</span>
                  <strong className="stat-value">
                    {formatPeso(analytics.channel_totals.Cash || 0)}
                  </strong>
                  <span className="stat-sub">Walk-in physical payments</span>
                </div>
                <div className="portal-stat-card">
                  <span className="stat-label">GCash Collections</span>
                  <strong className="stat-value">
                    {formatPeso(analytics.channel_totals.GCash || 0)}
                  </strong>
                  <span className="stat-sub">LKA GCash (0926-549-3089)</span>
                </div>
                <div className="portal-stat-card">
                  <span className="stat-label">Online Banking</span>
                  <strong className="stat-value">
                    {formatPeso(
                      analytics.channel_totals["Online Banking"] || 0
                    )}
                  </strong>
                  <span className="stat-sub">Verified bank transfers</span>
                </div>
                <div className="portal-stat-card highlight-card">
                  <span className="stat-label">Grand Total Collected</span>
                  <strong className="stat-value text-green">
                    {formatPeso(analytics.total_collected)}
                  </strong>
                  <span className="stat-sub">
                    {collectionReport.length} verified payment transaction(s)
                  </span>
                </div>
              </div>

              {/* Search & Channel Filter */}
              <div className="form-two-col" style={{ marginBottom: "14px" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>
                    Search by Student Name, ID, Guardian, or OR Reference
                  </label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz, OR-2026, or Physical OR #..."
                      value={reportSearch}
                      onChange={(e) => setReportSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Filter by Payment Channel</label>
                  <select
                    className="form-select"
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                  >
                    <option value="All Channels">All Payment Channels</option>
                    <option value="Cash">Cash at LKA Cashier</option>
                    <option value="GCash">GCash</option>
                    <option value="Online Banking">Online Banking</option>
                  </select>
                </div>
              </div>

              {/* Collection Report Table */}
              <div className="schedule-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Record Code</th>
                      <th>Student &amp; Grade</th>
                      <th>Guardian</th>
                      <th>Description</th>
                      <th>Channel</th>
                      <th>Physical OR / Note</th>
                      <th>Date &amp; Time</th>
                      <th>Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollections.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="or-badge">{c.or_number}</span>
                        </td>
                        <td>
                          <strong>{c.student_name}</strong>
                          <span className="table-subtext">
                            {c.student_id_no} · {c.grade_level}
                          </span>
                        </td>
                        <td>{c.guardian_name}</td>
                        <td>
                          <strong>{c.description}</strong>
                        </td>
                        <td>{c.payment_method}</td>
                        <td>{c.reference_no}</td>
                        <td>{c.paid_at}</td>
                        <td className="price-cell text-green">
                          <strong>{formatPeso(c.amount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: USER & STAFF ACCOUNT MANAGEMENT ==================== */}
        {activeTab === "users" && (
          <div className="portal-tab-content">
            <div className="portal-two-col">
              {/* Left: Create New Registrar / Admin Staff Account */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconUser size={19} />
                  </span>
                  <div>
                    <h3>Create Staff / Registrar Account</h3>
                    <p>
                      Add authorized accounts for LKA Registrars or Admin Staff
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateStaffAccount}>
                  <div className="field">
                    <label>Staff Full Name</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mrs. Elena Santos (LKA Registrar)"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-two-col">
                    <div className="field">
                      <label>Official Email Address</label>
                      <div className="input-wrap">
                        <input
                          type="email"
                          required
                          placeholder="registrar2@lyceum.edu.ph"
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Mobile Number</label>
                      <div className="input-wrap">
                        <input
                          type="tel"
                          required
                          placeholder="09171234568"
                          value={staffPhone}
                          onChange={(e) => setStaffPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-two-col">
                    <div className="field">
                      <label>Assigned Portal Role</label>
                      <select
                        className="form-select"
                        value={staffRole}
                        onChange={(e) =>
                          setStaffRole(e.target.value as "registrar" | "admin")
                        }
                      >
                        <option value="registrar">
                          School Registrar (Enrollment &amp; Billing)
                        </option>
                        <option value="admin">
                          School Administrator (Full Access)
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Initial Password (Min. 6 chars)</label>
                      <div className="input-wrap">
                        <input
                          type="password"
                          required
                          placeholder="Enter staff password"
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-btn"
                    disabled={processing}
                  >
                    {processing
                      ? "Creating Account..."
                      : "+ Create Authorized Staff Account →"}
                  </button>
                </form>
              </div>

              {/* Right: Manage All Staff & Student Accounts */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconUsers size={19} />
                  </span>
                  <div>
                    <h3>
                      Manage Portal Accounts ({filteredUsers.length} of{" "}
                      {users.length})
                    </h3>
                    <p>
                      Activate/deactivate accounts or reset passwords for
                      Students and Staff
                    </p>
                  </div>
                </div>

                <div
                  className="student-type-pills"
                  style={{ marginBottom: "12px" }}
                >
                  <button
                    type="button"
                    className={`type-pill-btn ${
                      userRoleFilter === "all" ? "active" : ""
                    }`}
                    onClick={() => setUserRoleFilter("all")}
                  >
                    All Accounts ({users.length})
                  </button>
                  <button
                    type="button"
                    className={`type-pill-btn ${
                      userRoleFilter === "staff" ? "active" : ""
                    }`}
                    onClick={() => setUserRoleFilter("staff")}
                  >
                    Staff &amp; Admin (
                    {users.filter((u) => u.role !== "parent").length})
                  </button>
                  <button
                    type="button"
                    className={`type-pill-btn ${
                      userRoleFilter === "student" ? "active" : ""
                    }`}
                    onClick={() => setUserRoleFilter("student")}
                  >
                    Students ({users.filter((u) => u.role === "parent").length})
                  </button>
                </div>

                <div className="field">
                  <div className="input-wrap">
                    <input
                      type="text"
                      placeholder="Search account by name, email, phone, or Student ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="promissory-list">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="promissory-card">
                      <div className="promissory-card-top">
                        <strong>
                          {u.name}{" "}
                          {u.student_id_no ? `(${u.student_id_no})` : ""}
                        </strong>
                        <span
                          className={`sched-badge ${
                            u.is_active ? "paid" : "upcoming"
                          }`}
                        >
                          {u.role === "parent"
                            ? "Student Account"
                            : u.role.toUpperCase()}{" "}
                          · {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </div>
                      <p>
                        Email: <strong>{u.email}</strong> · Phone:{" "}
                        <strong>{u.phone}</strong>
                        {u.grade_level ? ` · ${u.grade_level}` : ""}
                      </p>

                      {resettingUserId === u.id && (
                        <form
                          onSubmit={(e) => handleResetUserPassword(e, u.id)}
                          style={{
                            marginTop: "10px",
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            required
                            placeholder="Enter new password (min 6 chars)"
                            className="form-select"
                            style={{ padding: "7px 10px", flex: 1 }}
                            value={resetNewPass}
                            onChange={(e) => setResetNewPass(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="table-pay-btn"
                            disabled={processing}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="step-back-btn"
                            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                            onClick={() => {
                              setResettingUserId(null);
                              setResetNewPass("");
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <button
                          type="button"
                          className="step-back-btn"
                          style={{ padding: "5px 10px", fontSize: "0.76rem" }}
                          onClick={() => {
                            setResettingUserId(u.id);
                            setResetNewPass("");
                          }}
                        >
                          <IconKey size={13} /> Reset Password
                        </button>
                        <button
                          type="button"
                          className="table-pay-btn"
                          style={{
                            background: u.is_active ? "#b91c1c" : "#15803d",
                          }}
                          onClick={() => handleToggleUserActive(u)}
                          disabled={processing}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
