from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import RegexValidator


# -------------------------
# Custom User Model with Roles
# -------------------------
class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = [
        ('CITIZEN', 'Citizen'),
        ('ADMIN', 'Admin'),
        ('SUB_ADMIN', 'Sub-Admin'),
        ('DEPT_ADMIN', 'Department Admin'),
        ('WORKER', 'Worker'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='CITIZEN')
    phone_regex = RegexValidator(
        regex=r'^[6-9]\d{9}$',
        message="Phone number must be 10 digits and start with 6, 7, 8, or 9."
    )
    phone = models.CharField(
        validators=[phone_regex],
        max_length=10,
        unique=True,
        blank=True,
        null=True,
        help_text="Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9"
    )
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'custom_user'


# -------------------------
# Sub-Admin Categories
# -------------------------
class SubAdminCategory(models.Model):
    CATEGORY_CHOICES = [
        ('CORE_CIVIC', 'Core Civic Departments'),
        ('MONITORING_COMPLIANCE', 'Monitoring & Compliance Departments'),
        ('ADMIN_WORKFORCE_TECH', 'Admin, Workforce & Tech'),
        ('SPECIAL_PROGRAMS', 'Special Program Units'),
    ]
    
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


# -------------------------
# Departments (14 departments)
# -------------------------
class Department(models.Model):
    name = models.CharField(max_length=100)
    sub_admin_category = models.ForeignKey(SubAdminCategory, on_delete=models.CASCADE, related_name='departments')
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


# -------------------------
# Complaint Categories
# (maps problem → department)
# -------------------------
class ComplaintCategory(models.Model):
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.name} ({self.department.name})"


# -------------------------
# Admin Profile (Root Authority)
# -------------------------
class AdminProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    
    def __str__(self):
        return f"Admin - {self.user.username}"


# -------------------------
# Sub-Admin Profile
# -------------------------
class SubAdminProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    category = models.ForeignKey(SubAdminCategory, on_delete=models.CASCADE)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    
    def __str__(self):
        return f"Sub-Admin - {self.user.username} ({self.category.name})"


# -------------------------
# Department Admin Profile
# -------------------------
class DepartmentAdminProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    can_login_multiple_devices = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Dept Admin - {self.user.username} ({self.department.name})"


# -------------------------
# Officers (Dept Admins) - Legacy
# -------------------------
class Officer(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, default="officer")

    def __str__(self):
        return self.user.username


# -------------------------
# Offices (Department Offices by City)
# -------------------------
class Office(models.Model):
    name = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='offices')
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    address = models.TextField()
    pincode = models.CharField(max_length=10)
    phone = models.CharField(max_length=15)
    email = models.EmailField()
    office_hours = models.CharField(max_length=100, default='9:00 AM - 5:00 PM')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('department', 'city')
    
    def __str__(self):
        return f"{self.name} - {self.city}"


# -------------------------
# Workers (Ground Staff)
# -------------------------
class Worker(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    office = models.ForeignKey(Office, on_delete=models.SET_NULL, null=True, blank=True, related_name='workers')
    role = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    address = models.TextField()
    joining_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


# -------------------------
# Complaint Votes (Upvote System)
# -------------------------
class ComplaintVote(models.Model):
    complaint = models.ForeignKey('Complaint', on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('complaint', 'user')
    
    def __str__(self):
        return f"Vote by {self.user.username} on Complaint {self.complaint.id}"


# -------------------------
# Complaint (Current State)
# -------------------------
class Complaint(models.Model):
    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('FILTERING', 'Under Filter Check'),
        ('DECLINED', 'Declined'),
        ('VERIFIED', 'Verified'),
        ('SORTING', 'Being Sorted'),
        ('PENDING', 'Pending Assignment'),
        ('ASSIGNED', 'Assigned to Worker'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
        ('PENDING_VERIFICATION', 'Pending Manual Verification'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # citizen

    category = models.ForeignKey(
        ComplaintCategory,
        on_delete=models.SET_NULL,
        null=True
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    office = models.ForeignKey(
        'Office',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='complaints'
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    image = models.ImageField(upload_to="complaints/", blank=True, null=True)
    
    # Completion proof
    completion_image = models.ImageField(upload_to="complaints/completed/", blank=True, null=True)
    completion_note = models.TextField(blank=True)

    priority = models.PositiveSmallIntegerField(
        default=1,
        help_text="1=Normal, Higher number = Higher priority (based on votes)"
    )
    
    upvote_count = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="SUBMITTED")
    
    # Filter system flags
    filter_checked = models.BooleanField(default=False)
    filter_passed = models.BooleanField(default=False)
    filter_reason = models.TextField(blank=True)
    
    # Sorting system
    sorted = models.BooleanField(default=False)
    
    # Assignment system
    assigned = models.BooleanField(default=False)

    current_officer = models.ForeignKey(
        Officer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints"
    )

    current_worker = models.ForeignKey(
        Worker,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_work"
    )

    is_deleted = models.BooleanField(default=False)
    is_spam = models.BooleanField(default=False)
    is_genuine = models.BooleanField(default=False)

    # Smart Geo-Hash for Duplicate Detection  (10-char: TITLE3 + LAT2 + LON2 + DEPT3)
    smart_hash = models.CharField(
        max_length=10,
        blank=True,
        db_index=True,
        help_text="10-char smart hash [TITLE3][LAT2][LON2][DEPT3] for duplicate detection"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    sla_deadline = models.DateTimeField(null=True, blank=True, help_text="Service Level Agreement deadline")

    def save(self, *args, **kwargs):
        if self.category and not self.department:
            self.department = self.category.department
        # Update priority based on votes
        self.priority = 1 + (self.upvote_count // 10)  # Every 10 votes increases priority
        # Auto-generate smart hash for duplicate detection if not already set
        if not self.smart_hash and self.title:
            from .duplicate_detection import generate_smart_hash
            dept_name = self.department.name if self.department else None
            self.smart_hash = generate_smart_hash(
                self.title, self.latitude, self.longitude, dept_name
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.status})"
        

# -------------------------
# Assignment History
# -------------------------
class Assignment(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE)
    assigned_to_worker = models.ForeignKey(
        Worker, on_delete=models.SET_NULL, null=True, blank=True
    )
    assigned_by_officer = models.ForeignKey(
        Officer, on_delete=models.SET_NULL, null=True
    )
    status = models.CharField(max_length=50, default="assigned")
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Assignment for Complaint {self.complaint.id}"


# -------------------------
# Complaint Logs (Immutable History)
# -------------------------
class ComplaintLog(models.Model):
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="logs"
    )

    action_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    note = models.TextField(blank=True)

    old_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50, blank=True)

    old_dept = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="old_logs"
    )

    new_dept = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="new_logs"
    )

    old_assignee = models.CharField(max_length=200, blank=True)
    new_assignee = models.CharField(max_length=200, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log {self.id} - Complaint {self.complaint.id}"
    

class ComplaintEscalation(models.Model):
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name='escalations')
    escalated_from = models.ForeignKey(
        Officer, on_delete=models.SET_NULL, null=True, related_name="escalated_from"
    )
    escalated_to = models.ForeignKey(
        Officer, on_delete=models.SET_NULL, null=True, related_name="escalated_to"
    )
    reason = models.CharField(max_length=255)
    escalated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Escalation for Complaint {self.complaint.id} at {self.escalated_at}"


# -------------------------
# SLA Configuration
# -------------------------
class SLAConfig(models.Model):
    """Service Level Agreement configuration for complaint categories"""
    category = models.OneToOneField(
        ComplaintCategory,
        on_delete=models.CASCADE,
        related_name='sla_config'
    )
    resolution_hours = models.PositiveIntegerField(
        default=48,
        help_text="Expected hours to resolve this type of complaint"
    )
    escalation_hours = models.PositiveIntegerField(
        default=24,
        help_text="Hours before auto-escalation if not resolved"
    )
    
    class Meta:
        verbose_name = "SLA Configuration"
        verbose_name_plural = "SLA Configurations"
    
    def __str__(self):
        return f"SLA for {self.category.name} - Resolve in {self.resolution_hours}h, Escalate after {self.escalation_hours}h"


# -------------------------
# Attendance System
# -------------------------
class DepartmentAttendance(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    city = models.CharField(max_length=100)
    access_password = models.CharField(max_length=255)  # Unique per city per department
    
    class Meta:
        unique_together = ('department', 'city')
    
    def __str__(self):
        return f"{self.department.name} - {self.city}"


class WorkerAttendance(models.Model):
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE)
    date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('ON_LEAVE', 'On Leave'),
    ], default='ABSENT')
    notes = models.TextField(blank=True)
    marked_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        unique_together = ('worker', 'date')
    
    def __str__(self):
        return f"{self.worker.user.username} - {self.date} - {self.status}"


# -------------------------
# AI Verification Log (Filter B Audit Trail)
# -------------------------
class AIVerificationLog(models.Model):
    """
    Immutable audit trail for every AI-assisted verification decision.
    Stores the AI result alongside context so admins can review
    and override decisions. AI supports — it does not replace — human review.
    """
    AI_RESULT_CHOICES = [
        ('YES', 'Genuine'),
        ('NO', 'Not Genuine'),
        ('ERROR', 'Verification Error (Manual Review)'),
    ]

    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name='ai_verification_logs'
    )
    result = models.CharField(max_length=10, choices=AI_RESULT_CHOICES)
    description_snapshot = models.TextField(
        blank=True,
        help_text="Complaint description at the time of AI verification"
    )
    image_path_snapshot = models.CharField(
        max_length=500,
        blank=True,
        help_text="Image path used for AI verification"
    )
    error_detail = models.TextField(
        blank=True,
        help_text="Exception detail if AI call failed"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "AI Verification Log"
        verbose_name_plural = "AI Verification Logs"
        ordering = ['-created_at']

    def __str__(self):
        return f"AI Log #{self.id} — Complaint {self.complaint.id} — {self.result}"


# -------------------------
# Worker Notification (Multi-Channel Alert System)
# -------------------------
class WorkerNotification(models.Model):
    """
    Persistent notification record for every alert sent to a worker.
    Supports the in-app notification bell, read/unread tracking,
    and feeds the frontend polling endpoint.
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('ASSIGNMENT', 'New Complaint Assignment'),
        ('REASSIGNMENT', 'Complaint Reassigned'),
        ('SLA_WARNING', 'SLA Deadline Warning'),
        ('ESCALATION', 'Complaint Escalated'),
    ]

    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name='worker_notifications',
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='ASSIGNMENT',
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Worker Notification"
        verbose_name_plural = "Worker Notifications"

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.worker.user.username}"
