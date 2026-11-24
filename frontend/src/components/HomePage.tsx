import React, { useState } from "react";
import {
  IconBook,
  IconBuilding,
  IconCalculator,
  IconCalendar,
  IconCheck,
  IconClipboard,
  IconClock,
  IconEye,
  IconFlask,
  IconHeartPulse,
  IconHomeSkill,
  IconMail,
  IconMapPin,
  IconMonitor,
  IconPhone,
  IconSchool,
  IconShield,
  IconSun,
  IconTarget,
  IconUsers,
  IconWrench,
} from "./Icons";

interface HomePageProps {
  onGoToLogin: () => void;
  onGoToEnroll?: () => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "What grade levels are open for enrollment?",
    answer:
      "We accept students from Kinder 1 and Kinder 2 up to Grade 1 through Grade 6.",
  },
  {
    question: "What are the class hours?",
    answer:
      "Kinder 1 and Kinder 2 classes run for 2.5 hours per shift: Morning Shift (7:00 AM – 9:30 AM or 8:00 AM – 10:30 AM) and Afternoon Shift (12:00 NN – 2:30 PM or 1:00 PM – 3:30 PM). Grade 1 to Grade 6 classes run for 5 hours per shift: Morning Shift (7:00 AM – 12:00 NN) and Afternoon Shift (12:00 NN – 5:00 PM), Monday to Friday.",
  },
  {
    question: "How can we pay the tuition fee?",
    answer:
      "All tuition payments are settled onsite at the School Cashier. You can pay in Full (with a 10% Cash Discount), Quarterly (downpayment upon enrollment + 4 payments before exams in August, October, January, and March), or Monthly (downpayment upon enrollment + 10 monthly payments from June to March, due every 15th–30th).",
  },
  {
    question: "What school activities do students join?",
    answer:
      "Our school focuses full-time on academics. For extra activities, we hold our yearly Field Trip (every 3rd week of February), quiz bees like 'Battle of the Brains', and talent shows.",
  },
  {
    question: "How can parents check their child's records and attendance?",
    answer:
      "After enrolling, parents can view their child's profile, tuition balance, due dates, and attendance in the system.",
  },
];

interface FeeBreakdown {
  tuitionCash: number;
  tuitionInstallment: number;
  miscCash: number;
  miscInstallment: number;
  computerFee: number;
  subTotalCash: number;
  subTotalInstallment: number;
  cashDiscount: number;
  totalCashBasis: number;
  downpaymentMonthly: number;
  downpaymentQuarterly: number;
  monthlyPayment: number;
  quarterlyPayment: number;
}

interface GradeTuition {
  id: string;
  label: string;
  group: string;
  schedule: string;
  oldStudent: FeeBreakdown;
  newStudent: FeeBreakdown;
}

const OLD_KINDER_FEES: FeeBreakdown = {
  tuitionCash: 13579.9,
  tuitionInstallment: 13579.92,
  miscCash: 5399.5,
  miscInstallment: 5399.52,
  computerFee: 0,
  subTotalCash: 18979.4,
  subTotalInstallment: 18979.44,
  cashDiscount: 1897.94,
  totalCashBasis: 17081.46,
  downpaymentMonthly: 5399.52,
  downpaymentQuarterly: 5399.52,
  monthlyPayment: 1357.99,
  quarterlyPayment: 3394.98,
};

const NEW_KINDER_FEES: FeeBreakdown = {
  tuitionCash: 14170.5,
  tuitionInstallment: 14170.5,
  miscCash: 5399.5,
  miscInstallment: 5399.5,
  computerFee: 0,
  subTotalCash: 19570.0,
  subTotalInstallment: 19570.0,
  cashDiscount: 1794.18,
  totalCashBasis: 17775.82,
  downpaymentMonthly: 5399.5,
  downpaymentQuarterly: 5399.5,
  monthlyPayment: 1417.05,
  quarterlyPayment: 3542.63,
};

const OLD_PRIMARY_FEES: FeeBreakdown = {
  tuitionCash: 14537.5,
  tuitionInstallment: 14537.5,
  miscCash: 7155.5,
  miscInstallment: 7155.5,
  computerFee: 1900.0,
  subTotalCash: 23593.0,
  subTotalInstallment: 23593.0,
  cashDiscount: 2359.3,
  totalCashBasis: 21233.7,
  downpaymentMonthly: 7155.5,
  downpaymentQuarterly: 7155.5,
  monthlyPayment: 1643.75,
  quarterlyPayment: 4109.38,
};

const NEW_PRIMARY_FEES: FeeBreakdown = {
  tuitionCash: 15170.0,
  tuitionInstallment: 15170.0,
  miscCash: 7155.5,
  miscInstallment: 7155.5,
  computerFee: 1900.0,
  subTotalCash: 24225.5,
  subTotalInstallment: 24225.5,
  cashDiscount: 2422.55,
  totalCashBasis: 21802.95,
  downpaymentMonthly: 7155.5,
  downpaymentQuarterly: 7155.5,
  monthlyPayment: 1707.0,
  quarterlyPayment: 4267.5,
};

const OLD_INTERMEDIATE_FEES: FeeBreakdown = {
  tuitionCash: 16177.0,
  tuitionInstallment: 16177.0,
  miscCash: 7551.5,
  miscInstallment: 7551.5,
  computerFee: 1900.0,
  subTotalCash: 25628.5,
  subTotalInstallment: 25628.5,
  cashDiscount: 2562.85,
  totalCashBasis: 23065.65,
  downpaymentMonthly: 7551.5,
  downpaymentQuarterly: 7155.5,
  monthlyPayment: 1807.7,
  quarterlyPayment: 4519.25,
};

const NEW_INTERMEDIATE_FEES: FeeBreakdown = {
  tuitionCash: 16880.3,
  tuitionInstallment: 16880.5,
  miscCash: 7155.5,
  miscInstallment: 7155.5,
  computerFee: 1900.0,
  subTotalCash: 25935.8,
  subTotalInstallment: 25936.0,
  cashDiscount: 2593.58,
  totalCashBasis: 23342.22,
  downpaymentMonthly: 7155.5,
  downpaymentQuarterly: 7155.5,
  monthlyPayment: 1878.05,
  quarterlyPayment: 4695.13,
};

const GRADE_TUITIONS: GradeTuition[] = [
  {
    id: "kinder1",
    label: "Kinder 1",
    group: "Pre-School",
    schedule: "7:00–9:30 AM / 12:00–2:30 PM",
    oldStudent: OLD_KINDER_FEES,
    newStudent: NEW_KINDER_FEES,
  },
  {
    id: "kinder2",
    label: "Kinder 2",
    group: "Pre-School",
    schedule: "7:00–9:30 AM / 12:00–2:30 PM",
    oldStudent: OLD_KINDER_FEES,
    newStudent: NEW_KINDER_FEES,
  },
  {
    id: "grade1",
    label: "Grade 1",
    group: "Primary",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_PRIMARY_FEES,
    newStudent: NEW_PRIMARY_FEES,
  },
  {
    id: "grade2",
    label: "Grade 2",
    group: "Primary",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_PRIMARY_FEES,
    newStudent: NEW_PRIMARY_FEES,
  },
  {
    id: "grade3",
    label: "Grade 3",
    group: "Primary",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_PRIMARY_FEES,
    newStudent: NEW_PRIMARY_FEES,
  },
  {
    id: "grade4",
    label: "Grade 4",
    group: "Intermediate",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_INTERMEDIATE_FEES,
    newStudent: NEW_INTERMEDIATE_FEES,
  },
  {
    id: "grade5",
    label: "Grade 5",
    group: "Intermediate",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_INTERMEDIATE_FEES,
    newStudent: NEW_INTERMEDIATE_FEES,
  },
  {
    id: "grade6",
    label: "Grade 6",
    group: "Intermediate",
    schedule: "7:00 AM – 12:00 NN / 12:00 NN – 5:00 PM",
    oldStudent: OLD_INTERMEDIATE_FEES,
    newStudent: NEW_INTERMEDIATE_FEES,
  },
];

interface PlanOption {
  key: "cash" | "quarterly" | "monthly";
  label: string;
  intervalText: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    key: "cash",
    label: "Full Cash Basis (10% Discount)",
    intervalText: "One-time payment upon enrollment with 10% Cash Discount",
  },
  {
    key: "quarterly",
    label: "Quarterly Plan (4 Exams)",
    intervalText:
      "Downpayment upon enrollment + 4 payments before exams (Aug, Oct, Jan, Mar)",
  },
  {
    key: "monthly",
    label: "Monthly Plan (10 Months)",
    intervalText:
      "Downpayment upon enrollment + 10 monthly payments (June – March, every 15th–30th)",
  },
];

const FACILITIES = [
  {
    num: "01",
    icon: <IconBook size={22} />,
    name: "School Library",
    desc: "Quiet reading room filled with books and study references for young readers.",
  },
  {
    num: "02",
    icon: <IconMonitor size={22} />,
    name: "Computer Room",
    desc: "Guided computer laboratory where students learn basic digital and typing skills.",
  },
  {
    num: "03",
    icon: <IconFlask size={22} />,
    name: "Science Lab",
    desc: "Hands-on science room for safe experiments, discovery, and group learning.",
  },
  {
    num: "04",
    icon: <IconHeartPulse size={22} />,
    name: "School Clinic",
    desc: "Clean and caring health room ready for first aid and daily wellness checks.",
  },
  {
    num: "05",
    icon: <IconHomeSkill size={22} />,
    name: "EPP Room",
    desc: "Training space for home economics, livelihood, and practical daily life skills.",
  },
  {
    num: "06",
    icon: <IconWrench size={22} />,
    name: "Industrial Room",
    desc: "Dedicated workshop room for arts, crafts, and hands-on student projects.",
  },
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

export default function HomePage({
  onGoToLogin,
  onGoToEnroll,
}: HomePageProps) {
  const handleEnrollClick = onGoToEnroll || onGoToLogin;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Tuition Calculator state
  const [selectedGrade, setSelectedGrade] = useState<string>("grade1");
  const [studentType, setStudentType] = useState<"old" | "new">("new");
  const [planIndex, setPlanIndex] = useState<number>(2); // Default: Monthly (10x)

  const currentGrade =
    GRADE_TUITIONS.find((g) => g.id === selectedGrade) || GRADE_TUITIONS[0];
  const activeFees =
    studentType === "old" ? currentGrade.oldStudent : currentGrade.newStudent;
  const currentPlan = PLAN_OPTIONS[planIndex];

  const downpaymentAmount =
    currentPlan.key === "monthly"
      ? activeFees.downpaymentMonthly
      : currentPlan.key === "quarterly"
      ? activeFees.downpaymentQuarterly
      : activeFees.totalCashBasis;

  const installmentAmount =
    currentPlan.key === "cash"
      ? activeFees.totalCashBasis
      : currentPlan.key === "quarterly"
      ? activeFees.quarterlyPayment
      : activeFees.monthlyPayment;

  const scheduleRows =
    currentPlan.key === "cash"
      ? [
          {
            label: "Full Cash Payment (Upon Enrollment - 10% Discount)",
            amount: activeFees.totalCashBasis,
          },
        ]
      : currentPlan.key === "quarterly"
      ? [
          {
            label: "Upon Enrollment (Miscellaneous Fee Downpayment)",
            amount: activeFees.downpaymentQuarterly,
          },
          {
            label: "1st Quarter Exam (August)",
            amount: activeFees.quarterlyPayment,
          },
          {
            label: "2nd Quarter Exam (October)",
            amount: activeFees.quarterlyPayment,
          },
          {
            label: "3rd Quarter Exam (January)",
            amount: activeFees.quarterlyPayment,
          },
          {
            label: "4th Quarter Exam (March)",
            amount: activeFees.quarterlyPayment,
          },
        ]
      : [
          {
            label: "Upon Enrollment (Miscellaneous Fee Downpayment)",
            amount: activeFees.downpaymentMonthly,
          },
          {
            label: "June – August (Every 15th–30th)",
            amount: activeFees.monthlyPayment,
          },
          {
            label: "September – December (Every 15th–30th)",
            amount: activeFees.monthlyPayment,
          },
          {
            label: "January – March (Every 15th–30th)",
            amount: activeFees.monthlyPayment,
          },
        ];

  return (
    <div className="home-root">
      {/* ===== TOP NAVBAR ===== */}
      <header className="navbar">
        <div className="nav-container">
          <a href="#top" className="nav-brand">
            <img
              src="/logo.jpg"
              alt="Lyceum ng Kabataan Academy Inc. Logo"
              className="nav-logo"
            />
            <div>
              <span className="nav-title">Lyceum ng Kabataan Academy Inc.</span>
              <span className="nav-subtitle">Founded 1989 · Caloocan City</span>
            </div>
          </a>

          <nav className="nav-links">
            <a href="#about">About Us</a>
            <a href="#mission-vision">Mission &amp; Vision</a>
            <a href="#levels-tuition">Grade Levels &amp; Tuition</a>
            <a href="#requirements">Requirements</a>
            <a href="#gallery">Activities</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact &amp; Map</a>
          </nav>

          <div
            className="nav-actions"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "9px 18px", fontSize: "0.86rem" }}
              onClick={onGoToLogin}
            >
              Portal Login
            </button>
            <button
              type="button"
              className="btn-login-nav"
              onClick={handleEnrollClick}
            >
              Enroll Now →
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section id="top" className="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />

        <div className="section-container hero-grid">
          <div className="hero-text">
            <div className="hero-pill-wrap">
              <span className="hero-badge">Est. 1989</span>
              <span className="hero-badge-sub">
                Kinder 1 to Grade 6 · S.Y. 2026–2027
              </span>
            </div>

            <h1>
              Building a Strong Academic Future for{" "}
              <span className="highlight-gradient">Every Young Learner</span>
            </h1>

            <p className="hero-desc">
              Welcome to <strong>Lyceum ng Kabataan Academy Inc. (LKA)</strong>—a{" "}
              <em>Fully Academic</em> school founded by{" "}
              <strong>Mrs. Esther H. Bacang</strong>. We use modern teaching
              methods to help children learn with confidence and prepare for
              life.
            </p>

            <div className="hero-buttons">
              <button
                type="button"
                className="btn-primary"
                onClick={handleEnrollClick}
              >
                Enroll Now →
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onGoToLogin}
              >
                Portal Login
              </button>
              <a href="#calculator" className="btn-secondary">
                Tuition Calculator
              </a>
            </div>

            <div className="hero-mini-trust">
              <div className="trust-item">
                <span>
                  <IconCheck size={12} />
                </span>
                Monday – Friday Classes
              </div>
              <div className="trust-item">
                <span>
                  <IconCheck size={12} />
                </span>
                Morning &amp; Afternoon Shifts
              </div>
              <div className="trust-item">
                <span>
                  <IconCheck size={12} />
                </span>
                Monthly &amp; Quarterly Plans
              </div>
            </div>
          </div>

          <div className="hero-showcase-visual">
            <div className="hero-frame-main">
              <img
                src="/images/school-building.png"
                alt="Lyceum ng Kabataan Academy Inc. School Building"
              />
            </div>

            <div className="hero-frame-inset">
              <img
                src="/images/students-banner.jpg"
                alt="LKA Students and Teachers"
              />
            </div>

            <div className="hero-float-badge">
              <img src="/logo.jpg" alt="LKA Seal" />
              <div>
                <strong>37+ Years</strong>
                <span>of Quality Education</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FLOATING FEATURE RIBBON ===== */}
        <div className="section-container">
          <div className="feature-ribbon">
            <div className="ribbon-item">
              <span className="ribbon-icon">
                <IconSchool size={22} />
              </span>
              <div>
                <strong>Founded in 1989</strong>
                <span>Trusted school community</span>
              </div>
            </div>
            <div className="ribbon-item">
              <span className="ribbon-icon">
                <IconBook size={22} />
              </span>
              <div>
                <strong>Fully Academic</strong>
                <span>Focused classroom instruction</span>
              </div>
            </div>
            <div className="ribbon-item">
              <span className="ribbon-icon">
                <IconClock size={22} />
              </span>
              <div>
                <strong>Two Class Shifts</strong>
                <span>Morning &amp; Afternoon options</span>
              </div>
            </div>
            <div className="ribbon-item">
              <span className="ribbon-icon">
                <IconBuilding size={22} />
              </span>
              <div>
                <strong>6 Campus Facilities</strong>
                <span>Complete learning rooms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT US & FACILITIES ===== */}
      <section id="about" className="section-block bg-white">
        <div className="section-container">
          <div className="about-grid">
            <div className="about-magazine">
              <div className="about-img-primary">
                <img
                  src="/images/assembly.jpg"
                  alt="Morning assembly at Lyceum ng Kabataan Academy"
                />
              </div>
              <div className="about-img-secondary">
                <img
                  src="/images/battle-of-the-brains.jpg"
                  alt="LKA Teachers with Battle of the Brains Trophy"
                />
              </div>
              <div className="about-exp-badge">
                <strong>1989</strong>
                <span>Year Founded</span>
              </div>
            </div>

            <div className="about-content">
              <span className="section-tag">About Our School</span>
              <h2>Over 37 Years of Focused Academic Learning</h2>
              <p>
                <strong>Lyceum ng Kabataan Academy Inc.</strong> started in{" "}
                <strong>1989</strong> and was founded by{" "}
                <strong>Mrs. Esther H. Bacang</strong>. For more than 37 years,
                our school has helped children build a strong foundation in
                reading, math, science, and good values.
              </p>
              <p>
                Because we are a <strong>Fully Academic</strong> school, our
                teachers give full attention to daily classroom lessons. Aside
                from regular classes, students also look forward to our yearly{" "}
                <strong>Educational Field Trip</strong> (every 3rd week of
                February), <strong>Battle of the Brains</strong>, and{" "}
                <strong>Talent Shows</strong>.
              </p>

              <div className="founder-box">
                <img src="/logo.jpg" alt="LKA Seal" className="founder-seal" />
                <div>
                  <strong>Mrs. Esther H. Bacang</strong>
                  <span>School Founder · Lyceum ng Kabataan Academy Inc.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Facilities Cards */}
          <div className="facilities-section">
            <div className="section-header compact-header">
              <span className="section-tag">Campus Facilities</span>
              <h2>Complete Rooms for Hands-On Learning</h2>
              <p>
                Every student has access to our complete school facilities from
                Kinder to Grade 6.
              </p>
            </div>

            <div className="facilities-cards-grid">
              {FACILITIES.map((f, i) => (
                <div key={i} className="facility-card">
                  <div className="facility-card-top">
                    <div className="facility-icon-box">{f.icon}</div>
                    <span className="facility-num">{f.num}</span>
                  </div>
                  <h4>{f.name}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== MISSION & VISION (VIBRANT BANNER SECTION) ===== */}
      <section id="mission-vision" className="mv-banner-section">
        <div className="section-container">
          <div className="section-header mv-header-light">
            <span className="section-tag-light">Our School Goals</span>
            <h2>Mission &amp; Vision</h2>
            <p>
              The official Mission and Vision of Lyceum ng Kabataan Academy Inc.
            </p>
          </div>

          <div className="mv-two-col">
            <div className="mv-card">
              <span className="mv-watermark">“</span>
              <div className="mv-card-top">
                <span className="mv-icon-svg">
                  <IconTarget size={22} />
                </span>
                <span className="mv-badge">MISSION</span>
              </div>
              <p className="mv-quote">
                “To educate the millennials holistically through the utilization
                of modern strategies in teachings for them to become equipped and
                ready to face the challenges in life.”
              </p>
            </div>

            <div className="mv-card">
              <span className="mv-watermark">“</span>
              <div className="mv-card-top">
                <span className="mv-icon-svg">
                  <IconEye size={22} />
                </span>
                <span className="mv-badge">VISION</span>
              </div>
              <p className="mv-quote">
                “LKA envisions its learners to be globally competitive and the
                institution will be at par with others in terms of curricular and
                co-curricular programs.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GRADE LEVELS & TUITION FEES ===== */}
      <section id="levels-tuition" className="section-block bg-white">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Classes &amp; Tuition</span>
            <h2>Grade Levels &amp; Tuition Fees</h2>
            <p>
              Class schedules and tuition fees from Kinder 1 to Grade 6 for
              School Year 2026–2027.
            </p>
          </div>

          {/* Schedule Cards */}
          <div className="levels-cards">
            <div className="level-card level-kinder">
              <div className="level-icon-row">
                <span className="level-svg-badge">
                  <IconSchool size={22} />
                </span>
                <span className="level-badge">Pre-School</span>
              </div>
              <h3>Kinder 1 &amp; Kinder 2</h3>
              <div className="grade-chips-row">
                <span className="grade-chip">Kinder 1</span>
                <span className="grade-chip">Kinder 2</span>
              </div>
              <p className="level-summary">
                Gentle and engaging 2.5-hour daily sessions building reading,
                writing, and counting skills (Mon – Fri).
              </p>
              <div className="shift-pills">
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconSun size={15} /> Morning Shift
                  </span>
                  <strong>7:00 AM – 9:30 AM</strong>
                </div>
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconClock size={15} /> Afternoon Shift
                  </span>
                  <strong>12:00 NN – 2:30 PM</strong>
                </div>
              </div>
            </div>

            <div className="level-card level-primary">
              <div className="level-icon-row">
                <span className="level-svg-badge">
                  <IconBook size={22} />
                </span>
                <span className="level-badge">Primary Grades</span>
              </div>
              <h3>Grade 1 to Grade 3</h3>
              <div className="grade-chips-row">
                <span className="grade-chip">Grade 1</span>
                <span className="grade-chip">Grade 2</span>
                <span className="grade-chip">Grade 3</span>
              </div>
              <p className="level-summary">
                Strong foundation in core subjects with Monday to Friday classes
                and Saturday reviews when needed.
              </p>
              <div className="shift-pills">
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconSun size={15} /> Morning Shift
                  </span>
                  <strong>7:00 AM – 12:00 PM</strong>
                </div>
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconClock size={15} /> Afternoon Shift
                  </span>
                  <strong>12:00 PM – 5:00 PM</strong>
                </div>
              </div>
            </div>

            <div className="level-card level-intermediate">
              <div className="level-icon-row">
                <span className="level-svg-badge">
                  <IconFlask size={22} />
                </span>
                <span className="level-badge">Intermediate Grades</span>
              </div>
              <h3>Grade 4 to Grade 6</h3>
              <div className="grade-chips-row">
                <span className="grade-chip">Grade 4</span>
                <span className="grade-chip">Grade 5</span>
                <span className="grade-chip">Grade 6</span>
              </div>
              <p className="level-summary">
                Preparing students for high school with core subjects, Science
                Lab, Computer, and EPP classes.
              </p>
              <div className="shift-pills">
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconSun size={15} /> Morning Shift
                  </span>
                  <strong>7:00 AM – 12:00 PM</strong>
                </div>
                <div className="shift-pill">
                  <span className="shift-label-icon">
                    <IconClock size={15} /> Afternoon Shift
                  </span>
                  <strong>12:00 PM – 5:00 PM</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tuition Fee Table */}
          <div className="tuition-box">
            <div className="tuition-box-header">
              <div>
                <h3>Tuition &amp; Fee Matrix per Grade Level (S.Y. 2026–2027)</h3>
                <p>
                  Full Cash Basis includes a 10% discount · Downpayment upon
                  enrollment equals the Miscellaneous Fee
                </p>
              </div>
              <a href="#calculator" className="tuition-jump-btn">
                Try Installment Calculator ↓
              </a>
            </div>

            <div className="table-responsive">
              <table className="tuition-table">
                <thead>
                  <tr>
                    <th>Grade Level</th>
                    <th>Shift Hours</th>
                    <th>Old Student (Cash / 10% Off)</th>
                    <th>New Student (Cash / 10% Off)</th>
                    <th>Downpayment (Upon Enrollment)</th>
                    <th>Monthly (10 Months)</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_TUITIONS.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="grade-name-cell">{item.label}</strong>{" "}
                        <span className="dept-chip">{item.group}</span>
                      </td>
                      <td>{item.schedule}</td>
                      <td className="price-cell">
                        {formatPeso(item.oldStudent.totalCashBasis)}
                      </td>
                      <td className="price-cell highlight-new">
                        {formatPeso(item.newStudent.totalCashBasis)}
                      </td>
                      <td className="price-cell">
                        {formatPeso(item.newStudent.downpaymentMonthly)}
                      </td>
                      <td className="price-cell">
                        {formatPeso(item.oldStudent.monthlyPayment)} –{" "}
                        {formatPeso(item.newStudent.monthlyPayment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== TUITION INSTALLMENT CALCULATOR ===== */}
          <div id="calculator" className="calc-card">
            <div className="calc-body">
              <div className="calc-controls">
                <div className="calc-intro">
                  <span className="section-tag">Interactive Payment Planner</span>
                  <h3 className="calc-title-with-icon">
                    <IconCalculator size={22} />
                    <span>Tuition &amp; Installment Calculator</span>
                  </h3>
                  <p>
                    Choose your child&apos;s grade level, student type, and
                    slide to see the exact downpayment, fee breakdown, and
                    monthly or quarterly schedule.
                  </p>
                </div>

                {/* 1. Grade Level */}
                <div className="calc-field">
                  <label htmlFor="calc-grade">1. Select Grade Level</label>
                  <select
                    id="calc-grade"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    {GRADE_TUITIONS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label} ({g.group})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Student Type */}
                <div className="calc-field">
                  <label>2. Student Type</label>
                  <div className="calc-toggle-group">
                    <button
                      type="button"
                      className={`calc-toggle-btn ${
                        studentType === "new" ? "active" : ""
                      }`}
                      onClick={() => setStudentType("new")}
                    >
                      New Student
                    </button>
                    <button
                      type="button"
                      className={`calc-toggle-btn ${
                        studentType === "old" ? "active" : ""
                      }`}
                      onClick={() => setStudentType("old")}
                    >
                      Old Student
                    </button>
                  </div>
                </div>

                {/* 3. Payment Plan Slider */}
                <div className="calc-field">
                  <label htmlFor="calc-slider">
                    3. Preferred Payment Plan:{" "}
                    <strong className="highlight-pink">
                      {currentPlan.label}
                    </strong>
                  </label>
                  <input
                    id="calc-slider"
                    type="range"
                    min={0}
                    max={PLAN_OPTIONS.length - 1}
                    step={1}
                    value={planIndex}
                    onChange={(e) => setPlanIndex(Number(e.target.value))}
                    className="calc-slider"
                  />
                  <div className="slider-labels">
                    <span className={planIndex === 0 ? "active-label" : ""}>
                      Cash (10% Off)
                    </span>
                    <span className={planIndex === 1 ? "active-label" : ""}>
                      Quarterly (4x)
                    </span>
                    <span className={planIndex === 2 ? "active-label" : ""}>
                      Monthly (10x)
                    </span>
                  </div>
                </div>
              </div>

              {/* Result Box */}
              <div className="calc-result-dark">
                <div className="calc-result-top">
                  <span className="calc-result-label">
                    {currentPlan.key === "cash"
                      ? "Total Cash Payment (with 10% Discount)"
                      : currentPlan.key === "quarterly"
                      ? "Quarterly Installment (4x Before Exams)"
                      : "Monthly Installment (June – March)"}
                  </span>
                  <div className="calc-result-amount">
                    {formatPeso(installmentAmount)}
                    <span className="calc-per">
                      {currentPlan.key === "cash"
                        ? " upon enrollment"
                        : currentPlan.key === "quarterly"
                        ? " / quarter"
                        : " / month"}
                    </span>
                  </div>
                  <p className="calc-interval-note">{currentPlan.intervalText}</p>
                </div>

                <div className="calc-breakdown">
                  <div className="calc-row">
                    <span>Tuition Fee:</span>
                    <strong>
                      {formatPeso(
                        currentPlan.key === "cash"
                          ? activeFees.tuitionCash
                          : activeFees.tuitionInstallment
                      )}
                    </strong>
                  </div>
                  <div className="calc-row">
                    <span>Miscellaneous Fee:</span>
                    <strong>
                      {formatPeso(
                        currentPlan.key === "cash"
                          ? activeFees.miscCash
                          : activeFees.miscInstallment
                      )}
                    </strong>
                  </div>
                  <div className="calc-row">
                    <span>Computer Fee:</span>
                    <strong>
                      {activeFees.computerFee > 0
                        ? formatPeso(activeFees.computerFee)
                        : "None (₱0.00)"}
                    </strong>
                  </div>
                  <div className="calc-row">
                    <span>Regular Sub-Total:</span>
                    <strong>
                      {formatPeso(
                        currentPlan.key === "cash"
                          ? activeFees.subTotalCash
                          : activeFees.subTotalInstallment
                      )}
                    </strong>
                  </div>
                  {currentPlan.key === "cash" ? (
                    <div className="calc-row">
                      <span>Less 10% Cash Discount:</span>
                      <strong style={{ color: "#ffd1e6" }}>
                        − {formatPeso(activeFees.cashDiscount)}
                      </strong>
                    </div>
                  ) : (
                    <div className="calc-row">
                      <span>Minimum Downpayment (Upon Enrollment):</span>
                      <strong style={{ color: "#ffd1e6" }}>
                        {formatPeso(downpaymentAmount)}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="calc-schedule-preview">
                  <span className="schedule-preview-title">
                    <IconCalendar size={15} />
                    <span>Official Payment Schedule:</span>
                  </span>
                  <ul>
                    {scheduleRows.map((row, idx) => (
                      <li key={idx}>
                        <span>{row.label}</span>
                        <strong>{formatPeso(row.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="btn-calc-action"
                  onClick={handleEnrollClick}
                >
                  Enroll Now with This Plan →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW TO ENROLL & REQUIREMENTS SECTION ===== */}
      <section id="requirements" className="section-block bg-soft-pink">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Admission Guide</span>
            <h2>How to Enroll &amp; Requirements</h2>
            <p>
              Follow these 4 simple steps to enroll your child online and check
              the required school documents below.
            </p>
          </div>

          {/* 4-Step Enrollment Process */}
          <div className="enroll-steps-grid">
            <div className="enroll-step-card">
              <div className="enroll-step-top">
                <span className="enroll-step-num">Step 01</span>
                <span className="enroll-step-icon">
                  <IconUsers size={20} />
                </span>
              </div>
              <h4>Fill Out Online Form</h4>
              <p>
                Click <strong>Enroll Now</strong> and enter your child&apos;s
                details, grade level (Kinder 1 to Grade 6), and preferred class
                shift (Morning or Afternoon).
              </p>
            </div>

            <div className="enroll-step-card">
              <div className="enroll-step-top">
                <span className="enroll-step-num">Step 02</span>
                <span className="enroll-step-icon">
                  <IconClipboard size={20} />
                </span>
              </div>
              <h4>Check Requirements</h4>
              <p>
                Select the school documents you have ready (such as PSA Birth
                Certificate and Report Card) for Registrar verification.
              </p>
            </div>

            <div className="enroll-step-card">
              <div className="enroll-step-top">
                <span className="enroll-step-num">Step 03</span>
                <span className="enroll-step-icon">
                  <IconCalculator size={20} />
                </span>
              </div>
              <h4>Choose Payment Plan</h4>
              <p>
                Select Full Cash (with 10% discount), Quarterly (4 exams), or
                Monthly (10 months) and settle your payment onsite at the
                School Cashier.
              </p>
            </div>

            <div className="enroll-step-card">
              <div className="enroll-step-top">
                <span className="enroll-step-num">Step 04</span>
                <span className="enroll-step-icon">
                  <IconShield size={20} />
                </span>
              </div>
              <h4>Official Section &amp; Portal</h4>
              <p>
                Once verified, your child is assigned to one of our 27 sections
                and you can track your billing and schedule anytime.
              </p>
            </div>
          </div>

          {/* 3 Requirement Cards by Student Type */}
          <div className="req-cards-grid">
            {/* New Students */}
            <div className="req-category-card">
              <div className="req-card-header">
                <span className="req-type-badge">New Students</span>
                <h3>Kinder 1, Kinder 2 &amp; Incoming Grade 1</h3>
                <p>For first-time enrollees at Lyceum ng Kabataan Academy</p>
              </div>
              <ul className="req-checklist">
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>PSA / NSO Birth Certificate</strong>
                    <span>1 clear photocopy (present original for checking)</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>2 pcs. 2x2 Colored ID Picture</strong>
                    <span>White background with student&apos;s name</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Kinder Certificate / Report Card (SF9)</strong>
                    <span>Required for incoming Grade 1 students</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Upon Enrollment Downpayment</strong>
                    <span>
                      Equal to Miscellaneous Fee (₱5,399.50 Kinder / ₱7,155.50
                      Grade 1–6) or Full Cash Payment
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Old Students */}
            <div className="req-category-card featured-req-card">
              <div className="req-card-header">
                <span className="req-type-badge">Old / Continuing Students</span>
                <h3>Returning LKA Learners (Kinder 2 – Grade 6)</h3>
                <p>For students promoted from the previous school year</p>
              </div>
              <ul className="req-checklist">
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Original Report Card (Form 138 / SF9)</strong>
                    <span>From your previous grade level at LKA</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Full Settlement of Previous Balance</strong>
                    <span>
                      School Policy: Any unpaid balance from last school year
                      must be settled in full before enrolling
                    </span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>1 pc. 2x2 Colored ID Picture</strong>
                    <span>For school ID / RFID card renewal</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Upon Enrollment Downpayment</strong>
                    <span>
                      Equal to Miscellaneous Fee or Full Cash Basis (with 10%
                      discount)
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Transferees */}
            <div className="req-category-card">
              <div className="req-card-header">
                <span className="req-type-badge">Transferees</span>
                <h3>Transferring Students (Kinder 2 – Grade 6)</h3>
                <p>For learners transferring from another public or private school</p>
              </div>
              <ul className="req-checklist">
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>PSA / NSO Birth Certificate</strong>
                    <span>1 clear photocopy</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Original Report Card (Form 138 / SF9)</strong>
                    <span>With 12-digit Learner Reference Number (LRN)</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Certificate of Good Moral Character</strong>
                    <span>Issued by the previous school principal/guidance</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>Form 137 / SF10 (Permanent Record)</strong>
                    <span>Copy or official school-to-school request slip</span>
                  </div>
                </li>
                <li>
                  <span className="req-check-icon">
                    <IconCheck size={13} />
                  </span>
                  <div>
                    <strong>2 pcs. 2x2 Colored ID Picture</strong>
                    <span>White background</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="req-bottom-cta">
            <div>
              <strong>Ready to submit your child&apos;s enrollment form?</strong>
              <span>
                Parents or guardians can complete the online form in less than 3
                minutes.
              </span>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleEnrollClick}
            >
              Proceed to Online Enrollment Form →
            </button>
          </div>
        </div>
      </section>

      {/* ===== GALLERY: SCHOOL ACTIVITIES & AWARDS ===== */}
      <section id="gallery" className="section-block bg-white">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">School Life</span>
            <h2>Student Awards &amp; Activities</h2>
            <p>
              Moments from our Battle of the Brains, inter-school talent
              competitions, and annual school events.
            </p>
          </div>

          <div className="gallery-grid">
            <figure className="gallery-card">
              <div className="gallery-img-wrap">
                <img
                  src="/images/battle-of-the-brains.jpg"
                  alt="Battle of the Brains Awardees"
                />
                <span className="gallery-tag">Academic Contest</span>
              </div>
              <figcaption>
                <strong>Battle of the Brains</strong> – Our teachers proudly
                holding the trophy won in the inter-school quiz competition.
              </figcaption>
            </figure>

            <figure className="gallery-card">
              <div className="gallery-img-wrap">
                <img
                  src="/images/trophies-group.jpg"
                  alt="Students and teachers with competition trophies"
                />
                <span className="gallery-tag">Championships</span>
              </div>
              <figcaption>
                <strong>Contest Winners</strong> – Students and teachers
                celebrating their victories in academic and talent events.
              </figcaption>
            </figure>

            <figure className="gallery-card">
              <div className="gallery-img-wrap">
                <img
                  src="/images/stage-award.jpg"
                  alt="Students receiving award on stage"
                />
                <span className="gallery-tag">Talent &amp; Excellence</span>
              </div>
              <figcaption>
                <strong>Stage Performances &amp; Awards</strong> – LKA learners
                receiving recognition on stage.
              </figcaption>
            </figure>

            <figure className="gallery-card">
              <div className="gallery-img-wrap">
                <img
                  src="/images/students-banner.jpg"
                  alt="Lyceum ng Kabataan Academy students and faculty"
                />
                <span className="gallery-tag">Our Community</span>
              </div>
              <figcaption>
                <strong>The LKA Family</strong> – Our students and teachers
                united under the banner of Lyceum ng Kabataan Academy Inc.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section id="faq" className="section-block bg-white">
        <div className="section-container faq-container">
          <div className="section-header">
            <span className="section-tag">Common Questions</span>
            <h2>Frequently Asked Questions (FAQ)</h2>
            <p>Simple answers to common questions from parents.</p>
          </div>

          <div className="faq-list">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <div className="faq-answer">{item.answer}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CONTACT & MAP ===== */}
      <section id="contact" className="section-block bg-soft-pink">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Visit or Call Us</span>
            <h2>Contact Details &amp; School Map</h2>
            <p>
              Call or visit our school office if you have questions about
              enrollment.
            </p>
          </div>

          <div className="contact-grid">
            <div className="contact-card">
              <h3>Lyceum ng Kabataan Academy, Inc.</h3>
              <ul className="contact-list">
                <li>
                  <div className="contact-icon">
                    <IconMapPin size={20} />
                  </div>
                  <div>
                    <span className="contact-label">School Address</span>
                    <p>
                      Phase 4-B, Package 7, Block 103, Lot 2, Brgy. Bagong
                      Silang, Caloocan City, 1428
                    </p>
                  </div>
                </li>
                <li>
                  <div className="contact-icon">
                    <IconPhone size={20} />
                  </div>
                  <div>
                    <span className="contact-label">Contact Number</span>
                    <p>0926-549-3089</p>
                  </div>
                </li>
                <li>
                  <div className="contact-icon">
                    <IconMail size={20} />
                  </div>
                  <div>
                    <span className="contact-label">
                      Email &amp; Facebook Page
                    </span>
                    <p>
                      lyceumcaloocan@yahoo.com · FB: Lyceum ng Kabataan Academy,
                      Inc.
                    </p>
                  </div>
                </li>
                <li>
                  <div className="contact-icon">
                    <IconClock size={20} />
                  </div>
                  <div>
                    <span className="contact-label">Registrar Office Hours</span>
                    <p>
                      Monday – Friday · 8:00 AM – 12:00 NN &amp; 1:00 PM – 5:00
                      PM
                    </p>
                  </div>
                </li>
              </ul>

              <div className="contact-cta">
                <p>Ready to enroll your child for S.Y. 2026–2027?</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleEnrollClick}
                >
                  Enroll Now →
                </button>
              </div>
            </div>

            <div className="map-card">
              <iframe
                title="Lyceum ng Kabataan Academy Inc. Location Map"
                src="https://www.google.com/maps?q=Phase+4-B+Package+7+Block+103+Lot+2+Bagong+Silang+Caloocan+City+Lyceum+ng+Kabataan+Academy&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "360px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="home-footer">
        <div className="section-container footer-inner">
          <div className="footer-brand">
            <img src="/logo.jpg" alt="LKA Logo" className="footer-logo" />
            <div>
              <strong>Lyceum ng Kabataan Academy Inc.</strong>
              <p>Founded in 1989 by Mrs. Esther H. Bacang</p>
            </div>
          </div>
          <p className="footer-copy">
            © 2026 Lyceum ng Kabataan Academy Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
