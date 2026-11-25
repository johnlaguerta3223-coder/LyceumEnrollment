import { API_BASE } from "../api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  IconCalculator,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconMail,
  IconShield,
  IconUser,
  IconUsers,
} from "./Icons";

interface RegistrarDashboardProps {
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

interface PromissoryNoteRecord {
  id: number;
  user_id: number;
  student_id_no: string;
  student_name: string;
  grade_level: string;
  assigned_section: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  exam_quarter: string;
  amount_covered: number;
  promised_date: string;
  reason: string;
  status: string;
  permit_code: string;
  submitted_at: string;
  approved_at?: string | null;
}

interface RegistrarStudentRecord {
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
  parent_guardian_name: string;
  relationship_to_student: string;
  phone: string;
  email: string;
  previous_school: string;
  payment_plan: "cash" | "quarterly" | "monthly";
  payment_method: string;
  enrollment_status: string;
  requirements_submitted: string[];
  required_total_count: number;
  delinquency_risk?: string;
  exam_clearance?: string;
  exam_permit_code?: string;
  billing: BillingData;
  payments: PaymentReceipt[];
  payment_reminders: PaymentReminderItem[];
  promissory_notes?: PromissoryNoteRecord[];
}

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

const GRADE_LEVEL_FILTERS = [
  "All Grades",
  "Kinder 1",
  "Kinder 2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

function formatPeso(amount: number): string {
  return (
    "₱" +
    amount.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatPlanName(plan: string): string {
  if (plan === "cash") return "Full Cash Basis (10% Off)";
  if (plan === "quarterly") return "Quarterly Plan (4 Exams)";
  return "Monthly Plan (10 Months)";
}

export default function RegistrarDashboard({
  token,
  onLogout,
}: RegistrarDashboardProps) {
  const [activeTab, setActiveTabState] = useState<
    "masterlist" | "pending" | "reminders" | "promissory"
  >(() => {
    const saved = localStorage.getItem("lka_registrar_tab");
    if (
      saved === "masterlist" ||
      saved === "pending" ||
      saved === "reminders" ||
      saved === "promissory"
    ) {
      return saved;
    }
    return "masterlist";
  });

  const setActiveTab = (
    tab: "masterlist" | "pending" | "reminders" | "promissory"
  ) => {
    localStorage.setItem("lka_registrar_tab", tab);
    setActiveTabState(tab);
  };
  const [students, setStudents] = useState<RegistrarStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tab 1: Enrolled Masterlist Search & Quick Payment State
  const [masterSearch, setMasterSearch] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("All Grades");
  const [balanceFilter, setBalanceFilter] = useState<
    "all" | "with_balance" | "fully_paid"
  >("all");
  const [payingStudentId, setPayingStudentId] = useState<number | null>(null);

  // Tab 2: Pending Online Registrations State
  const [pendingSearch, setPendingSearch] = useState<string>("");
  const [selectedPendingId, setSelectedPendingId] = useState<number | null>(
    null
  );

  // Shared Tuition Payment Input State
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDescription, setPayDescription] = useState<string>(
    "Upon Enrollment Downpayment / Tuition"
  );
  const [payChannel, setPayChannel] = useState<string>(
    "Cash at LKA School Cashier"
  );
  const [payRef, setPayRef] = useState<string>("");
  const [processingAction, setProcessingAction] = useState(false);

  // Tab 3: Email Reminder Preview State
  const [previewReminder, setPreviewReminder] =
    useState<PaymentReminderItem | null>(null);
  const [reminderGradeFilter, setReminderGradeFilter] =
    useState<string>("All Grades");
  const [reminderSearch, setReminderSearch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth > 920 : true
  );
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  // Walk-In Student Account Creation State (Registrar-only: Student accounts only)
  const [showCreateStudent, setShowCreateStudent] = useState<boolean>(false);
  const [newStuName, setNewStuName] = useState<string>("");
  const [newStuLrn, setNewStuLrn] = useState<string>("");
  const [newStuType, setNewStuType] = useState<"new" | "old" | "transferee">(
    "new"
  );
  const [newStuGrade, setNewStuGrade] = useState<string>("Grade 1");
  const [newStuShift, setNewStuShift] = useState<"morning" | "afternoon">(
    "morning"
  );
  const [newStuParent, setNewStuParent] = useState<string>("");
  const [newStuPhone, setNewStuPhone] = useState<string>("");
  const [newStuEmail, setNewStuEmail] = useState<string>("");
  const [newStuContactEmail, setNewStuContactEmail] = useState<string>("");
  const [usernameManualEdit, setUsernameManualEdit] = useState<boolean>(false);
  const [newStuPassword, setNewStuPassword] = useState<string>("");

  const generateStudentUsername = (fullName: string): string => {
    const trimmed = fullName.trim();
    if (!trimmed) return "";
    let normalized = trimmed;
    if (trimmed.includes(",")) {
      const [last, first] = trimmed.split(",", 2);
      normalized = `${first || ""} ${last || ""}`.trim();
    }
    const slug = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, ".");
    return slug ? `${slug}@lyceum.edu.ph` : "";
  };
  const [newStuPlan, setNewStuPlan] = useState<
    "cash" | "quarterly" | "monthly"
  >("monthly");
  const [newStuMethod, setNewStuMethod] = useState<"cash">("cash");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/auth/registrar/students`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const list: RegistrarStudentRecord[] = res.data.students || [];
      setStudents(list);

      const pendingList = list.filter(
        (s) => s.enrollment_status !== "Officially Enrolled"
      );
      if (pendingList.length > 0 && !selectedPendingId) {
        const firstPending = pendingList[0];
        setSelectedPendingId(firstPending.id);
        const nextDue = firstPending.billing.schedule.find(
          (item) => item.status !== "Paid"
        );
        setPayAmount(
          String(
            nextDue ? nextDue.amount : firstPending.billing.downpayment_required
          )
        );
        setPayDescription(
          nextDue
            ? nextDue.title
            : "Upon Enrollment Downpayment (Miscellaneous Fee)"
        );
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onLogout();
        return;
      }
      setBannerMsg({
        type: "error",
        text: "Failed to load student records from the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [token]);

  const enrolledStudents = students.filter(
    (s) =>
      s.enrollment_status === "Officially Enrolled" ||
      s.enrollment_status === "Conditionally Enrolled (Requirements To Follow)"
  );
  const pendingStudents = students.filter(
    (s) =>
      s.enrollment_status !== "Officially Enrolled" &&
      s.enrollment_status !== "Conditionally Enrolled (Requirements To Follow)"
  );
  const dueStudents = enrolledStudents.filter(
    (s) => s.billing.remaining_balance > 0
  );
  const filteredDueStudents = dueStudents.filter((s) => {
    if (
      reminderGradeFilter !== "All Grades" &&
      s.grade_level !== reminderGradeFilter
    ) {
      return false;
    }
    const q = reminderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.student_id_no.toLowerCase().includes(q) ||
      s.parent_guardian_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  // Filtered Enrolled Masterlist (Tab 1)
  const filteredMasterlist = enrolledStudents.filter((s) => {
    if (gradeFilter !== "All Grades" && s.grade_level !== gradeFilter) {
      return false;
    }
    if (
      balanceFilter === "with_balance" &&
      s.billing.remaining_balance <= 0
    ) {
      return false;
    }
    if (balanceFilter === "fully_paid" && s.billing.remaining_balance > 0) {
      return false;
    }
    if (masterSearch.trim()) {
      const q = masterSearch.toLowerCase();
      return (
        s.student_name.toLowerCase().includes(q) ||
        s.student_id_no.toLowerCase().includes(q) ||
        s.student_lrn.toLowerCase().includes(q) ||
        s.parent_guardian_name.toLowerCase().includes(q) ||
        s.grade_level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Pending List (Tab 2)
  const filteredPending = pendingStudents.filter((s) => {
    if (pendingSearch.trim()) {
      const q = pendingSearch.toLowerCase();
      return (
        s.student_name.toLowerCase().includes(q) ||
        s.student_id_no.toLowerCase().includes(q) ||
        s.parent_guardian_name.toLowerCase().includes(q) ||
        s.grade_level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedPendingStudent =
    pendingStudents.find((s) => s.id === selectedPendingId) ||
    pendingStudents[0] ||
    null;

  const activePayingStudent =
    enrolledStudents.find((s) => s.id === payingStudentId) || null;

  const openQuickPaymentForEnrolled = (stu: RegistrarStudentRecord) => {
    setPayingStudentId(stu.id);
    setBannerMsg(null);
    const nextDue = stu.billing.schedule.find((item) => item.status !== "Paid");
    setPayAmount(
      String(nextDue ? nextDue.amount : stu.billing.remaining_balance)
    );
    setPayDescription(
      nextDue ? nextDue.title : "Tuition Fee Installment Payment"
    );
    setPayRef("");
  };

  const handleSelectPendingStudent = (stu: RegistrarStudentRecord) => {
    setSelectedPendingId(stu.id);
    setBannerMsg(null);
    const nextDue = stu.billing.schedule.find((item) => item.status !== "Paid");
    setPayAmount(
      String(nextDue ? nextDue.amount : stu.billing.downpayment_required)
    );
    setPayDescription(
      nextDue
        ? nextDue.title
        : "Upon Enrollment Downpayment (Miscellaneous Fee)"
    );
    setPayRef("");
  };

  const handleToggleRequirement = async (
    student: RegistrarStudentRecord,
    reqId: string
  ) => {
    const current = student.requirements_submitted || [];
    const nextList = current.includes(reqId)
      ? current.filter((item) => item !== reqId)
      : [...current, reqId];

    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/students/${student.id}/requirements`,
        { requirements_submitted: nextList },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchStudents();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Could not update physical requirements status.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCheckAllRequirements = async (
    student: RegistrarStudentRecord
  ) => {
    const reqDocs =
      REQUIREMENTS_CATALOG[student.student_type] || REQUIREMENTS_CATALOG.new;
    const allIds = reqDocs.map((r) => r.id);

    try {
      setProcessingAction(true);
      await axios.post(
        `${API_BASE}/api/auth/registrar/students/${student.id}/requirements`,
        { requirements_submitted: allIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({
        type: "success",
        text: `All physical requirements marked as Received & Verified for ${student.student_name}!`,
      });
      await fetchStudents();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Could not mark all requirements.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRecordPaymentForStudent = async (
    e: React.FormEvent,
    student: RegistrarStudentRecord
  ) => {
    e.preventDefault();
    const numericAmt = Number(payAmount);
    if (!numericAmt || numericAmt <= 0) {
      setBannerMsg({
        type: "error",
        text: "Please enter a valid tuition payment amount.",
      });
      return;
    }

    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/students/${student.id}/payment`,
        {
          description: payDescription,
          amount: numericAmt,
          payment_method: payChannel,
          reference_no:
            payRef.trim() || "Physical OR Issued at LKA School Cashier",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({
        type: "success",
        text: `${res.data.message} (Physical Official Receipt issued to parent/guardian at LKA Cashier).`,
      });
      setPayRef("");
      setPayingStudentId(null);
      await fetchStudents();
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text: err.response?.data?.detail || "Failed to record payment.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleApproveEnrollment = async (student: RegistrarStudentRecord) => {
    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/students/${student.id}/enroll`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchStudents();
      setActiveTab("masterlist");
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Cannot officially enroll student yet. Check physical requirements and tuition payment.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSendSingleReminder = async (student: RegistrarStudentRecord) => {
    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/students/${student.id}/remind`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      const updated = await axios.get(
        `${API_BASE}/api/auth/registrar/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list: RegistrarStudentRecord[] = updated.data.students || [];
      setStudents(list);
      const refreshed = list.find((s) => s.id === student.id);
      if (refreshed && refreshed.payment_reminders.length > 0) {
        setPreviewReminder(refreshed.payment_reminders[0]);
      }
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Failed to send payment reminder email.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSendBulkReminders = async () => {
    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/reminders/send-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchStudents();
    } catch (err) {
      setBannerMsg({
        type: "error",
        text: "Failed to send bulk payment reminder emails.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleUpdatePromissoryStatus = async (
    noteId: number,
    nextStatus: string
  ) => {
    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/promissory/${noteId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      await fetchStudents();
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not update Promissory Note status.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const allPromissoryNotes: PromissoryNoteRecord[] = students.flatMap(
    (s) => s.promissory_notes || []
  );

  const handleCreateWalkInStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const res = await axios.post(
        `${API_BASE}/api/auth/registrar/students/create`,
        {
          student_name: newStuName,
          student_lrn: newStuLrn,
          student_type: newStuType,
          grade_level: newStuGrade,
          class_shift: newStuShift,
          parent_name: newStuParent,
          phone: newStuPhone,
          email: newStuEmail,
          contact_email: newStuContactEmail,
          password: newStuPassword,
          payment_plan: newStuPlan,
          payment_method: newStuMethod,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBannerMsg({ type: "success", text: res.data.message });
      setNewStuName("");
      setNewStuLrn("");
      setNewStuParent("");
      setNewStuPhone("");
      setNewStuEmail("");
      setNewStuContactEmail("");
      setUsernameManualEdit(false);
      setNewStuPassword("");
      setShowCreateStudent(false);
      await fetchStudents();
      setActiveTab("pending");
    } catch (err: any) {
      setBannerMsg({
        type: "error",
        text:
          err.response?.data?.detail ||
          "Could not create walk-in student account.",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="portal-loading-screen">
        <div className="portal-loading-card">
          <img src="/logo.jpg" alt="LKA Logo" className="portal-loading-logo" />
          <h3>Loading Portal...</h3>
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
  const registrarDisplayName =
    localStorage.getItem("user_name") || "School Registrar";

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
            <span>Registrar &amp; Billing System</span>
          </div>
        </div>

        <div className="lka-sidebar-group">
          <span className="lka-sidebar-label">Workspace</span>
          <nav className="lka-sidebar-nav">
            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "masterlist" ? "active" : ""
              }`}
              onClick={() => setActiveTab("masterlist")}
            >
              <span className="lka-nav-item-left">
                <IconUsers size={16} />
                <span>Enrolled Masterlist</span>
              </span>
              <span className="lka-nav-badge">{enrolledStudents.length}</span>
            </button>

            <button
              type="button"
              className={`lka-nav-item ${
                activeTab === "pending" ? "active" : ""
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <span className="lka-nav-item-left">
                <IconClipboard size={16} />
                <span>Pending Registrations</span>
              </span>
              <span className="lka-nav-badge">{pendingStudents.length}</span>
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
                <span>Promissory &amp; Clearance</span>
              </span>
              <span className="lka-nav-badge">{allPromissoryNotes.length}</span>
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
                <span>Billing Due &amp; Reminders</span>
              </span>
              <span className="lka-nav-badge">{dueStudents.length}</span>
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
              Lyceum ng Kabataan Academy, Inc. · Registrar Office (8:00 AM–5:00 PM)
            </span>
          </div>

          <div className="lka-topbar-right">
            <div className="lka-user-menu-wrap">
              <button
                type="button"
                className="lka-user-pill-btn"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <div className="lka-avatar-circle">
                  {registrarDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="lka-user-pill-info">
                  <strong>{registrarDisplayName}</strong>
                  <span>Registrar</span>
                </div>
                <span className="lka-user-caret">▾</span>
              </button>

              {userMenuOpen && (
                <div className="lka-user-dropdown">
                  <div className="lka-dropdown-header">
                    <strong>{registrarDisplayName}</strong>
                    <span>School Registrar</span>
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
            {/* Compact Welcome Header on Masterlist */}
            {activeTab === "masterlist" && (
              <section className="lka-welcome-banner">
                <div>
                  <div className="lka-welcome-date">{dateStr}</div>
                  <div className="lka-welcome-time">{timeStr}</div>
                  <h1>Hello {registrarDisplayName}!</h1>
                  <p>
                    Today you have{" "}
                    <strong>{pendingStudents.length}</strong> pending online
                    registration(s) and{" "}
                    <strong>{dueStudents.length}</strong> student(s) with
                    upcoming tuition installments.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="lka-cta-pill-btn"
                      onClick={() => setActiveTab("promissory")}
                    >
                      Review Promissory &amp; Clearances →
                    </button>
                    <button
                      type="button"
                      className="portal-logout-btn"
                      onClick={() => setActiveTab("pending")}
                    >
                      Check Pending Applicants
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
              <div
                className={`alert ${bannerMsg.type}`}
                style={{
                  position: "fixed",
                  top: "18px",
                  right: "18px",
                  zIndex: 9999,
                  maxWidth: "440px",
                  width: "calc(100vw - 36px)",
                  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  margin: 0,
                }}
              >
                <span>{bannerMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setBannerMsg(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    fontWeight: 700,
                    fontSize: "1rem",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: "2px 6px",
                  }}
                  aria-label="Close notification"
                >
                  ×
                </button>
              </div>
            )}

            {/* Walk-In Student Account Creation Panel (Available from any tab when toggled) */}
            {showCreateStudent && (
              <form
                className="inline-payment-box"
                style={{ marginBottom: "20px" }}
                onSubmit={handleCreateWalkInStudent}
              >
                <div className="inline-pay-header">
                  <div>
                    <h4>Create Student Account</h4>
                  </div>
                  <button
                    type="button"
                    className="step-back-btn"
                    style={{ width: "auto", padding: "6px 14px" }}
                    onClick={() => setShowCreateStudent(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="form-two-col">
                  <div className="field">
                    <label>Student Full Name</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dela Cruz, Ana Maria"
                        value={newStuName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewStuName(val);
                          if (!usernameManualEdit) {
                            setNewStuEmail(generateStudentUsername(val));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Student LRN (Optional for Kinder)</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="e.g. 136498000999"
                        value={newStuLrn}
                        onChange={(e) => setNewStuLrn(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="form-two-col"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  <div className="field">
                    <label>Student Type</label>
                    <select
                      className="form-select"
                      value={newStuType}
                      onChange={(e) =>
                        setNewStuType(
                          e.target.value as "new" | "old" | "transferee"
                        )
                      }
                    >
                      <option value="new">New Student</option>
                      <option value="old">Old Student (LKA)</option>
                      <option value="transferee">Transferee</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Grade Level</label>
                    <select
                      className="form-select"
                      value={newStuGrade}
                      onChange={(e) => {
                        const grade = e.target.value;
                        setNewStuGrade(grade);
                        const afternoonGrades = ["Grade 4", "Grade 5", "Grade 6"];
                        setNewStuShift(
                          afternoonGrades.includes(grade) ? "afternoon" : "morning"
                        );
                      }}
                    >
                      {[
                        "Kinder 1",
                        "Kinder 2",
                        "Grade 1",
                        "Grade 2",
                        "Grade 3",
                        "Grade 4",
                        "Grade 5",
                        "Grade 6",
                      ].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Class Shift (Auto by Grade)</label>
                    <select
                      className="form-select"
                      value={newStuShift}
                      onChange={(e) =>
                        setNewStuShift(e.target.value as "morning" | "afternoon")
                      }
                    >
                      <option value="morning">
                        Morning Shift (
                        {newStuGrade.startsWith("Kinder")
                          ? "7:00 AM – 9:30 AM"
                          : "7:00 AM – 12:00 NN"}
                        )
                      </option>
                      <option value="afternoon">
                        Afternoon Shift (
                        {newStuGrade.startsWith("Kinder")
                          ? "12:00 NN – 2:30 PM"
                          : "12:00 NN – 5:00 PM"}
                        )
                      </option>
                    </select>
                  </div>
                </div>

                <div className="form-two-col">
                  <div className="field">
                    <label>Parent / Guardian Full Name</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Elena Dela Cruz"
                        value={newStuParent}
                        onChange={(e) => setNewStuParent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Parent Mobile Number</label>
                    <div className="input-wrap">
                      <input
                        type="tel"
                        required
                        placeholder="09171234569"
                        value={newStuPhone}
                        onChange={(e) => setNewStuPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="form-two-col"
                  style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
                >
                  <div className="field">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <label style={{ marginBottom: 0 }}>
                        Student Username (@lyceum.edu.ph)
                      </label>
                      <button
                        type="button"
                        className="forgot-link-btn"
                        style={{ fontSize: "0.74rem" }}
                        onClick={() => {
                          setUsernameManualEdit(false);
                          setNewStuEmail(generateStudentUsername(newStuName));
                        }}
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <div className="input-wrap">
                      <input
                        type="email"
                        required
                        placeholder="student.name@lyceum.edu.ph"
                        value={newStuEmail}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewStuEmail(val);
                          setUsernameManualEdit(val.trim().length > 0);
                        }}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>
                      Parent&apos;s Personal Gmail (Receives Account &amp;
                      Reminders)
                    </label>
                    <div className="input-wrap">
                      <input
                        type="email"
                        required
                        placeholder="e.g. juandelacruz@gmail.com"
                        value={newStuContactEmail}
                        onChange={(e) => setNewStuContactEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Initial Password (Min. 6 chars)</label>
                    <div className="input-wrap">
                      <input
                        type="password"
                        required
                        placeholder="Min. 6 characters"
                        value={newStuPassword}
                        onChange={(e) => setNewStuPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Payment Plan</label>
                    <select
                      className="form-select"
                      value={newStuPlan}
                      onChange={(e) =>
                        setNewStuPlan(
                          e.target.value as "cash" | "quarterly" | "monthly"
                        )
                      }
                    >
                      <option value="monthly">Monthly (10 Months)</option>
                      <option value="quarterly">Quarterly (4 Exams)</option>
                      <option value="cash">Full Cash (10% Off)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Preferred Mode of Payment</label>
                  <select
                    className="form-select"
                    value={newStuMethod}
                    onChange={(e) => setNewStuMethod(e.target.value as "cash")}
                  >
                    <option value="cash">Cash at School Cashier</option>
                  </select>
                </div>

                <div className="inline-pay-actions">
                  <button
                    type="button"
                    className="step-back-btn"
                    onClick={() => setShowCreateStudent(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="login-btn"
                    disabled={processingAction}
                  >
                    {processingAction
                      ? "Creating Student Account..."
                      : "+ Create Student Account →"}
                  </button>
                </div>
              </form>
            )}

        {/* ==================== TAB 1: ENROLLED STUDENTS MASTERLIST & INSTANT TUITION PAYMENT ==================== */}
        {activeTab === "masterlist" && (
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
                    <IconUsers size={19} />
                  </span>
                  <div>
                    <h3>
                      Officially Enrolled Students Masterlist &amp; Tuition
                      Payment Search
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  className="lka-cta-pill-btn"
                  onClick={() => setShowCreateStudent((prev) => !prev)}
                >
                  + Create student account
                </button>
              </div>

              {/* Search Bar & Filters Row */}
              <div className="form-two-col masterlist-filter-grid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Search Student Name, ID, LRN, or Guardian</label>
                  <div className="input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. Juan Dela Cruz, LKA-2026-0651, or Maria..."
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Filter by Grade Level</label>
                  <select
                    className="form-select"
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                  >
                    {GRADE_LEVEL_FILTERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Filter by Balance Status</label>
                  <select
                    className="form-select"
                    value={balanceFilter}
                    onChange={(e) =>
                      setBalanceFilter(
                        e.target.value as "all" | "with_balance" | "fully_paid"
                      )
                    }
                  >
                    <option value="all">All Enrolled Students</option>
                    <option value="with_balance">With Remaining Balance</option>
                    <option value="fully_paid">Fully Paid (₱0.00)</option>
                  </select>
                </div>
              </div>

              {/* Quick Tuition Payment Modal / Inline Box when Registrar clicks "Pay Tuition" */}
              {activePayingStudent && (
                <form
                  className="inline-payment-box"
                  onSubmit={(e) =>
                    handleRecordPaymentForStudent(e, activePayingStudent)
                  }
                >
                  <div className="inline-pay-header">
                    <div>
                      <span className="inline-pay-tag">
                        Record Tuition Payment · Issue Physical OR at Cashier
                      </span>
                      <h4>
                        {activePayingStudent.student_name} (
                        {activePayingStudent.student_id_no} ·{" "}
                        {activePayingStudent.grade_level})
                      </h4>
                      <span style={{ fontSize: "0.8rem", color: "#7c5869" }}>
                        Guardian: {activePayingStudent.parent_guardian_name} ·
                        Plan:{" "}
                        <strong>
                          {formatPlanName(activePayingStudent.payment_plan)}
                        </strong>{" "}
                        · Current Remaining Balance:{" "}
                        <strong>
                          {formatPeso(
                            activePayingStudent.billing.remaining_balance
                          )}
                        </strong>
                      </span>
                    </div>
                    <strong className="inline-pay-amount">
                      {formatPeso(Number(payAmount) || 0)}
                    </strong>
                  </div>

                  <div className="form-two-col">
                    <div className="field">
                      <label>Installment / Payment Description</label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          required
                          value={payDescription}
                          onChange={(e) => setPayDescription(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="field">
                      <label>Amount Paid (PHP)</label>
                      <div className="input-wrap">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-two-col">
                    <div className="field">
                      <label>Payment Mode</label>
                      <select
                        className="form-select"
                        value={payChannel}
                        onChange={(e) => setPayChannel(e.target.value)}
                      >
                        <option value="Cash at LKA School Cashier">
                          Cash at LKA School Cashier
                        </option>
                      </select>
                    </div>

                    <div className="field">
                      <label>
                        Physical OR Booklet No. / Reference Note (Given to
                        Guardian at School)
                      </label>
                      <div className="input-wrap">
                        <input
                          type="text"
                          placeholder="e.g. Physical OR #04821 handed to guardian"
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="inline-pay-actions">
                    <button
                      type="button"
                      className="step-back-btn"
                      onClick={() => setPayingStudentId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="login-btn"
                      disabled={processingAction}
                    >
                      {processingAction
                        ? "Saving Payment..."
                        : `Save Payment (${formatPeso(
                            Number(payAmount) || 0
                          )}) & Update Student Balance →`}
                    </button>
                  </div>
                </form>
              )}

              {/* Enrolled Students Masterlist Table */}
              {filteredMasterlist.length === 0 ? (
                <p className="empty-table-note">
                  No enrolled students match your search filter.
                </p>
              ) : (
                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Student ID &amp; Name</th>
                        <th>Grade &amp; Section</th>
                        <th>Parent / Guardian</th>
                        <th>Selected Plan</th>
                        <th>Total Paid</th>
                        <th>Remaining Balance</th>
                        <th>Next Due Installment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMasterlist.map((stu) => {
                        const nextDue = stu.billing.schedule.find(
                          (item) => item.status !== "Paid"
                        );
                        return (
                          <tr key={stu.id}>
                            <td>
                              <strong>{stu.student_name}</strong>
                              <span className="table-subtext">
                                {stu.student_id_no} · LRN: {stu.student_lrn}
                              </span>
                            </td>
                            <td>
                              <strong>{stu.grade_level}</strong>
                              <span className="table-subtext">
                                {stu.assigned_section}
                              </span>
                            </td>
                            <td>
                              <strong>{stu.parent_guardian_name}</strong>
                              <span className="table-subtext">
                                {stu.phone} · {stu.email}
                              </span>
                            </td>
                            <td>
                              <span className="sched-badge due">
                                {formatPlanName(stu.payment_plan)}
                              </span>
                            </td>
                            <td className="price-cell text-green">
                              {formatPeso(stu.billing.amount_paid)}
                            </td>
                            <td className="price-cell text-pink">
                              {formatPeso(stu.billing.remaining_balance)}
                            </td>
                            <td>
                              {nextDue ? (
                                <>
                                  <strong>{formatPeso(nextDue.amount)}</strong>
                                  <span className="table-subtext">
                                    {nextDue.title} ({nextDue.due_date})
                                  </span>
                                </>
                              ) : (
                                <span className="sched-badge paid">
                                  Fully Paid
                                </span>
                              )}
                            </td>
                            <td>
                              {stu.billing.remaining_balance > 0 ? (
                                <button
                                  type="button"
                                  className="table-pay-btn"
                                  style={{ whiteSpace: "nowrap" }}
                                  onClick={() =>
                                    openQuickPaymentForEnrolled(stu)
                                  }
                                >
                                  Create payment
                                </button>
                              ) : (
                                <span className="paid-check-text">
                                  <IconCheck size={13} /> Cleared
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PENDING ONLINE REGISTRATIONS (VERIFY REQUIREMENTS & ENROLL) ==================== */}
        {activeTab === "pending" && (
          <div className="portal-tab-content">
            {pendingStudents.length === 0 ? (
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCheck size={19} />
                  </span>
                  <div>
                    <h3>All Online Applicants Are Officially Enrolled!</h3>
                    <p>
                      There are currently no pending student registrations
                      waiting for physical requirements verification.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="portal-two-col">
                {/* Left: Pending Applicants Queue */}
                <div className="portal-panel-card">
                  <div className="panel-card-header">
                    <span className="panel-header-icon">
                      <IconClipboard size={19} />
                    </span>
                    <div>
                      <h3>
                        Pending Online Applicants ({filteredPending.length})
                      </h3>
                      <p>
                        Students waiting to submit physical requirements &amp;
                        tuition at school
                      </p>
                    </div>
                  </div>

                  <div className="field">
                    <div className="input-wrap">
                      <input
                        type="text"
                        placeholder="Search pending applicant by name or ID..."
                        value={pendingSearch}
                        onChange={(e) => setPendingSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="promissory-list">
                    {filteredPending.map((stu) => {
                      const isSelected = selectedPendingStudent?.id === stu.id;
                      return (
                        <div
                          key={stu.id}
                          className="promissory-card"
                          style={{
                            cursor: "pointer",
                            borderColor: isSelected ? "#d43783" : undefined,
                            background: isSelected ? "#fff0f7" : undefined,
                          }}
                          onClick={() => handleSelectPendingStudent(stu)}
                        >
                          <div className="promissory-card-top">
                            <strong>
                              {stu.student_name} ({stu.student_id_no})
                            </strong>
                            <span className="sched-badge due">
                              {stu.enrollment_status}
                            </span>
                          </div>
                          <p>
                            <strong>{stu.grade_level}</strong> · Guardian:{" "}
                            <strong>{stu.parent_guardian_name}</strong> (
                            {stu.phone})
                          </p>
                          <small>
                            Physical Requirements:{" "}
                            <strong>
                              {stu.requirements_submitted.length} of{" "}
                              {stu.required_total_count} Verified
                            </strong>{" "}
                            · Paid:{" "}
                            <strong>
                              {formatPeso(stu.billing.amount_paid)}
                            </strong>
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Pending Applicant Verification & Official Enrollment */}
                {selectedPendingStudent &&
                  (() => {
                    const reqDocs =
                      REQUIREMENTS_CATALOG[
                        selectedPendingStudent.student_type
                      ] || REQUIREMENTS_CATALOG.new;
                    const allReqsDone = reqDocs.every((r) =>
                      selectedPendingStudent.requirements_submitted.includes(
                        r.id
                      )
                    );
                    const dpPaid =
                      selectedPendingStudent.billing.amount_paid + 0.5 >=
                      selectedPendingStudent.billing.downpayment_required;
                    const canEnroll = dpPaid;

                    return (
                      <div className="portal-panel-card">
                        <div className="panel-card-header">
                          <span className="panel-header-icon">
                            <IconUser size={19} />
                          </span>
                          <div>
                            <h3>
                              Verify &amp; Officially Enroll:{" "}
                              {selectedPendingStudent.student_name}
                            </h3>
                            <p>
                              {selectedPendingStudent.student_id_no} ·{" "}
                              {selectedPendingStudent.grade_level} (
                              <span className="capitalize">
                                {selectedPendingStudent.student_type} Student
                              </span>
                              )
                            </p>
                          </div>
                        </div>

                        {/* Step 1: Physical Requirements Checklist */}
                        <div style={{ marginBottom: "20px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "8px",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <strong
                              style={{ fontSize: "0.9rem", color: "#3d1d2e" }}
                            >
                              Step 1: Check Physical Requirements Submitted at
                              School (
                              {
                                selectedPendingStudent.requirements_submitted
                                  .length
                              }{" "}
                              of {reqDocs.length})
                            </strong>
                            {!allReqsDone && (
                              <button
                                type="button"
                                className="table-pay-btn"
                                onClick={() =>
                                  handleCheckAllRequirements(
                                    selectedPendingStudent
                                  )
                                }
                                disabled={processingAction}
                              >
                                Mark All Requirements as Received
                              </button>
                            )}
                          </div>

                          <div className="form-req-checklist">
                            {reqDocs.map((req) => {
                              const isChecked =
                                selectedPendingStudent.requirements_submitted.includes(
                                  req.id
                                );
                              return (
                                <label
                                  key={req.id}
                                  className={`form-req-item ${
                                    isChecked ? "checked" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      handleToggleRequirement(
                                        selectedPendingStudent,
                                        req.id
                                      )
                                    }
                                    disabled={processingAction}
                                  />
                                  <div className="form-req-text">
                                    <strong>{req.label}</strong>
                                    <span>{req.note}</span>
                                  </div>
                                  <span className="req-status-pill">
                                    {isChecked
                                      ? "Received at School"
                                      : "Missing Hardcopy"}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Step 2: Record Initial Tuition / Downpayment */}
                        <div style={{ marginBottom: "20px" }}>
                          <strong
                            style={{
                              display: "block",
                              fontSize: "0.9rem",
                              color: "#3d1d2e",
                              marginBottom: "8px",
                            }}
                          >
                            Step 2: Record Initial Tuition / Downpayment Paid at
                            School
                          </strong>

                          <div
                            className="soa-breakdown-list"
                            style={{ marginBottom: "12px" }}
                          >
                            <div className="soa-row">
                              <span>Guardian&apos;s Selected Payment Plan</span>
                              <strong>
                                {formatPlanName(
                                  selectedPendingStudent.payment_plan
                                )}
                              </strong>
                            </div>
                            <div className="soa-row">
                              <span>
                                Required Initial Payment Upon Enrollment
                              </span>
                              <strong>
                                {formatPeso(
                                  selectedPendingStudent.billing
                                    .downpayment_required
                                )}
                              </strong>
                            </div>
                            <div className="soa-row paid-row">
                              <span>Verified Amount Paid at School</span>
                              <strong>
                                {formatPeso(
                                  selectedPendingStudent.billing.amount_paid
                                )}
                              </strong>
                            </div>
                          </div>

                          {!dpPaid && (
                            <form
                              className="inline-payment-box"
                              onSubmit={(e) =>
                                handleRecordPaymentForStudent(
                                  e,
                                  selectedPendingStudent
                                )
                              }
                            >
                              <div className="form-two-col">
                                <div className="field">
                                  <label>Payment Description</label>
                                  <div className="input-wrap">
                                    <input
                                      type="text"
                                      required
                                      value={payDescription}
                                      onChange={(e) =>
                                        setPayDescription(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="field">
                                  <label>Amount Paid (PHP)</label>
                                  <div className="input-wrap">
                                    <input
                                      type="number"
                                      step="0.01"
                                      required
                                      value={payAmount}
                                      onChange={(e) =>
                                        setPayAmount(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="form-two-col">
                                <div className="field">
                                  <label>Payment Mode</label>
                                  <select
                                    className="form-select"
                                    value={payChannel}
                                    onChange={(e) =>
                                      setPayChannel(e.target.value)
                                    }
                                  >
                                    <option value="Cash at LKA School Cashier">
                                      Cash at LKA School Cashier
                                    </option>
                                  </select>
                                </div>
                                <div className="field">
                                  <label>
                                    Physical OR Booklet No. (Issued at School)
                                  </label>
                                  <div className="input-wrap">
                                    <input
                                      type="text"
                                      placeholder="e.g. Physical OR #04820"
                                      value={payRef}
                                      onChange={(e) =>
                                        setPayRef(e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="register-switch-btn"
                                disabled={processingAction}
                              >
                                + Confirm Downpayment &amp; Issue Physical OR
                              </button>
                            </form>
                          )}
                        </div>

                        {/* Step 3: Officially Enroll Student */}
                        <div className="enroll-assessment-box">
                          <div className="assessment-header">
                            <IconShield size={16} />
                            <strong>
                              Step 3: Registrar Official Enrollment Approval
                            </strong>
                          </div>
                          <div className="assessment-rows">
                            <div className="assessment-row">
                              <span>Physical Requirements Status:</span>
                              <strong
                                className={
                                  allReqsDone ? "text-green" : "text-pink"
                                }
                              >
                                {allReqsDone
                                  ? "Complete (All Hardcopies Received)"
                                  : "Incomplete (Waiting for Hardcopies)"}
                              </strong>
                            </div>
                            <div className="assessment-row">
                              <span>Tuition / Downpayment Status:</span>
                              <strong
                                className={dpPaid ? "text-green" : "text-pink"}
                              >
                                {dpPaid
                                  ? "Paid & Verified"
                                  : `Unpaid (Requires ${formatPeso(
                                      selectedPendingStudent.billing
                                        .downpayment_required
                                    )})`}
                              </strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="login-btn"
                            style={{ marginTop: "12px" }}
                            disabled={!canEnroll || processingAction}
                            onClick={() =>
                              handleApproveEnrollment(selectedPendingStudent)
                            }
                          >
                            {canEnroll
                              ? allReqsDone
                                ? `Officially Enroll ${selectedPendingStudent.student_name} & Unlock Student Portal →`
                                : `Enroll ${selectedPendingStudent.student_name} (Missing Requirements To Follow) →`
                              : "Complete Step 2 (Payment) to Enroll"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: BILLING DUE LIST & EMAIL PAYMENT REMINDERS ==================== */}
        {activeTab === "reminders" && (
          <div className="portal-tab-content">
            <div className="portal-two-col">
              {/* Left: Students with Remaining Balance / Upcoming Due Dates */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalendar size={19} />
                  </span>
                  <div>
                    <h3>
                      Unpaid / Upcoming Exam &amp; Installment Due ({dueStudents.length})
                    </h3>
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <button
                    type="button"
                    className="login-btn"
                    onClick={handleSendBulkReminders}
                    disabled={processingAction || dueStudents.length === 0}
                  >
                    <IconMail size={16} /> Send Email &amp; Portal Reminders to
                    All {dueStudents.length} Eligible Student(s) →
                  </button>
                </div>

                {/* Grade Level Filter Tabs + Search Bar */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  {[
                    "All Grades",
                    "Kinder 1",
                    "Kinder 2",
                    "Grade 1",
                    "Grade 2",
                    "Grade 3",
                    "Grade 4",
                    "Grade 5",
                    "Grade 6",
                  ].map((g) => {
                    const count =
                      g === "All Grades"
                        ? dueStudents.length
                        : dueStudents.filter((s) => s.grade_level === g).length;
                    const active = reminderGradeFilter === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setReminderGradeFilter(g)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: active
                            ? "1px solid #db2777"
                            : "1px solid #e5e7eb",
                          background: active ? "#db2777" : "#ffffff",
                          color: active ? "#ffffff" : "#374151",
                        }}
                      >
                        {g === "All Grades" ? "All" : g} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="input-wrap" style={{ marginBottom: "14px" }}>
                  <input
                    type="text"
                    placeholder="Search student name, ID, guardian, or email..."
                    value={reminderSearch}
                    onChange={(e) => setReminderSearch(e.target.value)}
                  />
                </div>

                <div className="promissory-list">
                  {filteredDueStudents.length === 0 ? (
                    <p className="empty-table-note">
                      No unpaid students found for{" "}
                      <strong>{reminderGradeFilter}</strong>
                      {reminderSearch.trim()
                        ? ` matching "${reminderSearch.trim()}"`
                        : ""}
                      .
                    </p>
                  ) : (
                    filteredDueStudents.map((stu) => {
                    const nextDue = stu.billing.schedule.find(
                      (item) => item.status !== "Paid"
                    );
                    const latestRem =
                      stu.payment_reminders && stu.payment_reminders.length > 0
                        ? stu.payment_reminders[0]
                        : null;
                    return (
                      <div key={stu.id} className="promissory-card">
                        <div className="promissory-card-top">
                          <strong>
                            {stu.student_name} ({stu.grade_level})
                          </strong>
                          <span className="sched-badge due">
                            Balance: {formatPeso(stu.billing.remaining_balance)}
                          </span>
                        </div>
                        <p>
                          Guardian: <strong>{stu.parent_guardian_name}</strong>{" "}
                          ({stu.email})
                        </p>
                        {nextDue && (
                          <p>
                            Next Due: <strong>{nextDue.title}</strong> ·{" "}
                            <strong>{formatPeso(nextDue.amount)}</strong> (
                            {nextDue.due_date})
                          </p>
                        )}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginTop: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <small>
                            {latestRem
                              ? `Last Reminder Sent: ${latestRem.sent_at}`
                              : "No reminder sent yet"}
                          </small>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {latestRem && (
                              <button
                                type="button"
                                className="step-back-btn"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.76rem",
                                }}
                                onClick={() => setPreviewReminder(latestRem)}
                              >
                                Preview Reminder
                              </button>
                            )}
                            <button
                              type="button"
                              className="table-pay-btn"
                              onClick={() => handleSendSingleReminder(stu)}
                              disabled={processingAction}
                            >
                              Send Email &amp; Portal Reminder
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </div>

              {/* Right: Live Email Notification Preview */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalculator size={19} />
                  </span>
                  <div>
                    <h3>Student / Parent Payment Reminder Preview</h3>
                  </div>
                </div>

                {previewReminder ? (
                  <div className="email-preview-box">
                    <div className="email-preview-meta">
                      <div>
                        <span>From:</span>{" "}
                        <strong>
                          Lyceum ng Kabataan Academy Billing
                          &lt;lyceumbilling2026@gmail.com&gt;
                        </strong>
                      </div>
                      <div>
                        <span>To:</span>{" "}
                        <strong>{previewReminder.recipient_email}</strong>
                      </div>
                      <div>
                        <span>Subject:</span>{" "}
                        <strong>{previewReminder.subject}</strong>
                      </div>
                      <div>
                        <span>Sent Timestamp:</span>{" "}
                        <strong>{previewReminder.sent_at}</strong>
                      </div>
                    </div>
                    <pre className="email-preview-body">
                      {previewReminder.message_body}
                    </pre>
                  </div>
                ) : (
                  <p className="empty-table-note">
                    Click <strong>Preview Reminder</strong> or{" "}
                    <strong>Send Payment Reminder</strong> on any student to
                    view the reminder message.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: PROMISSORY NOTES & EXAM PERMIT CLEARANCE ==================== */}
        {activeTab === "promissory" && (
          <div className="portal-tab-content">
            <div className="portal-two-col">
              {/* Left: Digital Promissory Note Approval Queue */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCalendar size={19} />
                  </span>
                  <div>
                    <h3>
                      Digital Promissory Note Approval Queue (
                      {allPromissoryNotes.length})
                    </h3>
                  </div>
                </div>

                {allPromissoryNotes.length === 0 ? (
                  <p className="empty-table-note">
                    No promissory notes filed by parents yet.
                  </p>
                ) : (
                  <div className="promissory-list">
                    {allPromissoryNotes.map((pn) => {
                      const isApproved = pn.status.includes("Approved");
                      const isSettled = pn.status.includes("Settled");
                      return (
                        <div key={pn.id} className="promissory-card">
                          <div className="promissory-card-top">
                            <strong>
                              {pn.student_name} ({pn.student_id_no} ·{" "}
                              {pn.grade_level})
                            </strong>
                            <span
                              className={`sched-badge ${
                                isApproved || isSettled ? "paid" : "due"
                              }`}
                            >
                              {pn.status}
                            </span>
                          </div>
                          <p>
                            <strong>{pn.exam_quarter}</strong> · Permit Code:{" "}
                            <strong>{pn.permit_code}</strong>
                          </p>
                          <p>
                            Guardian: <strong>{pn.guardian_name}</strong> (
                            {pn.guardian_phone} · {pn.guardian_email})
                          </p>
                          <p>
                            Amount Covered:{" "}
                            <strong>{formatPeso(pn.amount_covered)}</strong> ·
                            Promised Settlement Date:{" "}
                            <strong>{pn.promised_date}</strong> · Late Penalty:{" "}
                            <strong>₱0.00</strong>
                          </p>
                          <p>Reason: {pn.reason}</p>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "10px",
                              marginTop: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <small>
                              Filed: {pn.submitted_at}
                              {pn.approved_at
                                ? ` · Approved: ${pn.approved_at}`
                                : ""}
                            </small>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {!isApproved && !isSettled && (
                                <button
                                  type="button"
                                  className="table-pay-btn"
                                  onClick={() =>
                                    handleUpdatePromissoryStatus(
                                      pn.id,
                                      "Approved — Exam Permit Granted"
                                    )
                                  }
                                  disabled={processingAction}
                                >
                                  Approve &amp; Grant Exam Permit
                                </button>
                              )}
                              {!isSettled && (
                                <button
                                  type="button"
                                  className="step-back-btn"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "0.76rem",
                                  }}
                                  onClick={() =>
                                    handleUpdatePromissoryStatus(
                                      pn.id,
                                      "Settled & Cleared"
                                    )
                                  }
                                  disabled={processingAction}
                                >
                                  Mark as Settled
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Live Periodical Exam Clearance & Delinquency Risk Masterlist */}
              <div className="portal-panel-card">
                <div className="panel-card-header">
                  <span className="panel-header-icon">
                    <IconCheck size={19} />
                  </span>
                  <div>
                    <h3>
                      Periodical Exam Clearance &amp; Delinquency Tracker
                    </h3>
                  </div>
                </div>

                <div className="schedule-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Student &amp; Section</th>
                        <th>Permit Code</th>
                        <th>Delinquency Tracker</th>
                        <th>Exam Clearance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolledStudents.map((stu) => (
                        <tr key={stu.id}>
                          <td>
                            <strong>{stu.student_name}</strong>
                            <span className="table-subtext">
                              {stu.student_id_no} · {stu.grade_level} (
                              {stu.assigned_section})
                            </span>
                          </td>
                          <td>
                            <span className="or-badge">
                              {stu.exam_permit_code || `LKA-EXM-${stu.id}`}
                            </span>
                          </td>
                          <td>
                            <strong>
                              {stu.delinquency_risk || "Good Standing"}
                            </strong>
                            <span className="table-subtext">
                              Balance: {formatPeso(stu.billing.remaining_balance)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`sched-badge ${
                                (stu.exam_clearance || "").includes("CLEARED")
                                  ? "paid"
                                  : "due"
                              }`}
                            >
                              {stu.exam_clearance || "CLEARED FOR EXAM"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
