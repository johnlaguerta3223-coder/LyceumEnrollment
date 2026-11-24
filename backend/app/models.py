from sqlalchemy import Column, Float, Integer, String, Boolean, Text
from .db import Base


class Parent(Base):
    __tablename__ = "parents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="parent", nullable=False)  # 'parent' (student), 'registrar', 'admin'
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    # Student Enrollment & Billing Details
    student_id_no = Column(String, nullable=True)
    student_name = Column(String, nullable=True)
    student_lrn = Column(String, nullable=True)
    student_type = Column(String, nullable=True)  # 'new', 'old', 'transferee'
    grade_level = Column(String, nullable=True)
    class_shift = Column(String, nullable=True)  # 'morning', 'afternoon'
    assigned_section = Column(String, nullable=True)
    birthdate = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(String, nullable=True)
    parent_guardian_name = Column(String, nullable=True)
    relationship_to_student = Column(String, nullable=True)
    previous_school = Column(String, nullable=True)
    payment_plan = Column(String, nullable=True)  # 'cash', 'quarterly', 'monthly'
    payment_method = Column(String, nullable=True)  # 'gcash', 'cash', 'online_banking'
    amount_paid = Column(Float, default=0.0, nullable=True)
    requirements_submitted = Column(Text, nullable=True)  # JSON list of requirement IDs
    enrollment_status = Column(String, default="Pending Downpayment", nullable=True)


class PaymentRecord(Base):
    __tablename__ = "payment_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    or_number = Column(String, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # 'GCash', 'Cash', 'Online Banking'
    reference_no = Column(String, nullable=True)
    paid_at = Column(String, nullable=False)
    status = Column(String, default="Verified", nullable=False)


class PaymentReminder(Base):
    __tablename__ = "payment_reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    recipient_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    installment_title = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    amount_due = Column(Float, nullable=False)
    message_body = Column(Text, nullable=False)
    sent_at = Column(String, nullable=False)
    delivery_status = Column(String, default="Email Sent", nullable=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)


class PromissoryNote(Base):
    __tablename__ = "promissory_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    student_id_no = Column(String, nullable=False)
    student_name = Column(String, nullable=False)
    grade_level = Column(String, nullable=False)
    assigned_section = Column(String, nullable=False)
    guardian_name = Column(String, nullable=False)
    guardian_email = Column(String, nullable=False)
    guardian_phone = Column(String, nullable=False)
    exam_quarter = Column(String, nullable=False)
    amount_covered = Column(Float, nullable=False)
    promised_date = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, default="Pending Registrar Approval", nullable=False)
    permit_code = Column(String, nullable=False)
    submitted_at = Column(String, nullable=False)
    approved_at = Column(String, nullable=True)


