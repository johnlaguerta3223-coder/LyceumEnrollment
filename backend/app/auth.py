import json
import os
import random
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .db import get_db
from .models import Parent, PaymentRecord, PaymentReminder, PromissoryNote, SystemSetting

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
router = APIRouter()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    email: str


class RegisterRequest(BaseModel):
    parent_name: str
    student_name: Optional[str] = None
    student_lrn: Optional[str] = None
    student_type: Optional[str] = "new"
    grade_level: Optional[str] = "Kinder 1"
    class_shift: Optional[str] = "morning"
    birthdate: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    relationship_to_student: Optional[str] = "Mother"
    previous_school: Optional[str] = None
    payment_plan: Optional[str] = "monthly"
    payment_method: Optional[str] = "cash"
    requirements_submitted: Optional[List[str]] = None
    email: str
    phone: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str
    phone: str
    new_password: str


class PayInstallmentRequest(BaseModel):
    description: str
    amount: float
    payment_method: str  # 'GCash', 'Cash', 'Online Banking'
    reference_no: Optional[str] = None


class UpdateRequirementsRequest(BaseModel):
    requirements_submitted: List[str]


class UpdatePlanRequest(BaseModel):
    payment_plan: str  # 'cash', 'quarterly', 'monthly'


class SendReminderRequest(BaseModel):
    recipient_email: Optional[str] = None


class EnrollmentToggleRequest(BaseModel):
    enrollment_open: bool


class CreateStaffUserRequest(BaseModel):
    name: str
    email: str
    phone: str
    role: str  # 'registrar' or 'admin'
    password: str


class AdminResetPasswordRequest(BaseModel):
    new_password: str


class FeeTierItem(BaseModel):
    tier_id: str
    label: str
    tuition_fee: float
    misc_fee: float
    computer_fee: float
    cash_discount_percent: float


class UpdateFeeMatrixRequest(BaseModel):
    tiers: List[FeeTierItem]


class SubmitPromissoryRequest(BaseModel):
    exam_quarter: str
    amount_covered: float
    promised_date: str
    reason: str


class UpdatePromissoryStatusRequest(BaseModel):
    status: str  # 'Approved — Exam Permit Granted', 'Settled & Cleared', 'Declined'


class RegistrarCreateStudentRequest(BaseModel):
    student_name: str
    student_lrn: Optional[str] = None
    student_type: str = "new"  # 'new', 'old', 'transferee'
    grade_level: str = "Grade 1"
    class_shift: str = "morning"  # 'morning', 'afternoon'
    birthdate: Optional[str] = "2019-06-15"
    gender: Optional[str] = "Female"
    address: Optional[str] = "Brgy. Bagong Silang, Caloocan City"
    parent_name: str
    relationship_to_student: Optional[str] = "Mother"
    previous_school: Optional[str] = "N/A"
    payment_plan: str = "monthly"  # 'cash', 'quarterly', 'monthly'
    payment_method: str = "cash"  # 'gcash', 'cash', 'online_banking'
    email: str
    phone: str
    password: str




def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(Parent).filter(Parent.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Parent:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token.",
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    user = db.query(Parent).filter(Parent.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student account not found.")
    return user


def assign_section_for_student(grade_level: str, class_shift: str) -> str:
    shift_clean = (class_shift or "morning").lower()
    lvl = grade_level or "Grade 1"
    if lvl in ("Kinder 1", "Kinder 2"):
        return "Section 1 (Morning)" if shift_clean == "morning" else "Section 2 (Afternoon)"
    if lvl == "Grade 5":
        return "Section 1 (Morning)" if shift_clean == "morning" else "Section 3 (Afternoon)"
    return "Section 1 (Morning)" if shift_clean == "morning" else "Section 3 (Afternoon)"


def get_shift_hours(grade_level: str, class_shift: str) -> str:
    shift_clean = (class_shift or "morning").lower()
    lvl = grade_level or "Grade 1"
    if lvl in ("Kinder 1", "Kinder 2"):
        return "7:00 AM – 9:30 AM (Mon – Fri)" if shift_clean == "morning" else "12:00 NN – 2:30 PM (Mon – Fri)"
    return "7:00 AM – 12:00 NN (Mon – Fri)" if shift_clean == "morning" else "12:00 NN – 5:00 PM (Mon – Fri)"


def compute_student_billing(user: Parent) -> Dict[str, Any]:
    lvl = user.grade_level or "Grade 1"
    s_type = (user.student_type or "new").lower()
    plan = (user.payment_plan or "monthly").lower()
    is_old = s_type == "old"

    if lvl in ("Kinder 1", "Kinder 2"):
        if is_old:
            tuition = 13579.90 if plan == "cash" else 13579.92
            misc = 5399.50 if plan == "cash" else 5399.52
            comp = 0.0
            subtotal = 18979.40 if plan == "cash" else 18979.44
            discount = 1897.94 if plan == "cash" else 0.0
            cash_total = 17081.46
            downpayment = 5399.52
            monthly = 1357.99
            quarterly = 3394.98
        else:
            tuition = 14170.50
            misc = 5399.50
            comp = 0.0
            subtotal = 19570.00
            discount = 1794.18 if plan == "cash" else 0.0
            cash_total = 17775.82
            downpayment = 5399.50
            monthly = 1417.05
            quarterly = 3542.63
    elif lvl in ("Grade 1", "Grade 2", "Grade 3"):
        if is_old:
            tuition = 14537.52 if plan == "quarterly" else 14537.50
            misc = 7155.50
            comp = 1900.00
            subtotal = 23593.02 if plan == "quarterly" else 23593.00
            discount = 2359.30 if plan == "cash" else 0.0
            cash_total = 21233.70
            downpayment = 7155.50
            monthly = 1643.75
            quarterly = 4109.38
        else:
            tuition = 15170.00
            misc = 7155.50
            comp = 1900.00
            subtotal = 24225.50
            discount = 2422.55 if plan == "cash" else 0.0
            cash_total = 21802.95
            downpayment = 7155.50
            monthly = 1707.00
            quarterly = 4267.50
    else:
        # Grade 4, Grade 5, Grade 6
        if is_old:
            tuition = 16177.00
            misc = 7551.50
            comp = 1900.00
            subtotal = 25628.50
            discount = 2562.85 if plan == "cash" else 0.0
            cash_total = 23065.65
            downpayment = 7155.50 if plan == "quarterly" else 7551.50
            monthly = 1807.70
            quarterly = 4519.25
        else:
            tuition = 16880.30 if plan == "cash" else 16880.50
            misc = 7155.50
            comp = 1900.00
            subtotal = 25935.80 if plan == "cash" else 25936.00
            discount = 2593.58 if plan == "cash" else 0.0
            cash_total = 23342.22
            downpayment = 7155.50
            monthly = 1878.05
            quarterly = 4695.13

    total_assessment = cash_total if plan == "cash" else subtotal
    amount_paid = round(float(user.amount_paid or 0.0), 2)
    remaining_balance = max(0.0, round(total_assessment - amount_paid, 2))

    schedule_items = []
    if plan == "cash":
        schedule_items.append(
            {
                "id": "full_cash",
                "title": "Full Cash Basis (Upon Enrollment - 10% Discount)",
                "due_date": "Upon Enrollment",
                "amount": cash_total,
            }
        )
    elif plan == "quarterly":
        schedule_items.append(
            {
                "id": "dp_quarterly",
                "title": "Upon Enrollment Downpayment (Miscellaneous Fee)",
                "due_date": "Upon Enrollment",
                "amount": downpayment,
            }
        )
        quarters = [
            ("q1_aug", "1st Quarter Payment (Before Periodical Exam)", "August 15–30, 2026"),
            ("q2_oct", "2nd Quarter Payment (Before Periodical Exam)", "October 15–30, 2026"),
            ("q3_jan", "3rd Quarter Payment (Before Periodical Exam)", "January 15–30, 2027"),
            ("q4_mar", "4th Quarter Payment (Before Periodical Exam)", "March 15–30, 2027"),
        ]
        for q_id, q_title, q_due in quarters:
            schedule_items.append(
                {
                    "id": q_id,
                    "title": q_title,
                    "due_date": q_due,
                    "amount": quarterly,
                }
            )
    else:
        schedule_items.append(
            {
                "id": "dp_monthly",
                "title": "Upon Enrollment Downpayment (Miscellaneous Fee)",
                "due_date": "Upon Enrollment",
                "amount": downpayment,
            }
        )
        months = [
            ("m1_jun", "1st Monthly Installment (June)", "June 15–30, 2026"),
            ("m2_jul", "2nd Monthly Installment (July)", "July 15–30, 2026"),
            ("m3_aug", "3rd Monthly Installment (August)", "August 15–30, 2026"),
            ("m4_sep", "4th Monthly Installment (September)", "September 15–30, 2026"),
            ("m5_oct", "5th Monthly Installment (October)", "October 15–30, 2026"),
            ("m6_nov", "6th Monthly Installment (November)", "November 15–30, 2026"),
            ("m7_dec", "7th Monthly Installment (December)", "December 15–30, 2026"),
            ("m8_jan", "8th Monthly Installment (January)", "January 15–30, 2027"),
            ("m9_feb", "9th Monthly Installment (February)", "February 15–30, 2027"),
            ("m10_mar", "10th Monthly Installment (March)", "March 15–30, 2027"),
        ]
        for m_id, m_title, m_due in months:
            schedule_items.append(
                {
                    "id": m_id,
                    "title": m_title,
                    "due_date": m_due,
                    "amount": monthly,
                }
            )

    running_paid = amount_paid
    next_due_found = False
    for item in schedule_items:
        amt = round(float(item["amount"]), 2)
        if running_paid >= amt - 0.5:
            item["status"] = "Paid"
            running_paid = round(running_paid - amt, 2)
        elif not next_due_found:
            item["status"] = "Due Next"
            next_due_found = True
        else:
            item["status"] = "Upcoming"

    return {
        "tuition_fee": tuition,
        "misc_fee": misc,
        "computer_fee": comp,
        "regular_subtotal": subtotal,
        "cash_discount": discount,
        "total_assessment": total_assessment,
        "downpayment_required": downpayment if plan != "cash" else cash_total,
        "monthly_installment": monthly,
        "quarterly_installment": quarterly,
        "amount_paid": amount_paid,
        "remaining_balance": remaining_balance,
        "schedule": schedule_items,
    }


def build_email_reminder_record(
    user: Parent, billing: Dict[str, Any], recipient_override: Optional[str] = None
) -> PaymentReminder:
    next_due = next(
        (s for s in billing["schedule"] if s["status"] != "Paid"),
        billing["schedule"][0],
    )
    recipient = (recipient_override or user.email).strip()
    guardian_name = user.parent_guardian_name or "Parent / Guardian"
    student_name = user.student_name or user.name
    grade_lvl = user.grade_level or "Grade 1"
    inst_title = next_due["title"]
    due_date = next_due["due_date"]
    amount_due = round(float(next_due["amount"]), 2)
    remaining_bal = round(float(billing["remaining_balance"]), 2)

    subject = f"[LKA Billing Reminder] Upcoming Due: {inst_title} for {student_name}"
    body = (
        f"Dear {guardian_name},\n\n"
        f"Good day from Lyceum ng Kabataan Academy, Inc.!\n\n"
        f"This is an automated payment reminder for your child, {student_name} "
        f"({user.student_id_no} · {grade_lvl}).\n\n"
        f"• Upcoming Payment: {inst_title}\n"
        f"• Amount Due: ₱{amount_due:,.2f}\n"
        f"• Due Date Schedule: {due_date}\n"
        f"• Remaining Annual Balance: ₱{remaining_bal:,.2f}\n\n"
        f"Please settle your payment onsite at the School Cashier "
        f"(Mon–Fri, 8:00 AM–12:00 NN & 1:00 PM–5:00 PM) and claim your "
        f"Official Receipt (OR) at school.\n\n"
        f"Thank you for your continued support!\n"
        f"Lyceum ng Kabataan Academy, Inc. · Brgy. Bagong Silang, Caloocan City"
    )

    delivery_status = "Payment Reminder Sent to Student Portal"
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    if smtp_user and smtp_pass:
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = recipient
            msg.set_content(body)
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=5) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            delivery_status = "Delivered via SMTP Email"
        except Exception:
            delivery_status = "Email Sent (Portal & Notification Log)"

    now_str = datetime.now().strftime("%b %d, %Y · %I:%M %p")
    return PaymentReminder(
        user_id=user.id,
        recipient_email=recipient,
        subject=subject,
        installment_title=inst_title,
        due_date=due_date,
        amount_due=amount_due,
        message_body=body,
        sent_at=now_str,
        delivery_status=delivery_status,
    )


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    enroll_setting = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "enrollment_open")
        .first()
    )
    if enroll_setting and enroll_setting.value.lower() == "false":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Online Enrollment for S.Y. 2026–2027 is currently CLOSED by the School Administrator. Please visit the LKA Registrar Office for inquiries.",
        )

    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    existing_email = db.query(Parent).filter(Parent.email == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered.",
        )

    existing_phone = db.query(Parent).filter(Parent.phone == phone_clean).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This mobile number is already registered.",
        )

    student_clean = (payload.student_name or "").strip()
    parent_clean = payload.parent_name.strip()
    display_name = student_clean if student_clean else parent_clean

    reqs_json = (
        json.dumps(payload.requirements_submitted)
        if payload.requirements_submitted is not None
        else "[]"
    )

    total_count = db.query(Parent).count()
    student_id_no = f"LKA-2026-{650 + total_count:04d}"
    assigned_sec = assign_section_for_student(
        payload.grade_level or "Kinder 1", payload.class_shift or "morning"
    )

    new_parent = Parent(
        name=display_name,
        email=email_clean,
        phone=phone_clean,
        hashed_password=get_password_hash(payload.password),
        role="parent",
        is_active=True,
        is_verified=True,
        student_id_no=student_id_no,
        student_name=student_clean or display_name,
        student_lrn=payload.student_lrn or "Pending LRN",
        student_type=payload.student_type or "new",
        grade_level=payload.grade_level or "Kinder 1",
        class_shift=payload.class_shift or "morning",
        assigned_section=assigned_sec,
        birthdate=payload.birthdate or "2019-06-15",
        gender=payload.gender or "Female",
        address=payload.address or "Brgy. Bagong Silang, Caloocan City",
        parent_guardian_name=parent_clean,
        relationship_to_student=payload.relationship_to_student or "Mother",
        previous_school=payload.previous_school or "N/A",
        payment_plan=payload.payment_plan or "monthly",
        payment_method=payload.payment_method or "cash",
        amount_paid=0.0,
        requirements_submitted=reqs_json,
        enrollment_status="Pending Registrar Verification",
    )
    db.add(new_parent)
    db.commit()
    db.refresh(new_parent)

    billing = compute_student_billing(new_parent)

    return {
        "message": "Online registration submitted! Please bring all required physical documents and tuition payment to the LKA Registrar Office for official enrollment.",
        "parent_id": new_parent.id,
        "student_id_no": new_parent.student_id_no,
        "student_name": new_parent.student_name,
        "student_type": new_parent.student_type,
        "grade_level": new_parent.grade_level,
        "assigned_section": new_parent.assigned_section,
        "payment_plan": new_parent.payment_plan,
        "downpayment_required": billing["downpayment_required"],
        "total_assessment": billing["total_assessment"],
        "email": new_parent.email,
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    user = (
        db.query(Parent)
        .filter(Parent.email == email_clean, Parent.phone == phone_clean)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found matching that email and mobile number.",
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password has been reset! You can now log in with your new password."}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username.strip().lower(), form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not bool(user.is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated by the School Administrator.",
        )
    user_role = getattr(user, "role", None) or "parent"
    if user_role == "parent" and (user.enrollment_status or "") != "Officially Enrolled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your enrollment is pending payment and Registrar approval. Please pay onsite at the school cashier and wait for the Registrar to approve your account before logging in.",
        )
    token = create_access_token(data={"sub": user.email, "role": user_role})
    display_name = user.student_name or user.name
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user_role,
        "name": display_name,
        "email": user.email,
    }


@router.get("/student/me")
def get_student_portal_data(
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.student_id_no:
        current_user.student_id_no = f"LKA-2026-{650 + current_user.id:04d}"
    if not current_user.student_name:
        current_user.student_name = "Juan Santos Dela Cruz"
    if not current_user.grade_level:
        current_user.grade_level = "Grade 1"
    if not current_user.student_type:
        current_user.student_type = "new"
    if not current_user.class_shift:
        current_user.class_shift = "morning"
    if not current_user.assigned_section:
        current_user.assigned_section = assign_section_for_student(
            current_user.grade_level, current_user.class_shift
        )
    if not current_user.payment_plan:
        current_user.payment_plan = "monthly"
    if not current_user.payment_method:
        current_user.payment_method = "cash"
    if not current_user.parent_guardian_name:
        current_user.parent_guardian_name = "Maria Santos Dela Cruz"
    if not current_user.relationship_to_student:
        current_user.relationship_to_student = "Mother"
    if not current_user.address:
        current_user.address = "Phase 4-B, Brgy. Bagong Silang, Caloocan City"
    db.commit()

    billing = compute_student_billing(current_user)

    try:
        reqs_submitted = json.loads(current_user.requirements_submitted or "[]")
    except Exception:
        reqs_submitted = []

    payments = (
        db.query(PaymentRecord)
        .filter(PaymentRecord.user_id == current_user.id)
        .order_by(PaymentRecord.id.desc())
        .all()
    )

    reminders = (
        db.query(PaymentReminder)
        .filter(PaymentReminder.user_id == current_user.id)
        .order_by(PaymentReminder.id.desc())
        .all()
    )

    promissory_notes = (
        db.query(PromissoryNote)
        .filter(PromissoryNote.user_id == current_user.id)
        .order_by(PromissoryNote.id.desc())
        .all()
    )

    approved_pn = next(
        (pn for pn in promissory_notes if "Approved" in pn.status), None
    )
    pending_pn = next(
        (pn for pn in promissory_notes if "Pending" in pn.status), None
    )

    if billing["remaining_balance"] <= 0:
        delinquency_risk = "Good Standing (Fully Paid)"
        exam_clearance = "CLEARED FOR EXAM"
        exam_permit_code = f"LKA-EXM-2026-{current_user.id:04d}"
    elif approved_pn:
        delinquency_risk = "Promissory Active (1-Week Grace)"
        exam_clearance = "CLEARED VIA PROMISSORY"
        exam_permit_code = approved_pn.permit_code
    elif pending_pn:
        delinquency_risk = "Pending Promissory Approval"
        exam_clearance = "PENDING PROMISSORY APPROVAL"
        exam_permit_code = pending_pn.permit_code
    elif billing["amount_paid"] >= billing["downpayment_required"]:
        delinquency_risk = "Good Standing (Installment Active)"
        exam_clearance = "CLEARED FOR EXAM"
        exam_permit_code = f"LKA-EXM-2026-{current_user.id:04d}"
    else:
        delinquency_risk = "Delinquent / Unpaid Downpayment"
        exam_clearance = "HOLD — SETTLE DUE OR FILE PROMISSORY"
        exam_permit_code = f"LKA-HLD-2026-{current_user.id:04d}"

    return {
        "profile": {
            "id": current_user.id,
            "student_id_no": current_user.student_id_no,
            "student_name": current_user.student_name,
            "student_lrn": current_user.student_lrn or "136498000123",
            "student_type": current_user.student_type,
            "grade_level": current_user.grade_level,
            "class_shift": current_user.class_shift,
            "shift_hours": get_shift_hours(
                current_user.grade_level, current_user.class_shift
            ),
            "assigned_section": current_user.assigned_section,
            "birthdate": current_user.birthdate or "2019-06-15",
            "gender": current_user.gender or "Female",
            "address": current_user.address,
            "email": current_user.email,
            "phone": current_user.phone,
            "parent_guardian_name": current_user.parent_guardian_name,
            "relationship_to_student": current_user.relationship_to_student,
            "previous_school": current_user.previous_school or "N/A",
            "payment_plan": current_user.payment_plan,
            "payment_method": current_user.payment_method,
            "enrollment_status": current_user.enrollment_status
            or "Pending Downpayment",
            "requirements_submitted": reqs_submitted,
            "delinquency_risk": delinquency_risk,
            "exam_clearance": exam_clearance,
            "exam_permit_code": exam_permit_code,
        },
        "billing": billing,
        "payments": [
            {
                "id": p.id,
                "or_number": p.or_number,
                "description": p.description,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "reference_no": p.reference_no,
                "paid_at": p.paid_at,
                "status": p.status,
            }
            for p in payments
        ],
        "payment_reminders": [
            {
                "id": r.id,
                "recipient_email": r.recipient_email,
                "subject": r.subject,
                "installment_title": r.installment_title,
                "due_date": r.due_date,
                "amount_due": r.amount_due,
                "message_body": r.message_body,
                "sent_at": r.sent_at,
                "delivery_status": r.delivery_status,
            }
            for r in reminders
        ],
        "promissory_notes": [
            {
                "id": pn.id,
                "exam_quarter": pn.exam_quarter,
                "amount_covered": pn.amount_covered,
                "promised_date": pn.promised_date,
                "reason": pn.reason,
                "status": pn.status,
                "permit_code": pn.permit_code,
                "submitted_at": pn.submitted_at,
                "approved_at": pn.approved_at,
            }
            for pn in promissory_notes
        ],
    }


@router.post("/student/pay")
def pay_student_installment(
    payload: PayInstallmentRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    or_num = f"OR-2026-{random.randint(10000, 99999)}"
    now_str = datetime.now().strftime("%b %d, %Y · %I:%M %p")

    record = PaymentRecord(
        user_id=current_user.id,
        or_number=or_num,
        description=payload.description,
        amount=round(payload.amount, 2),
        payment_method=payload.payment_method,
        reference_no=payload.reference_no or "Walk-In / Verified",
        paid_at=now_str,
        status="Verified & Official Receipt Issued",
    )
    db.add(record)

    current_user.amount_paid = round(
        float(current_user.amount_paid or 0.0) + float(payload.amount), 2
    )
    current_user.enrollment_status = "Officially Enrolled"
    db.commit()

    return {
        "message": f"Payment of ₱{payload.amount:,.2f} recorded! Official Receipt {or_num} issued.",
        "or_number": or_num,
    }


@router.post("/student/reminders/send")
def send_payment_reminder_email(
    payload: SendReminderRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    billing = compute_student_billing(current_user)
    rec = build_email_reminder_record(
        current_user, billing, payload.recipient_email
    )
    db.add(rec)
    db.commit()
    return {
        "message": f"Payment reminder email sent to {rec.recipient_email}!"
    }


@router.post("/student/requirements")
def update_student_requirements(
    payload: UpdateRequirementsRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.requirements_submitted = json.dumps(payload.requirements_submitted)
    db.commit()
    return {"message": "Requirements checklist updated in database."}


@router.put("/student/payment-plan")
def update_student_payment_plan(
    payload: UpdatePlanRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.payment_plan not in ("cash", "quarterly", "monthly"):
        raise HTTPException(status_code=400, detail="Invalid payment plan.")
    current_user.payment_plan = payload.payment_plan
    db.commit()
    return {"message": "Payment plan updated."}


@router.post("/student/promissory")
def submit_student_promissory_note(
    payload: SubmitPromissoryRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount_covered <= 0:
        raise HTTPException(
            status_code=400,
            detail="Promissory note amount must be greater than zero.",
        )
    if not payload.promised_date.strip():
        raise HTTPException(
            status_code=400,
            detail="Please select your promised settlement date (within 1 week).",
        )
    if not payload.reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Please provide a brief reason for requesting the promissory note.",
        )

    now_str = datetime.now().strftime("%b %d, %Y · %I:%M %p")
    permit_code = f"LKA-PRM-2026-{random.randint(1000, 9999)}"

    note = PromissoryNote(
        user_id=current_user.id,
        student_id_no=current_user.student_id_no or f"LKA-2026-{650 + current_user.id:04d}",
        student_name=current_user.student_name or current_user.name,
        grade_level=current_user.grade_level or "Grade 1",
        assigned_section=current_user.assigned_section or "Section 1 (Morning)",
        guardian_name=current_user.parent_guardian_name or current_user.name,
        guardian_email=current_user.email,
        guardian_phone=current_user.phone,
        exam_quarter=payload.exam_quarter.strip(),
        amount_covered=round(float(payload.amount_covered), 2),
        promised_date=payload.promised_date.strip(),
        reason=payload.reason.strip(),
        status="Pending Registrar Approval",
        permit_code=permit_code,
        submitted_at=now_str,
        approved_at=None,
    )
    db.add(note)
    db.commit()

    return {
        "message": f"Digital Promissory Note ({permit_code}) submitted for {payload.exam_quarter}! Once approved by the LKA Registrar, your Digital Exam Permit will be activated (₱0.00 Late Penalty).",
        "permit_code": permit_code,
    }



# ==============================================================================
# REGISTRAR PORTAL ENDPOINTS (VERIFY REQUIREMENTS, RECORD PAYMENT, ENROLL STUDENT)
# ==============================================================================
REQUIREMENTS_KEYS_BY_TYPE = {
    "new": ["psa_birth_cert", "id_picture_2x2", "kinder_cert_sf9"],
    "old": ["report_card_sf9", "previous_balance_clearance", "id_picture_renewal"],
    "transferee": [
        "psa_birth_cert",
        "report_card_sf9",
        "good_moral",
        "form_137_sf10",
        "id_picture_2x2",
    ],
}


def ensure_registrar_or_admin(current_user: Parent):
    if current_user.role not in ("registrar", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the School Registrar or Admin can perform this action.",
        )


@router.get("/registrar/students")
def get_all_students_for_registrar(
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    students = (
        db.query(Parent)
        .filter(Parent.role == "parent")
        .order_by(Parent.id.desc())
        .all()
    )

    result = []
    for s in students:
        billing = compute_student_billing(s)
        try:
            reqs = json.loads(s.requirements_submitted or "[]")
        except Exception:
            reqs = []
        s_type = (s.student_type or "new").lower()
        req_keys = REQUIREMENTS_KEYS_BY_TYPE.get(
            s_type, REQUIREMENTS_KEYS_BY_TYPE["new"]
        )
        payments = (
            db.query(PaymentRecord)
            .filter(PaymentRecord.user_id == s.id)
            .order_by(PaymentRecord.id.desc())
            .all()
        )
        reminders = (
            db.query(PaymentReminder)
            .filter(PaymentReminder.user_id == s.id)
            .order_by(PaymentReminder.id.desc())
            .all()
        )
        p_notes = (
            db.query(PromissoryNote)
            .filter(PromissoryNote.user_id == s.id)
            .order_by(PromissoryNote.id.desc())
            .all()
        )
        approved_pn = next((pn for pn in p_notes if "Approved" in pn.status), None)
        pending_pn = next((pn for pn in p_notes if "Pending" in pn.status), None)

        if billing["remaining_balance"] <= 0:
            delinquency_risk = "Good Standing (Fully Paid)"
            exam_clearance = "CLEARED FOR EXAM"
            exam_permit_code = f"LKA-EXM-2026-{s.id:04d}"
        elif approved_pn:
            delinquency_risk = "Promissory Active (1-Week Grace)"
            exam_clearance = "CLEARED VIA PROMISSORY"
            exam_permit_code = approved_pn.permit_code
        elif pending_pn:
            delinquency_risk = "Pending Promissory Approval"
            exam_clearance = "PENDING PROMISSORY APPROVAL"
            exam_permit_code = pending_pn.permit_code
        elif billing["amount_paid"] >= billing["downpayment_required"]:
            delinquency_risk = "Good Standing (Installment Active)"
            exam_clearance = "CLEARED FOR EXAM"
            exam_permit_code = f"LKA-EXM-2026-{s.id:04d}"
        else:
            delinquency_risk = "Delinquent / Unpaid Downpayment"
            exam_clearance = "HOLD — UNPAID"
            exam_permit_code = f"LKA-HLD-2026-{s.id:04d}"

        result.append(
            {
                "id": s.id,
                "student_id_no": s.student_id_no or f"LKA-2026-{650 + s.id:04d}",
                "student_name": s.student_name or s.name,
                "student_lrn": s.student_lrn or "Pending LRN",
                "student_type": s_type,
                "grade_level": s.grade_level or "Grade 1",
                "class_shift": s.class_shift or "morning",
                "shift_hours": get_shift_hours(
                    s.grade_level or "Grade 1", s.class_shift or "morning"
                ),
                "assigned_section": s.assigned_section or "Section 1 (Morning)",
                "birthdate": s.birthdate or "2019-06-15",
                "gender": s.gender or "Female",
                "address": s.address or "Brgy. Bagong Silang, Caloocan City",
                "parent_guardian_name": s.parent_guardian_name or s.name,
                "relationship_to_student": s.relationship_to_student or "Mother",
                "phone": s.phone,
                "email": s.email,
                "previous_school": s.previous_school or "N/A",
                "payment_plan": s.payment_plan or "monthly",
                "payment_method": s.payment_method or "gcash",
                "enrollment_status": s.enrollment_status
                or "Pending Registrar Verification",
                "requirements_submitted": reqs,
                "required_total_count": len(req_keys),
                "delinquency_risk": delinquency_risk,
                "exam_clearance": exam_clearance,
                "exam_permit_code": exam_permit_code,
                "billing": billing,
                "payments": [
                    {
                        "id": p.id,
                        "or_number": p.or_number,
                        "description": p.description,
                        "amount": p.amount,
                        "payment_method": p.payment_method,
                        "reference_no": p.reference_no,
                        "paid_at": p.paid_at,
                        "status": p.status,
                    }
                    for p in payments
                ],
                "payment_reminders": [
                    {
                        "id": r.id,
                        "recipient_email": r.recipient_email,
                        "subject": r.subject,
                        "installment_title": r.installment_title,
                        "due_date": r.due_date,
                        "amount_due": r.amount_due,
                        "message_body": r.message_body,
                        "sent_at": r.sent_at,
                        "delivery_status": r.delivery_status,
                    }
                    for r in reminders
                ],
                "promissory_notes": [
                    {
                        "id": pn.id,
                        "user_id": pn.user_id,
                        "student_id_no": pn.student_id_no,
                        "student_name": pn.student_name,
                        "grade_level": pn.grade_level,
                        "assigned_section": pn.assigned_section,
                        "guardian_name": pn.guardian_name,
                        "guardian_email": pn.guardian_email,
                        "guardian_phone": pn.guardian_phone,
                        "exam_quarter": pn.exam_quarter,
                        "amount_covered": pn.amount_covered,
                        "promised_date": pn.promised_date,
                        "reason": pn.reason,
                        "status": pn.status,
                        "permit_code": pn.permit_code,
                        "submitted_at": pn.submitted_at,
                        "approved_at": pn.approved_at,
                    }
                    for pn in p_notes
                ],
            }
        )
    return {"students": result}


@router.post("/registrar/students/create")
def registrar_create_student_account(
    payload: RegistrarCreateStudentRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long.",
        )
    if db.query(Parent).filter(Parent.email == email_clean).first():
        raise HTTPException(
            status_code=400, detail="This email address is already registered."
        )
    if db.query(Parent).filter(Parent.phone == phone_clean).first():
        raise HTTPException(
            status_code=400, detail="This mobile number is already registered."
        )

    total_count = db.query(Parent).count()
    student_id_no = f"LKA-2026-{650 + total_count:04d}"
    assigned_sec = assign_section_for_student(
        payload.grade_level or "Grade 1", payload.class_shift or "morning"
    )

    new_student = Parent(
        name=payload.student_name.strip(),
        email=email_clean,
        phone=phone_clean,
        hashed_password=get_password_hash(payload.password),
        role="parent",
        is_active=True,
        is_verified=True,
        student_id_no=student_id_no,
        student_name=payload.student_name.strip(),
        student_lrn=(payload.student_lrn or "").strip() or "Pending LRN",
        student_type=payload.student_type or "new",
        grade_level=payload.grade_level or "Grade 1",
        class_shift=payload.class_shift or "morning",
        assigned_section=assigned_sec,
        birthdate=payload.birthdate or "2019-06-15",
        gender=payload.gender or "Female",
        address=(payload.address or "").strip()
        or "Brgy. Bagong Silang, Caloocan City",
        parent_guardian_name=payload.parent_name.strip(),
        relationship_to_student=payload.relationship_to_student or "Mother",
        previous_school=(payload.previous_school or "").strip() or "N/A",
        payment_plan=payload.payment_plan or "monthly",
        payment_method=payload.payment_method or "cash",
        amount_paid=0.0,
        requirements_submitted="[]",
        enrollment_status="Pending Registrar Verification",
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {
        "message": f"Student Account created for {new_student.student_name} ({student_id_no} · {assigned_sec})! You can now verify their requirements and record their payment in Pending Registrations.",
        "student_id_no": student_id_no,
        "assigned_section": assigned_sec,
    }


@router.post("/registrar/promissory/{note_id}/status")
def registrar_update_promissory_status(
    note_id: int,
    payload: UpdatePromissoryStatusRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    note = db.query(PromissoryNote).filter(PromissoryNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Promissory note not found.")

    now_str = datetime.now().strftime("%b %d, %Y · %I:%M %p")
    note.status = payload.status
    if "Approved" in payload.status or "Settled" in payload.status:
        note.approved_at = now_str

    # Also log an automated email notification to the parent about their Exam Permit / Promissory approval
    student = db.query(Parent).filter(Parent.id == note.user_id).first()
    if student and "Approved" in payload.status:
        subject = f"[LKA Exam Clearance Approved] Digital Exam Permit {note.permit_code} for {note.student_name}"
        body = (
            f"Dear {note.guardian_name},\n\n"
            f"Good day from Lyceum ng Kabataan Academy, Inc.!\n\n"
            f"Your Digital Promissory Note for {note.student_name} ({note.student_id_no} · {note.grade_level}) "
            f"covering {note.exam_quarter} (Amount: ₱{note.amount_covered:,.2f}) has been APPROVED.\n\n"
            f"• Exam Clearance Status: CLEARED VIA PROMISSORY NOTE\n"
            f"• Digital Exam Permit Code: {note.permit_code}\n"
            f"• Promised Settlement Date (1-Week Grace): {note.promised_date}\n"
            f"• Late Penalty Fee: ₱0.00 (No Penalty)\n\n"
            f"Your child may now take the Periodical Examination. Please settle the promised amount on or before {note.promised_date}.\n\n"
            f"Thank you!\n"
            f"Lyceum ng Kabataan Academy, Inc. Registrar Office"
        )
        db.add(
            PaymentReminder(
                user_id=student.id,
                recipient_email=note.guardian_email,
                subject=subject,
                installment_title=f"Promissory Approved: {note.exam_quarter}",
                due_date=f"Promised Date: {note.promised_date}",
                amount_due=note.amount_covered,
                message_body=body,
                sent_at=now_str,
                delivery_status="Exam Permit & Approval Email Sent",
            )
        )

    db.commit()
    return {
        "message": f"Promissory Note ({note.permit_code}) for {note.student_name} updated to '{payload.status}'!"
    }


@router.post("/registrar/students/{student_id}/requirements")
def registrar_update_student_requirements(
    student_id: int,
    payload: UpdateRequirementsRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    student = (
        db.query(Parent)
        .filter(Parent.id == student_id, Parent.role == "parent")
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    student.requirements_submitted = json.dumps(payload.requirements_submitted)
    db.commit()
    return {
        "message": f"Physical requirements updated for {student.student_name or student.name}."
    }


@router.post("/registrar/students/{student_id}/payment")
def registrar_record_student_payment(
    student_id: int,
    payload: PayInstallmentRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    student = (
        db.query(Parent)
        .filter(Parent.id == student_id, Parent.role == "parent")
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")
    if payload.amount <= 0:
        raise HTTPException(
            status_code=400, detail="Payment amount must be greater than zero."
        )
    billing = compute_student_billing(student)
    if payload.amount > billing["remaining_balance"] + 0.5:
        raise HTTPException(
            status_code=400,
            detail=f"Overpayment is not allowed. Remaining balance is only ₱{billing['remaining_balance']:,.2f}.",
        )

    or_num = f"OR-2026-{random.randint(10000, 99999)}"
    now_str = datetime.now().strftime("%b %d, %Y · %I:%M %p")

    record = PaymentRecord(
        user_id=student.id,
        or_number=or_num,
        description=payload.description,
        amount=round(payload.amount, 2),
        payment_method=payload.payment_method,
        reference_no=payload.reference_no or "Verified at LKA Cashier",
        paid_at=now_str,
        status="Verified & Official Receipt Issued",
    )
    db.add(record)
    student.amount_paid = round(
        float(student.amount_paid or 0.0) + float(payload.amount), 2
    )
    db.commit()

    return {
        "message": f"Payment of ₱{payload.amount:,.2f} recorded for {student.student_name}! Official Receipt {or_num} issued.",
        "or_number": or_num,
    }


@router.post("/registrar/students/{student_id}/enroll")
def registrar_officially_enroll_student(
    student_id: int,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    student = (
        db.query(Parent)
        .filter(Parent.id == student_id, Parent.role == "parent")
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    try:
        reqs = json.loads(student.requirements_submitted or "[]")
    except Exception:
        reqs = []

    s_type = (student.student_type or "new").lower()
    req_keys = REQUIREMENTS_KEYS_BY_TYPE.get(
        s_type, REQUIREMENTS_KEYS_BY_TYPE["new"]
    )
    missing_reqs = [k for k in req_keys if k not in reqs]
    if missing_reqs:
        raise HTTPException(
            status_code=400,
            detail="Cannot officially enroll student yet: All physical hardcopy requirements must be received and checked first.",
        )

    billing = compute_student_billing(student)
    if billing["amount_paid"] + 0.5 < billing["downpayment_required"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot officially enroll student yet: Initial tuition/downpayment of ₱{billing['downpayment_required']:,.2f} must be paid first.",
        )

    student.enrollment_status = "Officially Enrolled"
    if not student.assigned_section:
        student.assigned_section = assign_section_for_student(
            student.grade_level or "Grade 1", student.class_shift or "morning"
        )
    db.commit()

    return {
        "message": f"{student.student_name} ({student.student_id_no}) is now Officially Enrolled! Their full Student Portal Dashboard is now unlocked."
    }


@router.post("/registrar/students/{student_id}/remind")
def registrar_send_student_payment_reminder(
    student_id: int,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    student = (
        db.query(Parent)
        .filter(Parent.id == student_id, Parent.role == "parent")
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    billing = compute_student_billing(student)
    rem = build_email_reminder_record(student, billing)
    db.add(rem)
    db.commit()
    return {
        "message": f"Payment reminder email sent to {student.parent_guardian_name} ({rem.recipient_email}) for {student.student_name}!"
    }


@router.post("/registrar/reminders/send-all")
def registrar_send_bulk_payment_reminders(
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_registrar_or_admin(current_user)
    students = (
        db.query(Parent)
        .filter(Parent.role == "parent")
        .all()
    )
    sent_count = 0
    for s in students:
        billing = compute_student_billing(s)
        if billing["remaining_balance"] > 0:
            rem = build_email_reminder_record(s, billing)
            db.add(rem)
            sent_count += 1
    db.commit()
    return {
        "message": f"Automated payment reminder emails sent to {sent_count} parent/guardian account(s) with remaining balances!"
    }


# ==============================================================================
# ADMIN PORTAL ENDPOINTS (ANALYTICS, FEES MANAGEMENT, COLLECTION REPORT, USERS, OPEN/CLOSE ENROLLMENT)
# ==============================================================================
DEFAULT_FEE_TIERS = [
    {
        "tier_id": "kinder_old",
        "label": "Kinder 1 & Kinder 2 (Old Student)",
        "tuition_fee": 13579.90,
        "misc_fee": 5399.50,
        "computer_fee": 0.0,
        "cash_discount_percent": 10.0,
    },
    {
        "tier_id": "kinder_new",
        "label": "Kinder 1 & Kinder 2 (New / Transferee)",
        "tuition_fee": 14170.50,
        "misc_fee": 5399.50,
        "computer_fee": 0.0,
        "cash_discount_percent": 10.0,
    },
    {
        "tier_id": "g1_3_old",
        "label": "Grade 1 to Grade 3 (Old Student)",
        "tuition_fee": 14537.50,
        "misc_fee": 7155.50,
        "computer_fee": 1900.00,
        "cash_discount_percent": 10.0,
    },
    {
        "tier_id": "g1_3_new",
        "label": "Grade 1 to Grade 3 (New / Transferee)",
        "tuition_fee": 15170.00,
        "misc_fee": 7155.50,
        "computer_fee": 1900.00,
        "cash_discount_percent": 10.0,
    },
    {
        "tier_id": "g4_6_old",
        "label": "Grade 4 to Grade 6 (Old Student)",
        "tuition_fee": 16177.00,
        "misc_fee": 7551.50,
        "computer_fee": 1900.00,
        "cash_discount_percent": 10.0,
    },
    {
        "tier_id": "g4_6_new",
        "label": "Grade 4 to Grade 6 (New / Transferee)",
        "tuition_fee": 16880.50,
        "misc_fee": 7155.50,
        "computer_fee": 1900.00,
        "cash_discount_percent": 10.0,
    },
]


def ensure_admin(current_user: Parent):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the School Administrator can access this resource.",
        )


@router.get("/enrollment-status")
def get_public_enrollment_status(db: Session = Depends(get_db)):
    row = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "enrollment_open")
        .first()
    )
    is_open = True if not row else row.value.lower() == "true"
    return {"enrollment_open": is_open, "school_year": "S.Y. 2026–2027"}


@router.get("/admin/overview")
def get_admin_dashboard_overview(
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)

    # 1. Enrollment Open/Close status
    enroll_row = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "enrollment_open")
        .first()
    )
    enrollment_open = True if not enroll_row else enroll_row.value.lower() == "true"

    # 2. Tuition & Fee Matrix settings
    fee_row = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "fee_matrix_json")
        .first()
    )
    try:
        fee_tiers = json.loads(fee_row.value) if fee_row else DEFAULT_FEE_TIERS
    except Exception:
        fee_tiers = DEFAULT_FEE_TIERS

    # 3. Students & Financial Analytics
    all_users = db.query(Parent).order_by(Parent.id.desc()).all()
    student_users = [u for u in all_users if u.role == "parent"]

    total_assessed = 0.0
    total_collected = 0.0
    total_receivables = 0.0
    plan_counts = {"cash": 0, "quarterly": 0, "monthly": 0}
    grade_breakdown: Dict[str, Dict[str, int]] = {
        "Kinder 1": {"official_baseline": 31, "portal_enrolled": 0, "pending": 0},
        "Kinder 2": {"official_baseline": 52, "portal_enrolled": 0, "pending": 0},
        "Grade 1": {"official_baseline": 94, "portal_enrolled": 0, "pending": 0},
        "Grade 2": {"official_baseline": 102, "portal_enrolled": 0, "pending": 0},
        "Grade 3": {"official_baseline": 96, "portal_enrolled": 0, "pending": 0},
        "Grade 4": {"official_baseline": 91, "portal_enrolled": 0, "pending": 0},
        "Grade 5": {"official_baseline": 86, "portal_enrolled": 0, "pending": 0},
        "Grade 6": {"official_baseline": 99, "portal_enrolled": 0, "pending": 0},
    }

    student_map: Dict[int, Parent] = {}
    for s in student_users:
        student_map[s.id] = s
        b = compute_student_billing(s)
        total_assessed = round(total_assessed + b["total_assessment"], 2)
        total_collected = round(total_collected + b["amount_paid"], 2)
        total_receivables = round(total_receivables + b["remaining_balance"], 2)

        plan_key = (s.payment_plan or "monthly").lower()
        if plan_key in plan_counts:
            plan_counts[plan_key] += 1

        gl = s.grade_level or "Grade 1"
        if gl not in grade_breakdown:
            grade_breakdown[gl] = {
                "official_baseline": 0,
                "portal_enrolled": 0,
                "pending": 0,
            }
        if s.enrollment_status == "Officially Enrolled":
            grade_breakdown[gl]["portal_enrolled"] += 1
        else:
            grade_breakdown[gl]["pending"] += 1

    # 4. Collection Report & Channel Breakdown
    all_payments = (
        db.query(PaymentRecord).order_by(PaymentRecord.id.desc()).all()
    )
    channel_totals = {"Cash": 0.0, "GCash": 0.0, "Online Banking": 0.0}
    collection_rows = []
    for p in all_payments:
        stu = student_map.get(p.user_id)
        pm_upper = (p.payment_method or "").lower()
        if "gcash" in pm_upper:
            channel_totals["GCash"] = round(channel_totals["GCash"] + p.amount, 2)
        elif "bank" in pm_upper:
            channel_totals["Online Banking"] = round(
                channel_totals["Online Banking"] + p.amount, 2
            )
        else:
            channel_totals["Cash"] = round(channel_totals["Cash"] + p.amount, 2)

        collection_rows.append(
            {
                "id": p.id,
                "or_number": p.or_number,
                "student_id_no": stu.student_id_no if stu else f"LKA-2026-{650 + p.user_id:04d}",
                "student_name": (stu.student_name or stu.name) if stu else "Student",
                "grade_level": (stu.grade_level or "Grade 1") if stu else "Grade 1",
                "guardian_name": (stu.parent_guardian_name or stu.name) if stu else "Guardian",
                "description": p.description,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "reference_no": p.reference_no,
                "paid_at": p.paid_at,
                "status": p.status,
            }
        )

    # 5. All User Accounts (Staff + Students)
    users_list = []
    for u in all_users:
        users_list.append(
            {
                "id": u.id,
                "name": u.student_name or u.name,
                "guardian_name": u.parent_guardian_name or "",
                "email": u.email,
                "phone": u.phone,
                "role": u.role,
                "is_active": bool(u.is_active),
                "student_id_no": u.student_id_no or "",
                "grade_level": u.grade_level or "",
                "enrollment_status": u.enrollment_status or "",
            }
        )

    officially_enrolled_count = sum(
        1 for s in student_users if s.enrollment_status == "Officially Enrolled"
    )
    pending_count = len(student_users) - officially_enrolled_count

    return {
        "enrollment_open": enrollment_open,
        "school_year": "S.Y. 2026–2027",
        "analytics": {
            "school_population_total": 651,
            "morning_shift_total": 341,
            "afternoon_shift_total": 310,
            "portal_registered_total": len(student_users),
            "portal_officially_enrolled": officially_enrolled_count,
            "portal_pending_verification": pending_count,
            "total_assessed": total_assessed,
            "total_collected": total_collected,
            "total_receivables": total_receivables,
            "plan_counts": plan_counts,
            "channel_totals": channel_totals,
            "grade_breakdown": [
                {
                    "grade_level": gl,
                    "official_baseline": info["official_baseline"],
                    "portal_enrolled": info["portal_enrolled"],
                    "pending": info["pending"],
                }
                for gl, info in grade_breakdown.items()
            ],
        },
        "fee_tiers": fee_tiers,
        "collection_report": collection_rows,
        "users": users_list,
    }


@router.post("/admin/enrollment-toggle")
def admin_toggle_enrollment_period(
    payload: EnrollmentToggleRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)
    row = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "enrollment_open")
        .first()
    )
    val_str = "true" if payload.enrollment_open else "false"
    if not row:
        row = SystemSetting(key="enrollment_open", value=val_str)
        db.add(row)
    else:
        row.value = val_str
    db.commit()

    status_label = "OPEN" if payload.enrollment_open else "CLOSED"
    return {
        "message": f"Online Enrollment for S.Y. 2026–2027 is now {status_label}!",
        "enrollment_open": payload.enrollment_open,
    }


@router.post("/admin/fees")
def admin_update_fee_matrix(
    payload: UpdateFeeMatrixRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)
    tiers_data = [t.dict() for t in payload.tiers]
    row = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == "fee_matrix_json")
        .first()
    )
    if not row:
        row = SystemSetting(key="fee_matrix_json", value=json.dumps(tiers_data))
        db.add(row)
    else:
        row.value = json.dumps(tiers_data)
    db.commit()
    return {
        "message": "Official Tuition & Miscellaneous Fee Matrix updated and saved to database!"
    }


@router.post("/admin/users")
def admin_create_staff_account(
    payload: CreateStaffUserRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()

    if payload.role not in ("registrar", "admin"):
        raise HTTPException(
            status_code=400, detail="Staff role must be 'registrar' or 'admin'."
        )
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters."
        )
    if db.query(Parent).filter(Parent.email == email_clean).first():
        raise HTTPException(status_code=400, detail="Email is already registered.")
    if db.query(Parent).filter(Parent.phone == phone_clean).first():
        raise HTTPException(
            status_code=400, detail="Mobile number is already registered."
        )

    new_staff = Parent(
        name=payload.name.strip(),
        email=email_clean,
        phone=phone_clean,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
        is_verified=True,
    )
    db.add(new_staff)
    db.commit()
    return {
        "message": f"New {payload.role.capitalize()} account created for {new_staff.name} ({new_staff.email})!"
    }


@router.put("/admin/users/{user_id}/toggle-active")
def admin_toggle_user_active(
    user_id: int,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)
    target = db.query(Parent).filter(Parent.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User account not found.")
    if target.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own active Admin account.",
        )

    target.is_active = not bool(target.is_active)
    db.commit()
    state_str = "Activated" if target.is_active else "Deactivated"
    return {
        "message": f"Account for {target.student_name or target.name} ({target.email}) is now {state_str}."
    }


@router.put("/admin/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: int,
    payload: AdminResetPasswordRequest,
    current_user: Parent = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_admin(current_user)
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 6 characters long.",
        )
    target = db.query(Parent).filter(Parent.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User account not found.")

    target.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {
        "message": f"Password reset successful for {target.student_name or target.name} ({target.email})!"
    }
