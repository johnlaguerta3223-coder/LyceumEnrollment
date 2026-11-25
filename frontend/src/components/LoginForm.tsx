import { API_BASE } from "../api";
import React, { useState } from "react";
import axios from "axios";
import {
  IconCalculator,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconClock,
  IconKey,
  IconLock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconSchool,
  IconShield,
  IconSun,
  IconUser,
  IconUsers,
} from "./Icons";

type Status = { type: "success" | "error"; text: string } | null;
type UserRole = "parent" | "registrar" | "admin";
type AuthView =
  | "login"
  | "register"
  | "registered_slip"
  | "forgot"
  | "forgot_username";
type StudentType = "new" | "old" | "transferee";
type PaymentPlanKey = "cash" | "quarterly" | "monthly";

interface LoginFormProps {
  initialView?: "login" | "register";
  onBackToHome?: () => void;
  onLoginSuccess?: (token: string, role: UserRole) => void;
}

interface GradeSlotMeta {
  label: string;
  group: string;
  morningSchedule: string;
  afternoonSchedule: string;
  morningSlotsLeft: number;
  afternoonSlotsLeft: number;
  oldCashTotal: number;
  newCashTotal: number;
  oldSubTotal: number;
  newSubTotal: number;
  oldDownpayment: number;
  newDownpayment: number;
  oldMonthly: number;
  newMonthly: number;
  oldQuarterly: number;
  newQuarterly: number;
}

const GRADE_META: Record<string, GradeSlotMeta> = {
  "Kinder 1": {
    label: "Kinder 1",
    group: "Pre-School",
    morningSchedule: "7:00 AM – 9:30 AM",
    afternoonSchedule: "12:00 NN – 2:30 PM",
    morningSlotsLeft: 4, // 16/20 enrolled
    afternoonSlotsLeft: 5, // 15/20 enrolled
    oldCashTotal: 17081.46,
    newCashTotal: 17775.82,
    oldSubTotal: 18979.44,
    newSubTotal: 19570.0,
    oldDownpayment: 5399.52,
    newDownpayment: 5399.5,
    oldMonthly: 1357.99,
    newMonthly: 1417.05,
    oldQuarterly: 3394.98,
    newQuarterly: 3542.63,
  },
  "Kinder 2": {
    label: "Kinder 2",
    group: "Pre-School",
    morningSchedule: "7:00 AM – 9:30 AM",
    afternoonSchedule: "12:00 NN – 2:30 PM",
    morningSlotsLeft: 2, // 28/30 enrolled
    afternoonSlotsLeft: 6, // 24/30 enrolled
    oldCashTotal: 17081.46,
    newCashTotal: 17775.82,
    oldSubTotal: 18979.44,
    newSubTotal: 19570.0,
    oldDownpayment: 5399.52,
    newDownpayment: 5399.5,
    oldMonthly: 1357.99,
    newMonthly: 1417.05,
    oldQuarterly: 3394.98,
    newQuarterly: 3542.63,
  },
  "Grade 1": {
    label: "Grade 1",
    group: "Primary",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 13, // 47/60 enrolled (2 sections)
    afternoonSlotsLeft: 13, // 47/60 enrolled (2 sections)
    oldCashTotal: 21233.7,
    newCashTotal: 21802.95,
    oldSubTotal: 23593.0,
    newSubTotal: 24225.5,
    oldDownpayment: 7155.5,
    newDownpayment: 7155.5,
    oldMonthly: 1643.75,
    newMonthly: 1707.0,
    oldQuarterly: 4109.38,
    newQuarterly: 4267.5,
  },
  "Grade 2": {
    label: "Grade 2",
    group: "Primary",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 8, // 52/60 enrolled
    afternoonSlotsLeft: 10, // 50/60 enrolled
    oldCashTotal: 21233.7,
    newCashTotal: 21802.95,
    oldSubTotal: 23593.0,
    newSubTotal: 24225.5,
    oldDownpayment: 7155.5,
    newDownpayment: 7155.5,
    oldMonthly: 1643.75,
    newMonthly: 1707.0,
    oldQuarterly: 4109.38,
    newQuarterly: 4267.5,
  },
  "Grade 3": {
    label: "Grade 3",
    group: "Primary",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 12, // 48/60 enrolled
    afternoonSlotsLeft: 12, // 48/60 enrolled
    oldCashTotal: 21233.7,
    newCashTotal: 21802.95,
    oldSubTotal: 23593.0,
    newSubTotal: 24225.5,
    oldDownpayment: 7155.5,
    newDownpayment: 7155.5,
    oldMonthly: 1643.75,
    newMonthly: 1707.0,
    oldQuarterly: 4109.38,
    newQuarterly: 4267.5,
  },
  "Grade 4": {
    label: "Grade 4",
    group: "Intermediate",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 15, // 45/60 enrolled
    afternoonSlotsLeft: 13, // 47/60 enrolled
    oldCashTotal: 23065.65,
    newCashTotal: 23342.22,
    oldSubTotal: 25628.5,
    newSubTotal: 25936.0,
    oldDownpayment: 7551.5,
    newDownpayment: 7155.5,
    oldMonthly: 1807.7,
    newMonthly: 1878.05,
    oldQuarterly: 4519.25,
    newQuarterly: 4695.13,
  },
  "Grade 5": {
    label: "Grade 5",
    group: "Intermediate",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 3, // 57/60 enrolled (2 Morning sections)
    afternoonSlotsLeft: 2, // 28/30 enrolled (1 Afternoon section)
    oldCashTotal: 23065.65,
    newCashTotal: 23342.22,
    oldSubTotal: 25628.5,
    newSubTotal: 25936.0,
    oldDownpayment: 7551.5,
    newDownpayment: 7155.5,
    oldMonthly: 1807.7,
    newMonthly: 1878.05,
    oldQuarterly: 4519.25,
    newQuarterly: 4695.13,
  },
  "Grade 6": {
    label: "Grade 6",
    group: "Intermediate",
    morningSchedule: "7:00 AM – 12:00 NN",
    afternoonSchedule: "12:00 NN – 5:00 PM",
    morningSlotsLeft: 12, // 48/60 enrolled
    afternoonSlotsLeft: 9, // 51/60 enrolled
    oldCashTotal: 23065.65,
    newCashTotal: 23342.22,
    oldSubTotal: 25628.5,
    newSubTotal: 25936.0,
    oldDownpayment: 7551.5,
    newDownpayment: 7155.5,
    oldMonthly: 1807.7,
    newMonthly: 1878.05,
    oldQuarterly: 4519.25,
    newQuarterly: 4695.13,
  },
};

const GRADE_LEVELS = Object.keys(GRADE_META);

const REQUIREMENTS_BY_TYPE: Record<
  StudentType,
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
      note: "For School ID / RFID card renewal",
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

const ROLE_INFO: Record<
  UserRole,
  {
    label: string;
    icon: React.ReactNode;
    badge: string;
    title: string;
    subtitle: string;
    placeholder: string;
    sideTitle: string;
    sideDesc: string;
    perks: string[];
  }
> = {
  parent: {
    label: "Student",
    icon: <IconSchool size={16} />,
    badge: "Lyceum ng Kabataan Academy, Inc.",
    title: "Login",
    subtitle: "Enter your account details",
    placeholder: "Email Address",
    sideTitle: "student portal",
    sideDesc: "Login to access your account",
    perks: [],
  },
  registrar: {
    label: "Registrar",
    icon: <IconClipboard size={16} />,
    badge: "Lyceum ng Kabataan Academy, Inc.",
    title: "Login",
    subtitle: "Enter your registrar account details",
    placeholder: "registrar@lyceum.edu.ph",
    sideTitle: "registrar portal",
    sideDesc: "Login to access student records and clearances",
    perks: [],
  },
  admin: {
    label: "Admin",
    icon: <IconShield size={16} />,
    badge: "Lyceum ng Kabataan Academy, Inc.",
    title: "Login",
    subtitle: "Enter your administrator account details",
    placeholder: "admin@lyceum.edu.ph",
    sideTitle: "admin portal",
    sideDesc: "Login to manage school operations and billing",
    perks: [],
  },
};

export default function LoginForm({
  initialView = "login",
  onBackToHome,
  onLoginSuccess,
}: LoginFormProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [selectedRole, setSelectedRole] = useState<UserRole>("parent");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 3-Step Registration & Online Enrollment Form state
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [studentType, setStudentType] = useState<StudentType>("new");
  const [gradeLevel, setGradeLevel] = useState("Kinder 1");
  const [classShift, setClassShift] = useState<"morning" | "afternoon">(
    "morning"
  );
  const [studentName, setStudentName] = useState("");
  const [studentLrn, setStudentLrn] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("Female");
  const [previousSchool, setPreviousSchool] = useState("");

  // Step 2: Parent / Guardian & Requirements Checklist
  const [parentName, setParentName] = useState("");
  const [relationship, setRelationship] = useState("Mother");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3: Payment Plan & Account Credentials
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlanKey>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<"cash">("cash");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot Password state
  const [fpEmail, setFpEmail] = useState("");
  const [fpPhone, setFpPhone] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [showFpPassword, setShowFpPassword] = useState(false);

  // Forgot Username state
  const [fuName, setFuName] = useState("");
  const [fuPhone, setFuPhone] = useState("");
  const [foundAccount, setFoundAccount] = useState<{
    username: string;
    student_name: string;
    student_id_no: string;
    enrollment_status: string;
  } | null>(null);

  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [registeredSlip, setRegisteredSlip] = useState<{
    student_id_no: string;
    student_name: string;
    student_type: StudentType;
    grade_level: string;
    assigned_section: string;
    payment_plan: PaymentPlanKey;
    downpayment_required: number;
    total_assessment: number;
    email: string;
  } | null>(null);

  const switchView = (nextView: AuthView) => {
    setStatus(null);
    if (nextView === "register") {
      setRegStep(1);
    }
    setView(nextView);
  };

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setStatus(null);
  };

  const handleStudentTypeChange = (nextType: StudentType) => {
    setStudentType(nextType);
  };

  const handleNextStep = () => {
    setStatus(null);
    if (regStep === 1) {
      if (!studentName.trim()) {
        setStatus({
          type: "error",
          text: "Please enter the student's full name before proceeding.",
        });
        return;
      }
      if (!birthdate) {
        setStatus({
          type: "error",
          text: "Please select the student's date of birth.",
        });
        return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      if (!parentName.trim()) {
        setStatus({
          type: "error",
          text: "Please enter the parent or guardian's full name.",
        });
        return;
      }
      if (!phone.trim()) {
        setStatus({
          type: "error",
          text: "Please enter a valid mobile number for school notifications.",
        });
        return;
      }
      if (!address.trim()) {
        setStatus({
          type: "error",
          text: "Please enter your complete home address.",
        });
        return;
      }
      setRegStep(3);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await axios.post(`${API_BASE}/api/auth/login`, body);
      const accountRole: UserRole = res.data.role || "parent";

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user_role", accountRole);
      localStorage.setItem("user_name", res.data.name || "");

      if (onLoginSuccess) {
        onLoginSuccess(res.data.access_token, accountRole);
        return;
      }

      setStatus({
        type: "success",
        text: `Login successful! Welcome, ${res.data.name} (${ROLE_INFO[accountRole].label}).`,
      });
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      if (typeof serverDetail === "string" && serverDetail.trim()) {
        setStatus({
          type: "error",
          text: serverDetail,
        });
      } else if (err.response?.status === 401) {
        setStatus({
          type: "error",
          text: "Wrong email or password. Please try again.",
        });
      } else {
        setStatus({
          type: "error",
          text: "Cannot connect to server. Please check if the backend is running.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (regPassword.length < 6) {
      setStatus({
        type: "error",
        text: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (regPassword !== confirmPassword) {
      setStatus({
        type: "error",
        text: "Passwords do not match. Please check again.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, {
        parent_name: parentName,
        student_name: studentName,
        student_lrn: studentLrn,
        student_type: studentType,
        grade_level: gradeLevel,
        class_shift: classShift,
        birthdate,
        gender,
        address,
        relationship_to_student: relationship,
        previous_school: previousSchool,
        payment_plan: paymentPlan,
        payment_method: paymentMethod,
        requirements_submitted: [],
        email: regEmail,
        phone,
        password: regPassword,
      });

      setRegisteredSlip({
        student_id_no: res.data.student_id_no || "LKA-2026-0652",
        student_name: res.data.student_name || studentName,
        student_type: (res.data.student_type || studentType) as StudentType,
        grade_level: res.data.grade_level || gradeLevel,
        assigned_section: res.data.assigned_section || "Section 1 (Morning)",
        payment_plan: (res.data.payment_plan || paymentPlan) as PaymentPlanKey,
        downpayment_required: res.data.downpayment_required || 7155.5,
        total_assessment: res.data.total_assessment || 20462.5,
        email: res.data.email || regEmail,
      });
      setEmail(regEmail);
      setPassword("");
      setSelectedRole("parent");
      setView("registered_slip");
      setStatus(null);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setStatus({
        type: "error",
        text:
          typeof detail === "string"
            ? detail
            : "Registration failed. Please check your details and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (fpNewPassword.length < 6) {
      setStatus({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (fpNewPassword !== fpConfirmPassword) {
      setStatus({
        type: "error",
        text: "New passwords do not match. Please check again.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/forgot-password`,
        {
          email: fpEmail,
          phone: fpPhone,
          new_password: fpNewPassword,
        }
      );

      setEmail(fpEmail);
      setPassword("");
      setView("login");
      setStatus({
        type: "success",
        text:
          res.data?.message ||
          "Password reset successful! You can now log in with your new password.",
      });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setStatus({
        type: "error",
        text:
          typeof detail === "string"
            ? detail
            : "Could not reset password. Please check your email and mobile number.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setFoundAccount(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/forgot-username`, {
        student_name: fuName,
        phone: fuPhone,
      });
      setFoundAccount(res.data);
      setStatus({
        type: "success",
        text: "Account found! Your registered username is shown below.",
      });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setStatus({
        type: "error",
        text:
          typeof detail === "string"
            ? detail
            : "No account found matching that name and mobile number.",
      });
    } finally {
      setLoading(false);
    }
  };

  const roleMeta = ROLE_INFO[selectedRole];
  const currentGradeMeta = GRADE_META[gradeLevel] || GRADE_META["Kinder 1"];
  const isOldStudent = studentType === "old";

  const activeDownpayment =
    paymentPlan === "cash"
      ? isOldStudent
        ? currentGradeMeta.oldCashTotal
        : currentGradeMeta.newCashTotal
      : isOldStudent
      ? currentGradeMeta.oldDownpayment
      : currentGradeMeta.newDownpayment;

  const activeInstallment =
    paymentPlan === "cash"
      ? 0
      : paymentPlan === "quarterly"
      ? isOldStudent
        ? currentGradeMeta.oldQuarterly
        : currentGradeMeta.newQuarterly
      : isOldStudent
      ? currentGradeMeta.oldMonthly
      : currentGradeMeta.newMonthly;

  const activeTotalAnnual =
    paymentPlan === "cash"
      ? isOldStudent
        ? currentGradeMeta.oldCashTotal
        : currentGradeMeta.newCashTotal
      : isOldStudent
      ? currentGradeMeta.oldSubTotal
      : currentGradeMeta.newSubTotal;

  const activeRequirementsList = REQUIREMENTS_BY_TYPE[studentType];

  const particleSpecs = Array.from({ length: 75 }, (_, i) => ({
    id: i,
    left: `${(i * 29 + (i % 7) * 13) % 97}%`,
    top: `${(i * 43 + (i % 5) * 17) % 96}%`,
    size: 3 + (i % 4) * 2.5,
    delay: `${((i * 0.18) % 2.8).toFixed(2)}s`,
    duration: `${(2.2 + (i % 5) * 0.55).toFixed(2)}s`,
  }));

  return (
    <div className="hoa-login-split">
      {/* ================= LEFT 50%: ANIMATED PARTICLE BRAND PANEL (HOA STYLE) ================= */}
      <aside className="hoa-brand-side">
        <div className="hoa-particles-layer" aria-hidden="true">
          {particleSpecs.map((p) => (
            <span
              key={p.id}
              className="hoa-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        <div className="hoa-brand-center smooth-fade-slide">
          <img
            src="/logo.jpg"
            alt="Lyceum ng Kabataan Academy Seal"
            className="hoa-brand-logo"
          />
          <h1 className="hoa-brand-title">LYCEUM</h1>
          <p className="hoa-brand-sub">SCHOOL ENROLLMENT &amp; BILLING SYSTEM</p>
        </div>
      </aside>

      {/* ================= RIGHT 50%: CLEAN CENTERED FORM PANEL (HOA STYLE) ================= */}
      <main className="hoa-form-side">
        {view === "login" && (
          <div className="hoa-login-card smooth-fade-slide">
            <div className="hoa-card-body">
              <div className="hoa-eyebrow">
                <IconSchool size={14} />
                <span>WELCOME BACK</span>
              </div>
              <h2 className="hoa-card-title">Hello again!</h2>
              <p className="hoa-card-sub">
                Sign in to continue to your account.
              </p>

              <form onSubmit={handleLoginSubmit} className="hoa-form">
                <div className="hoa-field">
                  <div className="hoa-label-row">
                    <label htmlFor="email">
                      <IconMail size={14} />
                      <span>Username</span>
                    </label>
                    <button
                      type="button"
                      className="forgot-link-btn"
                      onClick={() => {
                        setFoundAccount(null);
                        switchView("forgot_username");
                      }}
                    >
                      Forgot username?
                    </button>
                  </div>
                  <input
                    id="email"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Enter username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="hoa-field">
                  <div className="hoa-label-row">
                    <label htmlFor="password">
                      <IconLock size={14} />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      className="forgot-link-btn"
                      onClick={() => {
                        setFpEmail(email);
                        switchView("forgot");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-wrap">
                    <input
                      id="password"
                      className="has-toggle"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Signing in..." : "Login →"}
                </button>
              </form>

              {status && (
                <div className={`alert ${status.type}`}>{status.text}</div>
              )}
            </div>

            <div className="hoa-card-footer">
              <span>Don&apos;t have a student account?</span>
              <button
                type="button"
                className="hoa-register-link"
                onClick={() => switchView("register")}
              >
                Enroll Now
              </button>
            </div>
          </div>
        )}

          {view === "register" && (
            /* ================= 3-STEP ONLINE ENROLLMENT & REGISTER VIEW ================= */
            <div className="auth-card-inner enroll-form-card">
              <div className="auth-header-block">
                <span className="auth-step-tag">
                  S.Y. 2026–2027 Online Enrollment Form
                </span>
                <h2>Student Enrollment &amp; Parent Registration</h2>
                <p className="subtitle">
                  Step {regStep} of 3:{" "}
                  {regStep === 1
                    ? "Enter Student Information & Choose Class Shift"
                    : regStep === 2
                    ? "Enter Parent/Guardian Details & Check School Requirements"
                    : "Choose Payment Plan & Create Student Portal Account"}
                </p>

                {/* Step Progress Bar */}
                <div className="enroll-stepper">
                  <button
                    type="button"
                    className={`stepper-item ${regStep >= 1 ? "active" : ""} ${
                      regStep > 1 ? "completed" : ""
                    }`}
                    onClick={() => setRegStep(1)}
                  >
                    <span className="stepper-num">
                      {regStep > 1 ? "✓" : "1"}
                    </span>
                    <span>Step 1: Student Info</span>
                  </button>
                  <div className="stepper-line" />
                  <button
                    type="button"
                    className={`stepper-item ${regStep >= 2 ? "active" : ""} ${
                      regStep > 2 ? "completed" : ""
                    }`}
                    onClick={() => {
                      if (studentName.trim() && birthdate) setRegStep(2);
                    }}
                  >
                    <span className="stepper-num">
                      {regStep > 2 ? "✓" : "2"}
                    </span>
                    <span>Step 2: Guardian &amp; Reqs</span>
                  </button>
                  <div className="stepper-line" />
                  <button
                    type="button"
                    className={`stepper-item ${regStep === 3 ? "active" : ""}`}
                    onClick={() => {
                      if (
                        studentName.trim() &&
                        birthdate &&
                        parentName.trim() &&
                        phone.trim()
                      ) {
                        setRegStep(3);
                      }
                    }}
                  >
                    <span className="stepper-num">3</span>
                    <span>Step 3: Plan &amp; Account</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                {/* ==================== STEP 1: STUDENT INFO & SHIFT ==================== */}
                {regStep === 1 && (
                  <div className="enroll-step-pane">
                    <div className="field">
                      <label>1. Student Enrollment Type</label>
                      <div className="student-type-pills">
                        {(
                          [
                            { key: "new", label: "New Student" },
                            { key: "old", label: "Old Student (LKA)" },
                            { key: "transferee", label: "Transferee" },
                          ] as { key: StudentType; label: string }[]
                        ).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className={`type-pill-btn ${
                              studentType === item.key ? "active" : ""
                            }`}
                            onClick={() => handleStudentTypeChange(item.key)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {studentType === "old" && (
                      <div className="policy-reminder-box">
                        <IconClipboard size={16} />
                        <span>
                          <strong>LKA Old Student Policy:</strong> Please make
                          sure any unpaid tuition balance from last school year
                          is settled in full for Registrar clearance.
                        </span>
                      </div>
                    )}

                    <div className="form-two-col">
                      <div className="field">
                        <label htmlFor="grade-level">
                          Grade Level Applying For
                        </label>
                        <div className="input-wrap">
                          <select
                            id="grade-level"
                            className="form-select"
                            value={gradeLevel}
                            onChange={(e) => {
                              const grade = e.target.value;
                              setGradeLevel(grade);
                              const afternoonGrades = [
                                "Grade 4",
                                "Grade 5",
                                "Grade 6",
                              ];
                              setClassShift(
                                afternoonGrades.includes(grade)
                                  ? "afternoon"
                                  : "morning"
                              );
                            }}
                          >
                            {GRADE_LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl} ({GRADE_META[lvl].group})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="student-lrn">
                          LRN (12-Digit Learner Ref. No.)
                        </label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconClipboard size={17} />
                          </span>
                          <input
                            id="student-lrn"
                            type="text"
                            maxLength={12}
                            placeholder={
                              gradeLevel.startsWith("Kinder")
                                ? "Optional for Kinder"
                                : "e.g. 136498000123"
                            }
                            value={studentLrn}
                            onChange={(e) => setStudentLrn(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preferred Shift with Real-time Section Slot Availability */}
                    <div className="field">
                      <label>
                        Preferred Class Shift ({gradeLevel} Available Slots)
                      </label>
                      <div className="shift-select-grid">
                        <button
                          type="button"
                          className={`shift-option-card ${
                            classShift === "morning" ? "active" : ""
                          }`}
                          onClick={() => setClassShift("morning")}
                        >
                          <div className="shift-option-top">
                            <span className="shift-option-title">
                              <IconSun size={15} /> Morning Shift
                            </span>
                            <span className="slot-badge">
                              {currentGradeMeta.morningSlotsLeft} slots left
                            </span>
                          </div>
                          <strong>{currentGradeMeta.morningSchedule}</strong>
                        </button>

                        <button
                          type="button"
                          className={`shift-option-card ${
                            classShift === "afternoon" ? "active" : ""
                          }`}
                          onClick={() => setClassShift("afternoon")}
                        >
                          <div className="shift-option-top">
                            <span className="shift-option-title">
                              <IconClock size={15} /> Afternoon Shift
                            </span>
                            <span className="slot-badge">
                              {currentGradeMeta.afternoonSlotsLeft} slots left
                            </span>
                          </div>
                          <strong>{currentGradeMeta.afternoonSchedule}</strong>
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="student-name">
                        Student Full Name (Last Name, First Name, Middle Name)
                      </label>
                      <div className="input-wrap with-icon">
                        <span className="input-icon">
                          <IconSchool size={17} />
                        </span>
                        <input
                          id="student-name"
                          type="text"
                          required
                          placeholder="e.g. Dela Cruz, Juan Santos"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-two-col">
                      <div className="field">
                        <label htmlFor="birthdate">Date of Birth</label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconCalendar size={17} />
                          </span>
                          <input
                            id="birthdate"
                            type="date"
                            required
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="gender">Gender / Sex</label>
                        <div className="input-wrap">
                          <select
                            id="gender"
                            className="form-select"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {studentType === "transferee" && (
                      <div className="field">
                        <label htmlFor="prev-school">
                          Previous School Last Attended
                        </label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconSchool size={17} />
                          </span>
                          <input
                            id="prev-school"
                            type="text"
                            placeholder="Enter name of previous school"
                            value={previousSchool}
                            onChange={(e) => setPreviousSchool(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="login-btn"
                      onClick={handleNextStep}
                    >
                      Next: Parent Info &amp; Requirements →
                    </button>
                  </div>
                )}

                {/* ==================== STEP 2: PARENT DETAILS & REQUIREMENTS ==================== */}
                {regStep === 2 && (
                  <div className="enroll-step-pane">
                    <div className="form-two-col">
                      <div className="field">
                        <label htmlFor="parent-name">
                          Parent / Guardian Full Name
                        </label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconUser size={17} />
                          </span>
                          <input
                            id="parent-name"
                            type="text"
                            required
                            placeholder="e.g. Maria Santos Dela Cruz"
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="relationship">
                          Relationship to Student
                        </label>
                        <div className="input-wrap">
                          <select
                            id="relationship"
                            className="form-select"
                            value={relationship}
                            onChange={(e) => setRelationship(e.target.value)}
                          >
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Legal Guardian">
                              Legal Guardian
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="form-two-col">
                      <div className="field">
                        <label htmlFor="reg-phone">
                          Active Mobile Number (For SMS &amp; Reminders)
                        </label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconPhone size={17} />
                          </span>
                          <input
                            id="reg-phone"
                            type="tel"
                            required
                            placeholder="09171234567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="address">Complete Home Address</label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconMapPin size={17} />
                          </span>
                          <input
                            id="address"
                            type="text"
                            required
                            placeholder="Phase, Pkg, Blk, Lot, Brgy. Bagong Silang, Caloocan"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Required Physical Hardcopy Documents Guide */}
                    <div className="field">
                      <label>
                        Required Physical Documents to Bring to School (
                        {studentType === "new"
                          ? "New Student"
                          : studentType === "old"
                          ? "Old Student"
                          : "Transferee"}
                        )
                      </label>
                      <p className="field-helper-note">
                        <strong>Physical Submission Policy:</strong> Document
                        requirements cannot be uploaded online. Please bring the
                        physical hardcopies below in an envelope to the{" "}
                        <strong>
                          LKA Registrar Office (8:00 AM–12:00 NN &amp; 1:00 PM–5:00
                          PM)
                        </strong>{" "}
                        so the Registrar can verify and mark them as received in
                        your Student Portal:
                      </p>

                      <div className="form-req-checklist">
                        {activeRequirementsList.map((req) => (
                          <div key={req.id} className="form-req-item">
                            <div className="form-req-text">
                              <strong>{req.label}</strong>
                              <span>{req.note}</span>
                            </div>
                            <span className="req-status-pill">
                              Bring Hardcopy to School
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="step-btn-row">
                      <button
                        type="button"
                        className="step-back-btn"
                        onClick={() => setRegStep(1)}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        className="login-btn"
                        onClick={handleNextStep}
                      >
                        Next: Payment Plan &amp; Account →
                      </button>
                    </div>
                  </div>
                )}

                {/* ==================== STEP 3: PAYMENT PLAN & CREDENTIALS ==================== */}
                {regStep === 3 && (
                  <div className="enroll-step-pane">
                    <div className="field">
                      <label>Select Preferred Tuition Payment Plan</label>
                      <div className="student-type-pills">
                        {(
                          [
                            {
                              key: "monthly",
                              label: "Monthly (10 Months)",
                            },
                            {
                              key: "quarterly",
                              label: "Quarterly (4 Exams)",
                            },
                            {
                              key: "cash",
                              label: "Full Cash (10% Off)",
                            },
                          ] as { key: PaymentPlanKey; label: string }[]
                        ).map((plan) => (
                          <button
                            key={plan.key}
                            type="button"
                            className={`type-pill-btn ${
                              paymentPlan === plan.key ? "active" : ""
                            }`}
                            onClick={() => setPaymentPlan(plan.key)}
                          >
                            {plan.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="payment-method">
                        Preferred Mode of Payment
                      </label>
                      <div className="input-wrap">
                        <select
                          id="payment-method"
                          className="form-select"
                          value={paymentMethod}
                          onChange={(e) =>
                            setPaymentMethod(e.target.value as "cash")
                          }
                        >
                          <option value="cash">
                            Cash at School Cashier (Onsite Payment)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Live Tuition & Downpayment Assessment Box */}
                    <div className="enroll-assessment-box">
                      <div className="assessment-header">
                        <IconCalculator size={17} />
                        <strong>
                          Official Tuition Assessment ({gradeLevel} ·{" "}
                          {isOldStudent ? "Old Student" : "New / Transferee"})
                        </strong>
                      </div>
                      <div className="assessment-rows">
                        <div className="assessment-row">
                          <span>Total Annual Assessment:</span>
                          <strong>{formatPeso(activeTotalAnnual)}</strong>
                        </div>
                        <div className="assessment-row highlight-row">
                          <span>
                            {paymentPlan === "cash"
                              ? "Amount Due Upon Enrollment (with 10% Off):"
                              : "Minimum Downpayment Upon Enrollment (Misc Fee):"}
                          </span>
                          <strong>{formatPeso(activeDownpayment)}</strong>
                        </div>
                        {paymentPlan !== "cash" && (
                          <div className="assessment-row">
                            <span>
                              {paymentPlan === "quarterly"
                                ? "Quarterly Installment (Aug, Oct, Jan, Mar):"
                                : "Monthly Installment (June – March, 15th–30th):"}
                            </span>
                            <strong>
                              {formatPeso(activeInstallment)} /{" "}
                              {paymentPlan === "quarterly"
                                ? "quarter"
                                : "month"}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="reg-email">
                        Parent&apos;s Personal Gmail / Email (For Live Payment Reminders)
                      </label>
                      <div className="input-wrap with-icon">
                        <span className="input-icon">
                          <IconMail size={17} />
                        </span>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          placeholder="parent@email.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-two-col">
                      <div className="field">
                        <label htmlFor="reg-password">Create Password</label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconLock size={17} />
                          </span>
                          <input
                            id="reg-password"
                            className="has-toggle"
                            type={showRegPassword ? "text" : "password"}
                            required
                            placeholder="Min. 6 characters"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="toggle-btn"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                          >
                            {showRegPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="confirm-password">
                          Confirm Password
                        </label>
                        <div className="input-wrap with-icon">
                          <span className="input-icon">
                            <IconLock size={17} />
                          </span>
                          <input
                            id="confirm-password"
                            type={showRegPassword ? "text" : "password"}
                            required
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="step-btn-row">
                      <button
                        type="button"
                        className="step-back-btn"
                        onClick={() => setRegStep(2)}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading
                          ? "Submitting Enrollment..."
                          : "Submit Enrollment & Create Account →"}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {status && (
                <div className={`alert ${status.type}`}>{status.text}</div>
              )}

              <div className="auth-switch-box">
                <button
                  type="button"
                  className="register-switch-btn"
                  onClick={() => switchView("login")}
                >
                  ← Already have an account? Back to Login
                </button>
              </div>
            </div>
          )}

          {view === "registered_slip" && registeredSlip && (
            /* ================= POST-REGISTRATION SLIP & SCHOOL SUBMISSION GUIDE ================= */
            <div className="auth-card-inner">
              <div className="auth-header-block">
                <span className="auth-step-tag">
                  Online Application Submitted · Pending School Verification
                </span>
                <h2>Bring Requirements &amp; Tuition Payment to LKA</h2>
                <p className="subtitle">
                  Your online registration for{" "}
                  <strong>{registeredSlip.student_name}</strong> (
                  <strong>{registeredSlip.student_id_no}</strong>) has been
                  recorded. To become <strong>Officially Enrolled</strong> and
                  unlock the full Student Portal Dashboard, the parent/guardian
                  must submit all requirements below and settle the tuition fee
                  at the school.
                </p>
              </div>

              <div className="enroll-assessment-box">
                <div className="assessment-header">
                  <IconCalculator size={16} />
                  <strong>
                    Step 1: Settle Tuition / Downpayment at LKA Cashier
                  </strong>
                </div>
                <div className="assessment-rows">
                  <div className="assessment-row">
                    <span>Student ID &amp; Grade Level:</span>
                    <strong>
                      {registeredSlip.student_id_no} ·{" "}
                      {registeredSlip.grade_level} (
                      {registeredSlip.assigned_section})
                    </strong>
                  </div>
                  <div className="assessment-row">
                    <span>Guardian&apos;s Selected Plan:</span>
                    <strong>
                      {registeredSlip.payment_plan === "cash"
                        ? "Full Cash Basis (10% Discount)"
                        : registeredSlip.payment_plan === "quarterly"
                        ? "Quarterly Plan (4 Exams)"
                        : "Monthly Plan (10 Months)"}
                    </strong>
                  </div>
                  <div className="assessment-row highlight-row">
                    <span>Amount to Pay at School Upon Enrollment:</span>
                    <strong>
                      {formatPeso(registeredSlip.downpayment_required)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>
                  Step 2: Submit All Physical Requirements at LKA Registrar
                  Office
                </label>
                <p className="field-helper-note">
                  Bring these original/photocopy documents in an envelope to{" "}
                  <strong>
                    Phase 4-B, Package 7, Block 103, Lot 2, Brgy. Bagong Silang,
                    Caloocan City (8:00 AM–12:00 NN &amp; 1:00 PM–5:00 PM)
                  </strong>
                  :
                </p>
                <div className="form-req-checklist">
                  {(
                    REQUIREMENTS_BY_TYPE[registeredSlip.student_type] ||
                    REQUIREMENTS_BY_TYPE.new
                  ).map((req) => (
                    <div key={req.id} className="form-req-item">
                      <div className="form-req-text">
                        <strong>{req.label}</strong>
                        <span>{req.note}</span>
                      </div>
                      <span className="req-status-pill">
                        Submit at School Registrar
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="policy-reminder-box">
                <IconShield size={16} />
                <span>
                  <strong>Registrar Approval Policy:</strong> Only the{" "}
                  <strong>LKA School Registrar</strong> can mark your child as{" "}
                  <strong>Officially Enrolled</strong> once all physical
                  requirements and tuition payment are verified at the school.
                  Once approved, your full Student Dashboard will unlock!
                </span>
              </div>

              <button
                type="button"
                className="login-btn"
                onClick={() => switchView("login")}
              >
                Proceed to Student Portal Login →
              </button>
            </div>
          )}

          {view === "forgot" && (
            /* ================= FORGOT PASSWORD VIEW ================= */
            <div className="auth-card-inner">
              <div className="auth-header-block">
                <span className="auth-step-tag">Account Recovery</span>
                <h2>Reset Your Password</h2>
                <p className="subtitle">
                  Verify your registered email and mobile number to create a new
                  password.
                </p>
              </div>

              <form onSubmit={handleForgotSubmit}>
                <div className="field">
                  <label htmlFor="fp-email">Registered Email Address</label>
                  <div className="input-wrap with-icon">
                    <span className="input-icon">
                      <IconMail size={17} />
                    </span>
                    <input
                      id="fp-email"
                      type="email"
                      required
                      placeholder="example@email.com"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="fp-phone">Registered Mobile Number</label>
                  <div className="input-wrap with-icon">
                    <span className="input-icon">
                      <IconPhone size={17} />
                    </span>
                    <input
                      id="fp-phone"
                      type="tel"
                      required
                      placeholder="09171234567"
                      value={fpPhone}
                      onChange={(e) => setFpPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-two-col">
                  <div className="field">
                    <label htmlFor="fp-new-password">New Password</label>
                    <div className="input-wrap with-icon">
                      <span className="input-icon">
                        <IconKey size={17} />
                      </span>
                      <input
                        id="fp-new-password"
                        className="has-toggle"
                        type={showFpPassword ? "text" : "password"}
                        required
                        placeholder="Min. 6 characters"
                        value={fpNewPassword}
                        onChange={(e) => setFpNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="toggle-btn"
                        onClick={() => setShowFpPassword(!showFpPassword)}
                      >
                        {showFpPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="fp-confirm-password">
                      Confirm New Password
                    </label>
                    <div className="input-wrap with-icon">
                      <span className="input-icon">
                        <IconKey size={17} />
                      </span>
                      <input
                        id="fp-confirm-password"
                        type={showFpPassword ? "text" : "password"}
                        required
                        placeholder="Repeat password"
                        value={fpConfirmPassword}
                        onChange={(e) => setFpConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Resetting Password..." : "Save New Password →"}
                </button>
              </form>

              {status && (
                <div className={`alert ${status.type}`}>{status.text}</div>
              )}

              <div className="auth-switch-box">
                <button
                  type="button"
                  className="register-switch-btn"
                  onClick={() => switchView("login")}
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}

          {view === "forgot_username" && (
            /* ================= FORGOT USERNAME VIEW ================= */
            <div className="auth-card-inner">
              <div className="auth-header-block">
                <span className="auth-step-tag">Account Recovery</span>
                <h2>Find Your Username</h2>
                <p className="subtitle">
                  Enter the student&apos;s full name and registered mobile number
                  to recover your username.
                </p>
              </div>

              <form onSubmit={handleForgotUsernameSubmit}>
                <div className="field">
                  <label htmlFor="fu-name">Student / Account Full Name</label>
                  <div className="input-wrap with-icon">
                    <span className="input-icon">
                      <IconUser size={17} />
                    </span>
                    <input
                      id="fu-name"
                      type="text"
                      required
                      placeholder="e.g. Mark Laguerta"
                      value={fuName}
                      onChange={(e) => setFuName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="fu-phone">Registered Mobile Number</label>
                  <div className="input-wrap with-icon">
                    <span className="input-icon">
                      <IconPhone size={17} />
                    </span>
                    <input
                      id="fu-phone"
                      type="tel"
                      required
                      placeholder="09171234567"
                      value={fuPhone}
                      onChange={(e) => setFuPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? "Searching..." : "Find My Username →"}
                </button>
              </form>

              {status && (
                <div className={`alert ${status.type}`}>{status.text}</div>
              )}

              {foundAccount && (
                <div
                  className="enroll-assessment-box"
                  style={{ marginTop: "16px" }}
                >
                  <div className="assessment-rows">
                    <div className="assessment-row">
                      <span>Account / Student:</span>
                      <strong>
                        {foundAccount.student_name} ({foundAccount.student_id_no})
                      </strong>
                    </div>
                    <div className="assessment-row highlight-row">
                      <span>Your Username:</span>
                      <strong>{foundAccount.username}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="login-btn"
                    style={{ marginTop: "12px" }}
                    onClick={() => {
                      setEmail(foundAccount.username);
                      switchView("login");
                    }}
                  >
                    Use This Username to Login →
                  </button>
                </div>
              )}

              <div className="auth-switch-box">
                <button
                  type="button"
                  className="register-switch-btn"
                  onClick={() => switchView("login")}
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}
      </main>
    </div>
  );
}
