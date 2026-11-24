import { API_BASE } from "../api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  IconCalculator,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconMail,
  IconSchool,
  IconUser,
  IconUsers,
} from "./Icons";

interface StudentDashboardProps {
  token: string;
  onLogout: () => void;
}

interface ScheduleItem {
  id: string;
  title: string;
  due_date: string;
  amount: number;
  status: "Paid" | "Due Next" | "Upcoming";
}

interface BillingData {
  tuition_fee: number;
  misc_fee: number;
  computer_fee: number;
  regular_subtotal: number;
  cash_discount: number;
  total_assessment: number;
  downpayment_required: number;
  monthly_installment: number;
  quarterly_installment: number;
  amount_paid: number;
  remaining_balance: number;
  schedule: ScheduleItem[];
}

interface StudentProfile {
  id: number;
  student_id_no: string;
  student_name: string;
  student_lrn: string;
  student_type: "new" | "old" | "transferee";
  grade_level: string;
  class_shift: string;
  shift_hours: string;
  assigned_section: string;
  birthdate: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  parent_guardian_name: string;
  relationship_to_student: string;
  previous_school: string;
  payment_plan: "cash" | "quarterly" | "monthly";
  payment_method: string;
  enrollment_status: string;
  requirements_submitted: string[];
  delinquency_risk?: string;
  exam_clearance?: string;
  exam_permit_code?: string;
}

interface PromissoryNoteItem {
  id: number;
  exam_quarter: string;
  amount_covered: number;
  promised_date: string;
  reason: string;
  status: string;
  permit_code: string;
  submitted_at: string;
  approved_at?: string | null;
}

interface PaymentReceipt {
  id: number;
  or_number: string;
  description: string;
  amount: number;
  payment_method: string;
  reference_no: string;
  paid_at: string;
  status: string;
}

interface PaymentReminderItem {
  id: number;
  recipient_email: string;
  subject: string;
  installment_title: string;
  due_date: string;
  amount_due: number;
  message_body: string;
  sent_at: string;
  delivery_status: string;
}

const PLAN_SLIDER_KEYS: ("cash" | "quarterly" | "monthly")[] = [
  "cash",
  "quarterly",
  "monthly",
];

const REQUIREMENTS_CATALOG: Record<
  string,
  { id: string; label: string; note: string }[]
> = {
  new: [
    {
      id: "psa_birth_cert",
      label: "PSA / NSO Birth Certificate",
      note: "1 Photocopy (present original for verification)",
    },
    {
      id: "id_picture_2x2",
      label: "2 pcs. 2x2 Colored ID Picture",
      note: "White background with student's full name",
    },
    {
      id: "kinder_cert_sf9",
      label: "Kinder Certificate / Report Card (SF9)",
      note: "Required for incoming Grade 1 students",
    },
  ],
  old: [
    {
      id: "report_card_sf9",
      label: "Original Report Card (Form 138 / SF9)",
      note: "From previous grade level at LKA",
    },
    {
      id: "previous_balance_clearance",
      label: "Previous Balance Clearance (No Unpaid Balance)",
      note: "LKA Policy: Previous year balance must be settled in full",
    },
    {
      id: "id_picture_renewal",
      label: "1 pc. 2x2 Colored ID Picture",
      note: "For School ID card renewal",
    },
  ],
  transferee: [
    {
      id: "psa_birth_cert",
      label: "PSA / NSO Birth Certificate",
      note: "1 Clear Photocopy",
    },
    {
      id: "report_card_sf9",
      label: "Original Report Card (Form 138 / SF9 with LRN)",
      note: "Must show 12-digit Learner Reference Number",
    },
    {
      id: "good_moral",
      label: "Certificate of Good Moral Character",
      note: "From previous school principal or guidance office",
    },
    {
      id: "form_137_sf10",
      label: "Form 137 / SF10 (Permanent Academic Record)",
      note: "Copy or official request slip",
    },
    {
      id: "id_picture_2x2",
      label: "2 pcs. 2x2 Colored ID Picture",
      note: "White background",
    },
  ],
};

function formatPeso(amount: number): string {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export default function StudentDashboard({
  token,
  onLogout,
}: StudentDashboardProps) {
  const [activeTab, setActiveTabState] = useState<
    "overview" | "billing" | "promissory" | "reminders" | "requirements"
  >(() => {
    const saved = localStorage.getItem("lka_student_tab");
    if (
      saved === "overview" ||
      saved === "billing" ||
      saved === "promissory" ||
      saved === "reminders" ||
      saved === "requirements"
    ) {
      return saved;
    }
    return "overview";
  });

  const setActiveTab = (
    tab: "overview" | "billing" | "promissory" | "reminders" | "requirements"
  ) => {
    localStorage.setItem("lka_student_tab", tab);
    setActiveTabState(tab);
  };
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [reminders, setReminders] = useState<PaymentReminderItem[]>([]);
  const [promissoryNotes, setPromissoryNotes] = useState<PromissoryNoteItem[]>(
    []
  );
  const [bannerMsg, setBannerMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Digital Promissory Note Filing state
  const [pnQuarter, setPnQuarter] = useState<string>(
    "1st Quarter Periodical Exam (August 2026)"
  );
  const [pnAmount, setPnAmount] = useState<string>("");
  const [pnDate, setPnDate] = useState<string>("2026-08-22");
  const [pnReason, setPnReason] = useState<string>("");
  const [submittingPn, setSubmittingPn] = useState<boolean>(false);

  // Feature #3: Automated Payment Reminder Email state
  const [reminderEmail, setReminderEmail] = useState<string>("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [selectedEmailPreview, setSelectedEmailPreview] =
    useState<PaymentReminderItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/auth/student/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data.profile);
      setBilling(res.data.billing);
      setPayments(res.data.payments || []);
      setPromissoryNotes(res.data.promissory_notes || []);
      const nextDueItem = (res.data.billing?.schedule || []).find(
        (s: ScheduleItem) => s.status !== "Paid"
      );
      if (nextDueItem && !pnAmount) {
        setPnAmount(String(nextDueItem.amount));
      }
      const rems: PaymentReminderItem[] = res.data.payment_reminders || [];
      setReminders(rems);
      if (rems.length > 0 && !selectedEmailPreview) {
        setSelectedEmailPreview(rems[0]);
      }
      if (res.data.profile?.email) {
        setReminderEmail(res.data.profile.email);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onLogout();
        return;
      }
      setBannerMsg({
        type: "error",
        text: "Could not load student records. Please log in again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [token]);

  const handleSendPaymentReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingReminder(true);
    setBannerMsg(null);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/student/reminders/send`,
        { recipient_email: reminderEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      const updated = await axios.get(
        `${API_BASE}/api/auth/student/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const rems: PaymentReminderItem[] =
        updated.data.payment_reminders || [];
      setReminders(rems);
      if (rems.length > 0) {
        setSelectedEmailPreview(rems[0]);
      }
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Could not send payment reminder email.",
      });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSwitchPaymentPlan = async (
    nextPlan: "cash" | "quarterly" | "monthly"
  ) => {
    try {
      await axios.put(
        `${API_BASE}/api/auth/student/payment-plan`,
        { payment_plan: nextPlan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({
        type: "success",
        text: `Payment plan updated to ${
          nextPlan === "cash"
            ? "Full Cash Basis (10% Discount)"
            : nextPlan === "quarterly"
            ? "Quarterly Plan (4 Exams)"
            : "Monthly Plan (10 Months)"
        }.`,
      });
      await fetchStudentData();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Could not change payment plan.",
      });
    }
  };

  const handleSubmitPromissoryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPn(true);
    setBannerMsg(null);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/student/promissory`,
        {
          exam_quarter: pnQuarter,
          amount_covered: Number(pnAmount) || 0,
          promised_date: pnDate,
          reason: pnReason,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      setPnReason("");
      await fetchStudentData();
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not submit Digital Promissory Note.",
      });
    } finally {
      setSubmittingPn(false);
    }
  };

  if (loading || !profile || !billing) {
    return (
      <div className="portal-loading-screen">
        <div className="portal-loading-card">
          <img src="/logo.jpg" alt="LKA Logo" className="portal-loading-logo" />
          <h3>Loading Student Portal...</h3>
          <p>Fetching your enrollment profile and billing records.</p>
        </div>
      </div>
    );
  }

  const nextDueInstallment = billing.schedule.find((s) => s.status !== "Paid");
  const reqList =
    REQUIREMENTS_CATALOG[profile.student_type] || REQUIREMENTS_CATALOG.new;
  const submittedCount = reqList.filter((r) =>
    profile.requirements_submitted.includes(r.id)
  ).length;

  const planSliderIndex = Math.max(
    0,
    PLAN_SLIDER_KEYS.indexOf(profile.payment_plan)
  );

  const planDisplayLabel =
    profile.payment_plan === "cash"
      ? "Full Cash Basis (10% Discount)"
      : profile.payment_plan === "quarterly"
      ? "Quarterly Plan (4 Exams)"
      : "Monthly Plan (10 Months)";

  const isOfficiallyEnrolled =
    profile.enrollment_status === "Officially Enrolled";

  if (!isOfficiallyEnrolled) {
    return (
      <div className="student-portal-root">
        {/* ===== TOP PORTAL HEADER ===== */}
        <header className="portal-topbar">
          <div className="portal-topbar-inner">
            <div className="portal-brand">
              <img src="/logo.jpg" alt="LKA Logo" className="portal-logo" />
              <div>
                <span className="portal-school-name">
                  Lyceum ng Kabataan Academy, Inc.
                </span>
                <span className="portal-sub-tag">
                  Online Application Status · S.Y. 2026–2027
                </span>
              </div>
            </div>

            <div className="portal-user-bar">
              <div className="portal-student-chip">
                <IconSchool size={17} />
                <div>
                  <strong>{profile.student_name}</strong>
                  <span>
                    {profile.student_id_no} · {profile.grade_level}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="portal-logout-btn"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="portal-main-container">
          <section className="portal-hero-banner">
            <div className="portal-hero-left">
              <div className="portal-badges-row">
                <span className="portal-id-pill">{profile.student_id_no}</span>
                <span className="portal-status-pill pending">
                  Pending Registrar Verification &amp; School Payment
                </span>
              </div>
              <h1>{profile.student_name}</h1>
              <p>
                Applying for <strong>{profile.grade_level}</strong> · Guardian:{" "}
                <strong>
                  {profile.parent_guardian_name} (
                  {profile.relationship_to_student})
                </strong>
              </p>
            </div>

            <div className="portal-hero-right">
              <button
                type="button"
                className="register-switch-btn"
                onClick={fetchStudentData}
              >
                Refresh Approval Status
              </button>
            </div>
          </section>

          <div className="policy-reminder-box" style={{ fontSize: "0.9rem" }}>
            <IconSchool size={18} />
            <span>
              <strong>How to Unlock Your Full Student Dashboard:</strong> Your
              online registration is saved, but your child is{" "}
              <strong>not yet Officially Enrolled</strong>. The parent or
              guardian must visit the{" "}
              <strong>
                LKA Registrar Office (Phase 4-B, Package 7, Block 103, Lot 2,
                Brgy. Bagong Silang, Caloocan City · 8:00 AM–12:00 NN &amp; 1:00
                PM–5:00 PM)
              </strong>{" "}
              to submit all physical document requirements below and pay the
              initial tuition/downpayment.{" "}
              <strong>Only the School Registrar</strong> can officially enroll
              the student once all requirements and payment are complete.
            </span>
          </div>

          <div className="portal-two-col">
            {/* Left: Physical Requirements Checklist */}
            <div className="portal-panel-card">
              <div className="panel-card-header">
                <span className="panel-header-icon">
                  <IconClipboard size={19} />
                </span>
                <div>
                  <h3>
                    Step 1: Submit Physical Requirements at School (
                    {submittedCount} of {reqList.length} Verified)
                  </h3>
                  <p>
                    Bring these physical documents to the LKA School Registrar
                    for verification
                  </p>
                </div>
              </div>

              <div className="form-req-checklist">
                {reqList.map((req) => {
                  const isSubmitted = profile.requirements_submitted.includes(
                    req.id
                  );
                  return (
                    <div
                      key={req.id}
                      className={`form-req-item ${
                        isSubmitted ? "checked" : ""
                      }`}
                    >
                      <div className="form-req-text">
                        <strong>{req.label}</strong>
                        <span>{req.note}</span>
                      </div>
                      <span className="req-status-pill">
                        {isSubmitted
                          ? "Verified by Registrar"
                          : "Bring Hardcopy to School"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Initial Tuition / Downpayment & Registrar Approval Status */}
            <div className="portal-panel-card">
              <div className="panel-card-header">
                <span className="panel-header-icon">
                  <IconCalculator size={19} />
                </span>
                <div>
                  <h3>Step 2: Settle Tuition &amp; Registrar Approval</h3>
                  <p>
                    Guardian&apos;s Selected Plan:{" "}
                    <strong>{planDisplayLabel}</strong>
                  </p>
                </div>
              </div>

              <div className="soa-breakdown-list">
                <div className="soa-row">
                  <span>Student Application ID</span>
                  <strong>{profile.student_id_no}</strong>
                </div>
                <div className="soa-row">
                  <span>Grade Level &amp; Preferred Shift</span>
                  <strong>
                    {profile.grade_level} ({profile.shift_hours})
                  </strong>
                </div>
                <div className="soa-row">
                  <span>Guardian&apos;s Selected Payment Plan</span>
                  <strong>{planDisplayLabel}</strong>
                </div>
                <div className="soa-row subtotal-row">
                  <span>Total Annual Tuition Assessment</span>
                  <strong>{formatPeso(billing.total_assessment)}</strong>
                </div>
                <div className="soa-row total-row">
                  <span>Required Payment Upon Enrollment</span>
                  <strong>{formatPeso(billing.downpayment_required)}</strong>
                </div>
                <div className="soa-row paid-row">
                  <span>Amount Verified by School Cashier / Registrar</span>
                  <strong>{formatPeso(billing.amount_paid)}</strong>
                </div>
                <div className="soa-row balance-row">
                  <span>Current Enrollment Status</span>
                  <strong>{profile.enrollment_status}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="lka-app-shell">
      {/* ===== HOA-STYLE LEFT SIDEBAR ===== */}
      <aside className={`lka-sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="lka-sidebar-brand">
          <img src="/logo.jpg" alt="LKA Logo" className="lka-sidebar-logo" />
          <div>
            <strong>LKA</strong>
            <span>Student &amp; Parent Portal</span>
          </div>
        </div>

        <div className="lka-sidebar-group">
          <span className="lka-sidebar-label">Workspace</span>
          <nav className="lka-sidebar-nav">
            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "overview" ? "active" : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              <span className="lka-nav-item-left">
                <IconUser size={16} />
                <span>Dashboard &amp; Profile</span>
              </span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "billing" ? "active" : ""
              }`}
              onClick={() => setActiveTab("billing")}
            >
              <span className="lka-nav-item-left">
                <IconCalculator size={16} />
                <span>Smart Tuition Ledger</span>
              </span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "promissory" ? "active" : ""
              }`}
              onClick={() => setActiveTab("promissory")}
            >
              <span className="lka-nav-item-left">
                <IconCalendar size={16} />
                <span>Promissory &amp; Permit</span>
              </span>
              <span className="lka-nav-badge">{promissoryNotes.length}</span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "reminders" ? "active" : ""
              }`}
              onClick={() => setActiveTab("reminders")}
            >
              <span className="lka-nav-item-left">
                <IconMail size={16} />
                <span>Email Reminders</span>
              </span>
              <span className="lka-nav-badge">{reminders.length}</span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "requirements" ? "active" : ""
              }`}
              onClick={() => setActiveTab("requirements")}
            >
              <span className="lka-nav-item-left">
                <IconClipboard size={16} />
                <span>Requirements</span>
              </span>
              <span className="lka-nav-badge">
                {submittedCount}/{reqList.length}
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
              {profile.student_id_no} · {profile.grade_level} (
              {profile.assigned_section})
            </span>
          </div>

          <div className="lka-topbar-right">
            <span className="portal-status-pill enrolled">
              <IconCheck size={12} />
              {profile.exam_clearance || "CLEARED FOR EXAM"}
            </span>
            <div className="lka-user-menu-wrap">
              <button
                type="button"
                className="lka-user-pill-btn"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <div className="lka-avatar-circle">
                  {profile.student_name.charAt(0).toUpperCase()}
                </div>
                <div className="lka-user-pill-info">
                  <strong>{profile.student_name}</strong>
                  <span>{profile.grade_level}</span>
                </div>
                <span className="lka-user-caret">▾</span>
              </button>

              {userMenuOpen && (
                <div className="lka-user-dropdown">
                  <div className="lka-dropdown-header">
                    <strong>{profile.student_name}</strong>
                    <span>{profile.student_id_no}</span>
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
            {activeTab === "overview" && (
              <section className="lka-welcome-banner">
                <div>
                  <div className="lka-welcome-date">{dateStr}</div>
                  <div className="lka-welcome-time">{timeStr}</div>
                  <h1>Hello {profile.student_name}!</h1>
                  <p>
                    {profile.grade_level} · {profile.assigned_section} ·{" "}
                    {profile.shift_hours} · Permit Code:{" "}
                    <strong>{profile.exam_permit_code || "LKA-EXM-2026"}</strong>
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lka-cta-pill-btn"
                      onClick={() => setActiveTab("billing")}
                    >
                      View Tuition Ledger →
                    </button>
                    <button
                      type="button"
                      className="portal-logout-btn"
                      onClick={() => setActiveTab("promissory")}
                    >
                      Exam Clearance Status
                    </button>
                  </div>
                </div>

                <div className="lka-welcome-art" aria-hidden="true">
                  <svg width="200" height="125" viewBox="0 0 210 135" fill="none">
                    <rect x="20" y="96" width="170" height="8" rx="4" fill="#FBCFE8" />
                    <rect x="44" y="42" width="66" height="44" rx="8" fill="#FFFFFF" stroke="#D43783" strokeWidth="2.5" />
                    <rect x="52" y="50" width="50" height="24" rx="4" fill="#FDF2F8" />
                    <rect x="72" y="86" width="10" height="10" fill="#D43783" />
                    <circle cx="145" cy="46" r="14" fill="#F9A8D4" stroke="#4A0E2E" strokeWidth="2" />
                    <path d="M126 96C126 77 134 66 145 66C156 66 164 77 164 96H126Z" fill="#EC4899" stroke="#4A0E2E" strokeWidth="2" />
                  </svg>
                </div>
              </section>
            )}

        {bannerMsg && (
          <div className={`portal-alert ${bannerMsg.type}`}>
            <span>{bannerMsg.text}</span>
            <button type="button" onClick={() => setBannerMsg(null)}>
              ×
            </button>
          </div>
        )}

        {/* ==================== TAB 1: OVERVIEW & STUDENT PROFILE ==================== */}
        {activeTab === "overview" && (
          <div className="portal-tab-content">
            {/* 4 Summary Cards */}
            <div className="portal-stats-grid">
              <div className="portal-stat-card">
                <span className="stat-label">Total Annual Assessment</span>
                <strong className="stat-value">
                  {formatPeso(billing.total_assessment)}
                </strong>
                <span className="stat-sub">{planDisplayLabel}</span>
              </div>

              <div className="portal-stat-card">
                <span className="stat-label">Total Amount Paid</span>
                <strong className="stat-value text-green">
                  {formatPeso(billing.amount_paid)}
                </strong>
                <span className="stat-sub">
                  {payments.length} verified payment receipt(s)
                </span>
              </div>

              <div className="portal-stat-card highlight-stat">
                <span className="stat-label">Remaining Tuition Balance</span>
                <strong className="stat-value text-pink">
                  {formatPeso(billing.remaining_balance)}
                </strong>
                <span className="stat-sub">
                  {billing.remaining_balance === 0
                    ? "Fully Paid for S.Y. 2026–2027"
                    : "Updated in real time"}
                </span>
              </div>

              <div className="portal-stat-card">
                <span className="stat-label">Next Installment Due</span>
                <strong className="stat-value">
                  {nextDueInstallment
                    ? formatPeso(nextDueInstallment.amount)
                    : "₱0.00"}
                </strong>
                <span className="stat-sub">
                  {nextDueInstallment
                    ? `${nextDueInstallment.due_date}`
                    : "All scheduled payments settled!"}
                </span>
              </div>
            </div>

            {/* Quick Action Callout if Downpayment / Next Installment is Due */}
            {nextDueInstallment && (
              <div className="portal-due-banner">
                <div className="due-banner-left">
                  <span className="due-icon-box">
                    <IconMail size={20} />
                  </span>
                  <div>
                    <strong>
                      Automated Payment Reminder Active: {nextDueInstallment.title}
                    </strong>
                    <p>
                      Amount Due:{" "}
                      <strong>{formatPeso(nextDueInstallment.amount)}</strong> ·
                      Due Date: <strong>{nextDueInstallment.due_date}</strong> ·
                      Email alerts sent to <strong>{profile.email}</strong>
                    </p>
                  </div>
                </div>
                <div className="due-banner-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setActiveTab("billing");
                    }}
                  >
                    View Billing Schedule →
                  </button>
                </div>
              </div>
            )}

            {/* Two-Column Student Profile & Linked Parent Record */}
            <div className="portal-two-col">
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconSchool size={19} />
                  </span>
                  <div>
                    <h3>Official Student Information</h3>
                    <p>Auto-generated learner profile for S.Y. 2026–2027</p>
                  </div>
                </div>

                <div className="profile-info-grid">
                  <div className="info-item">
                    <span>Student Full Name</span>
                    <strong>{profile.student_name}</strong>
                  </div>
                  <div className="info-item">
                    <span>Student ID Number</span>
                    <strong>{profile.student_id_no}</strong>
                  </div>
                  <div className="info-item">
                    <span>Learner Reference No. (LRN)</span>
                    <strong>{profile.student_lrn}</strong>
                  </div>
                  <div className="info-item">
                    <span>Student Category</span>
                    <strong className="capitalize">
                      {profile.student_type} Student
                    </strong>
                  </div>
                  <div className="info-item">
                    <span>Grade Level</span>
                    <strong>{profile.grade_level}</strong>
                  </div>
                  <div className="info-item">
                    <span>Assigned Section</span>
                    <strong>{profile.assigned_section}</strong>
                  </div>
                  <div className="info-item">
                    <span>Shift &amp; Class Hours</span>
                    <strong>{profile.shift_hours}</strong>
                  </div>
                  <div className="info-item">
                    <span>Date of Birth &amp; Gender</span>
                    <strong>
                      {profile.birthdate} · {profile.gender}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconUsers size={19} />
                  </span>
                  <div>
                    <h3>Linked Parent / Guardian Account</h3>
                    <p>
                      Connected parent/guardian for email payment reminders &amp;
                      billing updates
                    </p>
                  </div>
                </div>

                <div className="profile-info-grid">
                  <div className="info-item">
                    <span>Linked Parent / Guardian</span>
                    <strong>{profile.parent_guardian_name}</strong>
                  </div>
                  <div className="info-item">
                    <span>Relationship to Student</span>
                    <strong>{profile.relationship_to_student}</strong>
                  </div>
                  <div className="info-item">
                    <span>Registered Mobile Number</span>
                    <strong>{profile.phone}</strong>
                  </div>
                  <div className="info-item">
                    <span>Notification Email Address</span>
                    <strong>{profile.email}</strong>
                  </div>
                  <div className="info-item full-span">
                    <span>Complete Home Address</span>
                    <strong>{profile.address}</strong>
                  </div>
                  <div className="info-item">
                    <span>Selected Payment Plan</span>
                    <strong>{planDisplayLabel}</strong>
                  </div>
                  <div className="info-item">
                    <span>Preferred Payment Channel</span>
                    <strong className="uppercase">
                      {profile.payment_method}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: BILLING & PAYMENT PLAN SLIDER ==================== */}
        {activeTab === "billing" && (
          <div className="portal-tab-content">
            <div className="portal-two-col billing-layout">
              {/* Left: Statement of Account + Preferred Payment Plan Slider */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalculator size={19} />
                  </span>
                  <div>
                    <h3>Statement of Account &amp; Plan Slider</h3>
                    <p>
                      {profile.grade_level} (
                      {profile.student_type === "old"
                        ? "Old Student"
                        : "New / Transferee"}{" "}
                      Rate)
                    </p>
                  </div>
                </div>

                {/* Interactive Payment Plan Slider inside Student Portal */}
                <div className="soa-plan-switcher">
                  <label
                    htmlFor="portal-plan-slider"
                    className="soa-switcher-label"
                  >
                    Slide to Change Preferred Payment Plan:{" "}
                    <strong className="highlight-pink">
                      {planDisplayLabel}
                    </strong>
                  </label>
                  <input
                    id="portal-plan-slider"
                    type="range"
                    min={0}
                    max={2}
                    step={1}
                    value={planSliderIndex}
                    onChange={(e) => {
                      const nextKey =
                        PLAN_SLIDER_KEYS[Number(e.target.value)] || "monthly";
                      handleSwitchPaymentPlan(nextKey);
                    }}
                    className="calc-slider"
                  />
                  <div className="slider-labels">
                    <span
                      className={
                        profile.payment_plan === "cash" ? "active-label" : ""
                      }
                    >
                      Full Cash (10% Off)
                    </span>
                    <span
                      className={
                        profile.payment_plan === "quarterly"
                          ? "active-label"
                          : ""
                      }
                    >
                      Quarterly (4 Exams)
                    </span>
                    <span
                      className={
                        profile.payment_plan === "monthly" ? "active-label" : ""
                      }
                    >
                      Monthly (10 Months)
                    </span>
                  </div>
                </div>

                <div className="soa-breakdown-list">
                  <div className="soa-row">
                    <span>Tuition Fee</span>
                    <strong>{formatPeso(billing.tuition_fee)}</strong>
                  </div>
                  <div className="soa-row">
                    <span>Miscellaneous Fee (Upon Enrollment Downpayment)</span>
                    <strong>{formatPeso(billing.misc_fee)}</strong>
                  </div>
                  <div className="soa-row">
                    <span>Computer Fee</span>
                    <strong>
                      {billing.computer_fee > 0
                        ? formatPeso(billing.computer_fee)
                        : "None (₱0.00)"}
                    </strong>
                  </div>
                  <div className="soa-row subtotal-row">
                    <span>Regular Sub-Total</span>
                    <strong>{formatPeso(billing.regular_subtotal)}</strong>
                  </div>
                  {billing.cash_discount > 0 && (
                    <div className="soa-row discount-row">
                      <span>Less 10% Full Cash Discount</span>
                      <strong>− {formatPeso(billing.cash_discount)}</strong>
                    </div>
                  )}
                  <div className="soa-row total-row">
                    <span>Total School Year Assessment</span>
                    <strong>{formatPeso(billing.total_assessment)}</strong>
                  </div>
                  <div className="soa-row paid-row">
                    <span>Less: Total Verified Payments</span>
                    <strong>− {formatPeso(billing.amount_paid)}</strong>
                  </div>
                  <div className="soa-row balance-row">
                    <span>Remaining Balance</span>
                    <strong>{formatPeso(billing.remaining_balance)}</strong>
                  </div>
                </div>
              </div>

              {/* Right: Installment Schedule (Verified by LKA Registrar / Cashier) */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalendar size={19} />
                  </span>
                  <div>
                    <h3>Installment Payment Schedule</h3>
                    <p>
                      Settle your due installment at the LKA School Cashier or
                      via GCash (0926-549-3089) and claim your physical Official
                      Receipt (OR) at school.
                    </p>
                  </div>
                </div>

                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Installment Description</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.schedule.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.title}</strong>
                          </td>
                          <td>{item.due_date}</td>
                          <td className="price-cell">
                            {formatPeso(item.amount)}
                          </td>
                          <td>
                            <span
                              className={`sched-badge ${
                                item.status === "Paid"
                                  ? "paid"
                                  : item.status === "Due Next"
                                  ? "due"
                                  : "upcoming"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {item.status === "Paid" ? (
                              <span className="paid-check-text">
                                <IconCheck size={13} /> Verified at School
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#7c5869",
                                  fontWeight: 600,
                                }}
                              >
                                Pay at LKA Cashier
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Verified Payment History & Physical Receipt Notice */}
            <div className="portal-panel-card">
              <div className="panel-card-header">
                <span className="panel-header-icon">
                  <IconClipboard size={19} />
                </span>
                <div>
                  <h3>
                    Verified Payment History (Claim Physical Receipt at School)
                  </h3>
                  <p>
                    All official paper receipts (OR) are issued in person to the
                    parent/guardian at the LKA School Cashier.
                  </p>
                </div>
              </div>

              <div className="policy-reminder-box">
                <IconSchool size={16} />
                <span>
                  <strong>Physical Official Receipt Policy:</strong> This table
                  serves as your online billing ledger. Parents/guardians must
                  visit the <strong>LKA School Cashier / Registrar</strong> in
                  person to claim the physical paper{" "}
                  <strong>Official Receipt (OR)</strong> for every tuition
                  payment.
                </span>
              </div>

              {payments.length === 0 ? (
                <p className="empty-table-note">
                  No verified payments recorded yet.
                </p>
              ) : (
                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Cashier Record ID</th>
                        <th>Description</th>
                        <th>Channel</th>
                        <th>Physical OR / Cashier Note</th>
                        <th>Date &amp; Time</th>
                        <th>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <span className="or-badge">{p.or_number}</span>
                          </td>
                          <td>
                            <strong>{p.description}</strong>
                          </td>
                          <td>{p.payment_method}</td>
                          <td>{p.reference_no}</td>
                          <td>{p.paid_at}</td>
                          <td className="price-cell text-green">
                            {formatPeso(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: DIGITAL PROMISSORY NOTE & EXAM PERMIT CLEARANCE ==================== */}
        {activeTab === "promissory" && (
          <div className="portal-tab-content">
            <div className="portal-two-col">
              {/* Left: Official Digital Periodical Exam Permit Card */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCheck size={19} />
                  </span>
                  <div>
                    <h3>Periodical Exam Clearance &amp; Permit Status</h3>
                    <p>
                      Automatically cleared for Full Cash / updated payments or
                      approved Promissory Notes — claim permit at the school office
                    </p>
                  </div>
                </div>

                <div className="enroll-assessment-box">
                  <div className="assessment-header">
                    <IconSchool size={17} />
                    <strong>
                      LYCEUM NG KABATAAN ACADEMY, INC. · EXAM CLEARANCE STATUS
                    </strong>
                  </div>

                  <div className="assessment-rows">
                    <div className="assessment-row">
                      <span>Exam Clearance Status:</span>
                      <strong className="text-green">
                        {profile.exam_clearance || "CLEARED FOR EXAM"}
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>School Office Permit Status:</span>
                      <strong
                        className={
                          (profile.exam_clearance || "CLEARED").includes("CLEARED")
                            ? "text-green"
                            : ""
                        }
                      >
                        {(profile.exam_clearance || "CLEARED").includes("CLEARED")
                          ? "Ready at School Office (No Phone/Print Needed)"
                          : (profile.exam_clearance || "").includes("PENDING")
                          ? "Pending Registrar Approval"
                          : "On Hold — Settle Balance or File Promissory"}
                      </strong>
                    </div>
                    <div className="assessment-row highlight-row">
                      <span>Clearance Reference Code:</span>
                      <strong>
                        {profile.exam_permit_code ||
                          `LKA-EXM-2026-${profile.id}`}
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>Student Full Name &amp; ID:</span>
                      <strong>
                        {profile.student_name} ({profile.student_id_no})
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>Grade Level &amp; Section:</span>
                      <strong>
                        {profile.grade_level} · {profile.assigned_section}
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>Account Standing / Risk Tracker:</span>
                      <strong>
                        {profile.delinquency_risk || "Good Standing"}
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>Late Payment Penalty Fee:</span>
                      <strong className="text-green">
                        ₱0.00 (No Penalty Policy)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="soa-breakdown-list" style={{ marginTop: "14px" }}>
                  <div className="soa-row">
                    <span>1st Quarter Periodical Exam</span>
                    <strong>August 2026 · Cleared</strong>
                  </div>
                  <div className="soa-row">
                    <span>2nd Quarter Periodical Exam</span>
                    <strong>October 2026 · Scheduled</strong>
                  </div>
                  <div className="soa-row">
                    <span>3rd Quarter Periodical Exam</span>
                    <strong>January 2027 · Scheduled</strong>
                  </div>
                  <div className="soa-row">
                    <span>4th Quarter Final Exam</span>
                    <strong>March 2027 · Scheduled</strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(219, 39, 119, 0.06)",
                    border: "1px solid rgba(219, 39, 119, 0.18)",
                    fontSize: "0.86rem",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>How Exam Clearance Works:</strong> Students who are on{" "}
                  <strong>Full Cash Payment</strong> or have up-to-date
                  installments are automatically marked{" "}
                  <strong>CLEARED FOR EXAM</strong>. If you have an approved{" "}
                  <strong>Digital Promissory Note</strong>, your child&apos;s
                  exam permit is also automatically marked ready at the school
                  office — no need to print or bring a phone to school.
                </div>
              </div>

              {/* Right: Online Digital Promissory Note Filing (1-Week Extension) */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalendar size={19} />
                  </span>
                  <div>
                    <h3>
                      File Online Digital Promissory Note (1-Week Extension)
                    </h3>
                    <p>
                      For parents who are delayed in paying before the exam:
                      request a 1-week grace period with ₱0.00 penalty to
                      unlock your child&apos;s Exam Permit.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitPromissoryNote}>
                  <div className="field">
                    <label>Periodical Examination Quarter</label>
                    <select
                      className="form-select"
                      value={pnQuarter}
                      onChange={(e) => setPnQuarter(e.target.value)}
                    >
                      <option value="1st Quarter Periodical Exam (August 2026)">
                        1st Quarter Periodical Exam (August 2026)
                      </option>
                      <option value="2nd Quarter Periodical Exam (October 2026)">
                        2nd Quarter Periodical Exam (October 2026)
                      </option>
                      <option value="3rd Quarter Periodical Exam (January 2027)">
                        3rd Quarter Periodical Exam (January 2027)
                      </option>
                      <option value="4th Quarter Periodical Exam (March 2027)">
                        4th Quarter Periodical Exam (March 2027)
                      </option>
                    </select>
                  </div>

                  <div className="form-two-col">
                    <div className="field">
                      <label>Amount Covered by Promissory (PHP)</label>
                      <div className="input-wrap">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={pnAmount}
                          onChange={(e) => setPnAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Promised Payment Date (Within 1 Week)</label>
                      <div className="input-wrap">
                        <input
                          type="date"
                          required
                          value={pnDate}
                          onChange={(e) => setPnDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label>
                      Parent / Guardian Reason for Promissory Extension
                    </label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Salary payout is next Friday; requesting 1-week extension for exam permit"
                        value={pnReason}
                        onChange={(e) => setPnReason(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-btn"
                    disabled={submittingPn}
                  >
                    {submittingPn
                      ? "Submitting Promissory Note..."
                      : "Submit Digital Promissory Note for Exam Permit →"}
                  </button>
                </form>

                {/* Promissory Note History */}
                <div style={{ marginTop: "22px" }}>
                  <span className="soa-switcher-label">
                    Submitted Promissory Notes ({promissoryNotes.length}):
                  </span>
                  {promissoryNotes.length === 0 ? (
                    <p className="empty-table-note">
                      No promissory notes filed yet.
                    </p>
                  ) : (
                    <div className="promissory-list">
                      {promissoryNotes.map((pn) => (
                        <div key={pn.id} className="promissory-card">
                          <div className="promissory-card-top">
                            <strong>
                              {pn.exam_quarter} ({pn.permit_code})
                            </strong>
                            <span
                              className={`sched-badge ${
                                pn.status.includes("Approved") ||
                                pn.status.includes("Settled")
                                  ? "paid"
                                  : "due"
                              }`}
                            >
                              {pn.status}
                            </span>
                          </div>
                          <p>
                            Amount Covered:{" "}
                            <strong>{formatPeso(pn.amount_covered)}</strong> ·
                            Promised Settlement Date:{" "}
                            <strong>{pn.promised_date}</strong> · Late Penalty:{" "}
                            <strong>₱0.00</strong>
                          </p>
                          <p>Reason: {pn.reason}</p>
                          <small>
                            Submitted: {pn.submitted_at}
                            {pn.approved_at
                              ? ` · Approved by Registrar: ${pn.approved_at}`
                              : ""}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: AUTOMATED PAYMENT REMINDER EMAILS ==================== */}
        {activeTab === "reminders" && (
          <div className="portal-tab-content">
            <div className="portal-two-col">
              {/* Left: Automated Email Reminder Settings & Instant Trigger */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconMail size={19} />
                  </span>
                  <div>
                    <h3>Automated Payment Reminder Notifications</h3>
                    <p>
                      Sends automatic email reminders to parents before monthly
                      due dates (15th–30th) and quarterly exams so schedules are
                      never forgotten.
                    </p>
                  </div>
                </div>

                <div className="enroll-assessment-box">
                  <div className="assessment-header">
                    <IconCalendar size={16} />
                    <strong>Next Scheduled Email Reminder</strong>
                  </div>
                  <div className="assessment-rows">
                    <div className="assessment-row">
                      <span>Parent / Guardian Recipient:</span>
                      <strong>
                        {profile.parent_guardian_name} ({profile.email})
                      </strong>
                    </div>
                    <div className="assessment-row">
                      <span>Upcoming Installment:</span>
                      <strong>
                        {nextDueInstallment
                          ? nextDueInstallment.title
                          : "All Paid"}
                      </strong>
                    </div>
                    <div className="assessment-row highlight-row">
                      <span>Amount Due &amp; Schedule:</span>
                      <strong>
                        {nextDueInstallment
                          ? `${formatPeso(nextDueInstallment.amount)} (${
                              nextDueInstallment.due_date
                            })`
                          : "₱0.00"}
                      </strong>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendPaymentReminder}>
                  <div className="field">
                    <label>
                      Parent / Student Email Address for Billing Reminders
                    </label>
                    <div className="input-wrap with-icon">
                      <span className="input-icon">
                        <IconMail size={17} />
                      </span>
                      <input
                        type="email"
                        required
                        value={reminderEmail}
                        onChange={(e) => setReminderEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-btn"
                    disabled={sendingReminder}
                  >
                    {sendingReminder
                      ? "Sending Reminder Email..."
                      : "Send Payment Reminder Email Now →"}
                  </button>
                </form>

                {/* Sent Email Reminders History List */}
                <div style={{ marginTop: "22px" }}>
                  <span className="soa-switcher-label">
                    Sent Email Reminder Log ({reminders.length}):
                  </span>
                  <div className="promissory-list">
                    {reminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="promissory-card"
                        style={{
                          cursor: "pointer",
                          borderColor:
                            selectedEmailPreview?.id === rem.id
                              ? "#d43783"
                              : undefined,
                        }}
                        onClick={() => setSelectedEmailPreview(rem)}
                      >
                        <div className="promissory-card-top">
                          <strong>{rem.installment_title}</strong>
                          <span className="sched-badge paid">
                            {rem.delivery_status}
                          </span>
                        </div>
                        <p>
                          To: <strong>{rem.recipient_email}</strong> · Due:{" "}
                          <strong>{formatPeso(rem.amount_due)}</strong> (
                          {rem.due_date})
                        </p>
                        <small>Sent on {rem.sent_at} · Click to preview</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Email Preview Box */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCheck size={19} />
                  </span>
                  <div>
                    <h3>Official Email Notification Preview</h3>
                    <p>
                      Exact email message sent to the parent/guardian&apos;s
                      inbox
                    </p>
                  </div>
                </div>

                {selectedEmailPreview ? (
                  <div className="email-preview-box">
                    <div className="email-preview-meta">
                      <div>
                        <span>From:</span>{" "}
                        <strong>
                          Lyceum ng Kabataan Academy Billing
                          &lt;lyceumcaloocan@yahoo.com&gt;
                        </strong>
                      </div>
                      <div>
                        <span>To:</span>{" "}
                        <strong>{selectedEmailPreview.recipient_email}</strong>
                      </div>
                      <div>
                        <span>Subject:</span>{" "}
                        <strong>{selectedEmailPreview.subject}</strong>
                      </div>
                      <div>
                        <span>Timestamp:</span>{" "}
                        <strong>{selectedEmailPreview.sent_at}</strong>
                      </div>
                    </div>
                    <pre className="email-preview-body">
                      {selectedEmailPreview.message_body}
                    </pre>
                  </div>
                ) : (
                  <p className="empty-table-note">
                    Select a reminder from the list to view the email content.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ENROLLMENT REQUIREMENTS ==================== */}
        {activeTab === "requirements" && (
          <div className="portal-tab-content">
            <div className="portal-panel-card">
              <div className="panel-card-header">
                <span className="panel-header-icon">
                  <IconClipboard size={19} />
                </span>
                <div>
                  <h3>
                    Physical Document Requirements Status ({submittedCount} of{" "}
                    {reqList.length} Verified by Registrar)
                  </h3>
                  <p>
                    Physical hardcopies must be submitted in person at the LKA
                    Registrar Office. Only the School Registrar can mark
                    documents as received once verified.
                  </p>
                </div>
              </div>

              <div className="policy-reminder-box">
                <IconSchool size={16} />
                <span>
                  <strong>Where to Submit Physical Hardcopies:</strong> Bring the
                  required original/photocopy documents in an envelope with your
                  Student ID (<strong>{profile.student_id_no}</strong>) to the{" "}
                  <strong>LKA Registrar Office</strong> (Phase 4-B, Package 7,
                  Block 103, Lot 2, Brgy. Bagong Silang, Caloocan City) from{" "}
                  <strong>8:00 AM–12:00 NN</strong> or{" "}
                  <strong>1:00 PM–5:00 PM</strong>.
                </span>
              </div>

              <div className="form-req-checklist">
                {reqList.map((req) => {
                  const isSubmitted = profile.requirements_submitted.includes(
                    req.id
                  );
                  return (
                    <div
                      key={req.id}
                      className={`form-req-item ${
                        isSubmitted ? "checked" : ""
                      }`}
                    >
                      <div className="form-req-text">
                        <strong>{req.label}</strong>
                        <span>{req.note}</span>
                      </div>
                      <span className="req-status-pill">
                        {isSubmitted
                          ? "Received & Verified by Registrar"
                          : "Bring Hardcopy to School Registrar"}
                      </span>
                    </div>
                  );
                })}
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
