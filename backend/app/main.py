import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .auth import get_password_hash, router as auth_router
from .db import Base, SessionLocal, engine
from .models import Parent, PaymentRecord, PaymentReminder, PromissoryNote, SystemSetting

app = FastAPI(title="Lyceum Enrollment Backend")

extra_origins = [
    o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *extra_origins,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth")


@app.on_event("startup")
def create_tables_and_seed_users():
    """Ensure tables, new enrollment columns, and default Student, Registrar, and Admin accounts exist."""
    Base.metadata.create_all(bind=engine)

    new_columns = [
        ("role", "VARCHAR DEFAULT 'parent' NOT NULL"),
        ("student_id_no", "VARCHAR"),
        ("student_name", "VARCHAR"),
        ("student_lrn", "VARCHAR"),
        ("student_type", "VARCHAR"),
        ("grade_level", "VARCHAR"),
        ("class_shift", "VARCHAR"),
        ("assigned_section", "VARCHAR"),
        ("birthdate", "VARCHAR"),
        ("gender", "VARCHAR"),
        ("address", "VARCHAR"),
        ("parent_guardian_name", "VARCHAR"),
        ("relationship_to_student", "VARCHAR"),
        ("previous_school", "VARCHAR"),
        ("payment_plan", "VARCHAR"),
        ("payment_method", "VARCHAR"),
        ("amount_paid", "FLOAT DEFAULT 0.0"),
        ("requirements_submitted", "TEXT"),
        ("enrollment_status", "VARCHAR DEFAULT 'Pending Downpayment'"),
    ]

    with engine.connect() as conn:
        cols = [
            row[1]
            for row in conn.execute(text("PRAGMA table_info(parents)")).fetchall()
        ]
        for col_name, col_type in new_columns:
            if col_name not in cols:
                conn.execute(
                    text(f"ALTER TABLE parents ADD COLUMN {col_name} {col_type}")
                )
        pn_cols = [
            row[1]
            for row in conn.execute(text("PRAGMA table_info(promissory_notes)")).fetchall()
        ]
        if pn_cols and "student_id_no" not in pn_cols:
            conn.execute(text("DROP TABLE promissory_notes"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Ensure default test student account has complete demo data
        test_student = (
            db.query(Parent).filter(Parent.email == "test@example.com").first()
        )
        if test_student is None:
            test_student = Parent(
                name="Juan Santos Dela Cruz",
                email="test@example.com",
                phone="09171234567",
                hashed_password=get_password_hash("test123"),
                role="parent",
                is_active=True,
                is_verified=True,
                student_id_no="LKA-2026-0651",
                student_name="Juan Santos Dela Cruz",
                student_lrn="136498000123",
                student_type="new",
                grade_level="Grade 1",
                class_shift="morning",
                assigned_section="Section 1 (Morning)",
                birthdate="2019-08-14",
                gender="Male",
                address="Phase 4-B, Pkg 7, Blk 103, Brgy. Bagong Silang, Caloocan City",
                parent_guardian_name="Maria Santos Dela Cruz",
                relationship_to_student="Mother",
                previous_school="Bagong Silang Day Care Center",
                payment_plan="monthly",
                payment_method="gcash",
                amount_paid=7155.50,
                requirements_submitted=json.dumps(
                    ["psa_birth_cert", "id_picture_2x2", "kinder_cert_sf9"]
                ),
                enrollment_status="Officially Enrolled",
            )
            db.add(test_student)
            db.commit()
            db.refresh(test_student)
        else:
            test_student.requirements_submitted = json.dumps(
                ["psa_birth_cert", "id_picture_2x2", "kinder_cert_sf9"]
            )
            test_student.enrollment_status = "Officially Enrolled"
            if not test_student.student_name:
                test_student.student_id_no = "LKA-2026-0651"
                test_student.student_name = "Juan Santos Dela Cruz"
                test_student.student_lrn = "136498000123"
                test_student.student_type = "new"
                test_student.grade_level = "Grade 1"
                test_student.class_shift = "morning"
                test_student.assigned_section = "Section 1 (Morning)"
                test_student.birthdate = "2019-08-14"
                test_student.gender = "Male"
                test_student.address = "Phase 4-B, Pkg 7, Blk 103, Brgy. Bagong Silang, Caloocan City"
                test_student.parent_guardian_name = "Maria Santos Dela Cruz"
                test_student.relationship_to_student = "Mother"
                test_student.payment_plan = "monthly"
                test_student.payment_method = "gcash"
                test_student.amount_paid = 7155.50
            db.commit()

        # Seed initial payment receipt for test student if none exists
        existing_receipt = (
            db.query(PaymentRecord)
            .filter(PaymentRecord.user_id == test_student.id)
            .first()
        )
        if existing_receipt is None:
            db.add(
                PaymentRecord(
                    user_id=test_student.id,
                    or_number="OR-2026-10482",
                    description="Upon Enrollment Downpayment (Miscellaneous Fee)",
                    amount=7155.50,
                    payment_method="GCash",
                    reference_no="GCASH-904821736",
                    paid_at="May 28, 2026 · 09:42 AM",
                    status="Verified & Official Receipt Issued",
                )
            )
            db.commit()

        # Seed initial approved Promissory Note for test student if none exists
        existing_pn = (
            db.query(PromissoryNote)
            .filter(PromissoryNote.user_id == test_student.id)
            .first()
        )
        if existing_pn is None:
            db.add(
                PromissoryNote(
                    user_id=test_student.id,
                    student_id_no=test_student.student_id_no or "LKA-2026-0651",
                    student_name=test_student.student_name or "Juan Santos Dela Cruz",
                    grade_level=test_student.grade_level or "Grade 1",
                    assigned_section=test_student.assigned_section or "Section 1 (Morning)",
                    guardian_name=test_student.parent_guardian_name or "Maria Santos Dela Cruz",
                    guardian_email=test_student.email,
                    guardian_phone=test_student.phone,
                    exam_quarter="1st Quarter Periodical Exam (August 2026)",
                    amount_covered=1707.00,
                    promised_date="2026-08-22",
                    reason="Salary payout scheduled on August 21; requesting 1-week grace period for 1st Quarter Exam permit.",
                    status="Approved — Exam Permit Granted",
                    permit_code="LKA-PRM-2026-0651",
                    submitted_at="Aug 14, 2026 · 10:15 AM",
                    approved_at="Aug 14, 2026 · 11:02 AM",
                )
            )
            db.commit()

        # Seed a second student account with a Pending Promissory Note for Registrar Queue Demo
        second_student = (
            db.query(Parent).filter(Parent.email == "reyes.family@example.com").first()
        )
        if second_student is None:
            second_student = Parent(
                name="Sofia Mae Reyes",
                email="reyes.family@example.com",
                phone="09182345678",
                hashed_password=get_password_hash("test123"),
                role="parent",
                is_active=True,
                is_verified=True,
                student_id_no="LKA-2026-0650",
                student_name="Sofia Mae Reyes",
                student_lrn="136498000456",
                student_type="old",
                grade_level="Grade 4",
                class_shift="afternoon",
                assigned_section="Section 3 (Afternoon)",
                birthdate="2016-11-05",
                gender="Female",
                address="Phase 4-B, Pkg 7, Brgy. Bagong Silang, Caloocan City",
                parent_guardian_name="Roberto Reyes",
                relationship_to_student="Father",
                previous_school="Lyceum ng Kabataan Academy, Inc.",
                payment_plan="quarterly",
                payment_method="cash",
                amount_paid=7155.50,
                requirements_submitted=json.dumps(
                    ["report_card_sf9", "previous_balance_clearance", "id_picture_renewal"]
                ),
                enrollment_status="Officially Enrolled",
            )
            db.add(second_student)
            db.commit()
            db.refresh(second_student)

            db.add(
                PromissoryNote(
                    user_id=second_student.id,
                    student_id_no="LKA-2026-0650",
                    student_name="Sofia Mae Reyes",
                    grade_level="Grade 4",
                    assigned_section="Section 3 (Afternoon)",
                    guardian_name="Roberto Reyes",
                    guardian_email="reyes.family@example.com",
                    guardian_phone="09182345678",
                    exam_quarter="1st Quarter Periodical Exam (August 2026)",
                    amount_covered=4519.25,
                    promised_date="2026-08-24",
                    reason="Waiting for remittance; requesting 1-week promissory extension before August Periodical Exam.",
                    status="Pending Registrar Approval",
                    permit_code="LKA-PRM-2026-0650",
                    submitted_at="Aug 15, 2026 · 08:30 AM",
                    approved_at=None,
                )
            )
            db.commit()

        staff_accounts = [
            {
                "name": "School Registrar",
                "email": "registrar@lyceum.edu.ph",
                "phone": "09170000002",
                "password": "registrar123",
                "role": "registrar",
            },
            {
                "name": "School Administrator",
                "email": "admin@lyceum.edu.ph",
                "phone": "09170000001",
                "password": "admin123",
                "role": "admin",
            },
        ]

        for acc in staff_accounts:
            existing = db.query(Parent).filter(Parent.email == acc["email"]).first()
            if existing is None:
                db.add(
                    Parent(
                        name=acc["name"],
                        email=acc["email"],
                        phone=acc["phone"],
                        hashed_password=get_password_hash(acc["password"]),
                        role=acc["role"],
                        is_active=True,
                        is_verified=True,
                    )
                )
            else:
                existing.role = acc["role"]
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "message": "Lyceum Enrollment API is running"}
