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
        ("plain_password", "VARCHAR"),
        ("contact_email", "VARCHAR"),
    ]

    if engine.dialect.name == "sqlite":
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
                for row in conn.execute(
                    text("PRAGMA table_info(promissory_notes)")
                ).fetchall()
            ]
            if pn_cols and "student_id_no" not in pn_cols:
                conn.execute(text("DROP TABLE promissory_notes"))
            conn.commit()
    else:
        with engine.connect() as conn:
            conn.execute(
                text("ALTER TABLE parents ADD COLUMN IF NOT EXISTS plain_password VARCHAR")
            )
            conn.execute(
                text("ALTER TABLE parents ADD COLUMN IF NOT EXISTS contact_email VARCHAR")
            )
            conn.commit()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
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
                        plain_password=acc["password"],
                        role=acc["role"],
                        is_active=True,
                        is_verified=True,
                    )
                )
            else:
                existing.role = acc["role"]
                if not existing.plain_password:
                    existing.plain_password = acc["password"]
        default_student_passwords = {
            "test@example.com": "test123",
            "reyes.family@example.com": "test123",
            "mendoza.due@example.com": "test123",
            "johnlaguerta3223@gmail.com": "test123",
        }
        for stu_email, stu_pw in default_student_passwords.items():
            stu_row = db.query(Parent).filter(Parent.email == stu_email).first()
            if stu_row and not stu_row.plain_password:
                stu_row.plain_password = stu_pw
        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"status": "ok", "message": "Lyceum Enrollment API is running"}
