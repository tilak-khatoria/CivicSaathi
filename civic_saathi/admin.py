from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from .models import (
    Department, Officer, Worker,
    Complaint, ComplaintLog, Assignment,
    ComplaintCategory, ComplaintEscalation, SLAConfig,
    WorkerAttendance, CustomUser, AIVerificationLog,
    WorkerNotification
)

admin.site.site_header = "Municipal Governance Panel"
admin.site.site_title = "Municipal Admin"


# -----------------------------
# Inline Logs (READ-ONLY)
# -----------------------------
class ComplaintLogInline(admin.TabularInline):
    model = ComplaintLog
    extra = 0
    can_delete = False
    readonly_fields = (
        "action_by", "note",
        "old_status", "new_status",
        "old_dept", "new_dept",
        "timestamp"
    )
    ordering = ('-timestamp',)


# -----------------------------
# Inline Assignments
# -----------------------------
class AssignmentInline(admin.TabularInline):
    model = Assignment
    extra = 0
    readonly_fields = ("assigned_by_officer", "timestamp")
    

# -----------------------------
# Inline Escalations
# -----------------------------
class ComplaintEscalationInline(admin.TabularInline):
    model = ComplaintEscalation
    extra = 0
    can_delete = False
    readonly_fields = ('escalated_from', 'escalated_to', 'reason', 'escalated_at')
    ordering = ('-escalated_at',)


# -----------------------------
# Complaint Category
# -----------------------------
@admin.register(ComplaintCategory)
class ComplaintCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'has_sla_config')
    list_filter = ('department',)
    search_fields = ('name',)
    
    def has_sla_config(self, obj):
        return hasattr(obj, 'sla_config')
    has_sla_config.boolean = True
    has_sla_config.short_description = 'SLA Configured'


# -----------------------------
# SLA Configuration
# -----------------------------
@admin.register(SLAConfig)
class SLAConfigAdmin(admin.ModelAdmin):
    list_display = ('category', 'department_name', 'resolution_hours', 'escalation_hours', 'sla_status')
    list_filter = ('category__department',)
    search_fields = ('category__name',)
    
    def department_name(self, obj):
        return obj.category.department.name
    department_name.short_description = 'Department'
    
    def sla_status(self, obj):
        if obj.escalation_hours < 24:
            color = 'red'
            status = 'Strict'
        elif obj.escalation_hours < 48:
            color = 'orange'
            status = 'Standard'
        else:
            color = 'green'
            status = 'Relaxed'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status
        )
    sla_status.short_description = 'SLA Type'


# -----------------------------
# Department
# -----------------------------
@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


# -----------------------------
# Officer
# -----------------------------
@admin.register(Officer)
class OfficerAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "role")
    list_filter = ("department", "role")
    search_fields = ("user__username",)


# -----------------------------
# Worker
# -----------------------------
@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "role", "is_active")
    list_filter = ("department", "role", "is_active")
    search_fields = ("user__username",)


# -----------------------------
# Complaint (CORE VIEW)
# -----------------------------
@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "department",
        "priority_badge", "status_badge",
        "current_worker", "sla_indicator", "created_at"
    )

    list_filter = (
        "department", "status",
        "priority", "is_deleted", "is_spam"
    )

    search_fields = ("title", "description", "user__username")

    ordering = ("-priority", "-created_at")

    inlines = [AssignmentInline, ComplaintEscalationInline, ComplaintLogInline]

    list_per_page = 25

    fieldsets = (
        ("Complaint Info", {
            "fields": ("user", "title", "description", "location", "city", "state", "image")
        }),
        ("Routing & Priority", {
            "fields": ("category", "department", "office", "priority", "status")
        }),
        ("Assignment", {
            "fields": ("current_officer", "current_worker")
        }),
        ("Completion", {
            "fields": ("completion_note", "completion_image", "completed_at")
        }),
        ("Flags", {
            "fields": ("is_deleted", "is_spam", "is_genuine", "filter_checked", "filter_passed")
        }),
    )
    
    readonly_fields = ('completed_at',)
    
    def priority_badge(self, obj):
        colors = {1: 'green', 2: 'orange', 3: 'red'}
        labels = {1: 'Normal', 2: 'High', 3: 'Critical'}
        color = colors.get(obj.priority, 'gray')
        label = labels.get(obj.priority, f'P{obj.priority}')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, label
        )
    priority_badge.short_description = 'Priority'
    
    def status_badge(self, obj):
        color_map = {
            'SUBMITTED': '#17a2b8',
            'FILTERING': '#6c757d',
            'DECLINED': '#dc3545',
            'SORTING': '#ffc107',
            'PENDING': '#fd7e14',
            'ASSIGNED': '#007bff',
            'IN_PROGRESS': '#0056b3',
            'RESOLVED': '#28a745',
            'COMPLETED': '#155724',
            'REJECTED': '#721c24',
        }
        color = color_map.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def sla_indicator(self, obj):
        """Show SLA status with color indicator"""
        if not obj.category or not hasattr(obj.category, 'sla_config'):
            return format_html('<span style="color: gray;">No SLA</span>')
        
        sla = obj.category.sla_config
        hours_elapsed = (timezone.now() - obj.created_at).total_seconds() / 3600
        hours_until_escalation = sla.escalation_hours - hours_elapsed
        
        if hours_until_escalation <= 0:
            # Exceeded deadline
            overdue_hours = f"{abs(hours_until_escalation):.1f}"
            return format_html(
                '<span style="color: red; font-weight: bold;">⚠ OVERDUE ({}h)</span>',
                overdue_hours
            )
        elif hours_until_escalation <= 2:
            # Critical - less than 2 hours
            remaining = f"{hours_until_escalation:.1f}"
            return format_html(
                '<span style="color: red; font-weight: bold;">🔥 {}h left</span>',
                remaining
            )
        elif hours_until_escalation <= 6:
            # Warning - less than 6 hours
            remaining = f"{hours_until_escalation:.1f}"
            return format_html(
                '<span style="color: orange; font-weight: bold;">⏰ {}h left</span>',
                remaining
            )
        else:
            # OK
            remaining = f"{hours_until_escalation:.0f}"
            return format_html(
                '<span style="color: green;">✓ {}h left</span>',
                remaining
            )
    sla_indicator.short_description = 'SLA Status'
    
    actions = ['escalate_complaints', 'mark_as_spam', 'assign_to_me']
    
    def escalate_complaints(self, request, queryset):
        """Bulk escalate selected complaints"""
        from .email_service import send_escalation_email
        
        escalated = 0
        for complaint in queryset:
            if complaint.department:
                # Find senior officer
                officers = Officer.objects.filter(
                    department=complaint.department
                ).exclude(id=complaint.current_officer.id if complaint.current_officer else None)
                
                if officers.exists():
                    senior_officer = officers.first()
                    escalation = ComplaintEscalation.objects.create(
                        complaint=complaint,
                        escalated_from=complaint.current_officer,
                        escalated_to=senior_officer,
                        reason=f"Manually escalated by {request.user.get_full_name() or request.user.username}"
                    )
                    
                    # Update status
                    complaint.status = 'PENDING'
                    complaint.priority = min(complaint.priority + 1, 3)
                    complaint.save()
                    
                    # Send email
                    send_escalation_email(escalation)
                    escalated += 1
        
        self.message_user(request, f"Successfully escalated {escalated} complaint(s).")
    escalate_complaints.short_description = "Escalate selected complaints"
    
    def mark_as_spam(self, request, queryset):
        updated = queryset.update(is_spam=True, status='REJECTED')
        self.message_user(request, f"Marked {updated} complaint(s) as spam.")
    mark_as_spam.short_description = "Mark as spam"
    
    def assign_to_me(self, request, queryset):
        """Assign selected complaints to current user (if they're an officer)"""
        try:
            officer = request.user.officer
            updated = 0
            for complaint in queryset:
                complaint.current_officer = officer
                complaint.status = 'ASSIGNED'
                complaint.save()
                
                # Create log
                ComplaintLog.objects.create(
                    complaint=complaint,
                    action_by=request.user,
                    note=f"Complaint self-assigned by {request.user.get_full_name()}",
                    new_assignee=officer.user.get_full_name()
                )
                updated += 1
            
            self.message_user(request, f"Assigned {updated} complaint(s) to you.")
        except:
            self.message_user(request, "You must be an officer to use this action.", level='error')
    assign_to_me.short_description = "Assign to me"

    # Add timer context to change form
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        
        if object_id:
            obj = self.get_object(request, object_id)
            if obj and obj.category and hasattr(obj.category, 'sla_config'):
                sla = obj.category.sla_config
                hours_elapsed = (timezone.now() - obj.created_at).total_seconds() / 3600
                hours_until_escalation = sla.escalation_hours - hours_elapsed
                
                # Determine status
                if hours_until_escalation <= 0:
                    timer_status = 'overdue'
                    timer_icon = '⚠️'
                    timer_title = 'COMPLAINT OVERDUE!'
                    deadline_label = 'Overdue By'
                    hours_remaining = abs(hours_until_escalation)
                    is_overdue = True
                elif hours_until_escalation <= 2:
                    timer_status = 'warning'
                    timer_icon = '🔥'
                    timer_title = 'URGENT: Deadline Approaching'
                    deadline_label = 'Time Remaining'
                    hours_remaining = hours_until_escalation
                    is_overdue = False
                elif hours_until_escalation <= 6:
                    timer_status = 'warning'
                    timer_icon = '⏰'
                    timer_title = 'Deadline Approaching'
                    deadline_label = 'Time Remaining'
                    hours_remaining = hours_until_escalation
                    is_overdue = False
                else:
                    timer_status = 'ok'
                    timer_icon = '✓'
                    timer_title = 'Within SLA Timeline'
                    deadline_label = 'Time Remaining'
                    hours_remaining = hours_until_escalation
                    is_overdue = False
                
                # Priority text
                priority_map = {1: ('Normal', 'normal'), 2: ('High', 'high'), 3: ('Critical', 'critical')}
                priority_text, priority_class = priority_map.get(obj.priority, ('Normal', 'normal'))
                
                # Escalation info
                escalation_count = obj.escalations.count()
                
                extra_context.update({
                    'timer_status': timer_status,
                    'timer_icon': timer_icon,
                    'timer_title': timer_title,
                    'hours_elapsed': f'{hours_elapsed:.1f}',
                    'hours_remaining': f'{hours_remaining:.1f}',
                    'deadline_label': deadline_label,
                    'sla_hours': sla.escalation_hours,
                    'priority_text': priority_text,
                    'priority_class': priority_class,
                    'is_overdue': is_overdue,
                    'escalated': escalation_count > 0,
                    'escalation_count': escalation_count,
                })
        
        return super().changeform_view(request, object_id, form_url, extra_context)
    
    # 🔐 Department-wise admin visibility
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        try:
            return qs.filter(department=request.user.officer.department)
        except:
            return qs.none()


# -----------------------------
# Complaint Escalation
# -----------------------------
@admin.register(ComplaintEscalation)
class ComplaintEscalationAdmin(admin.ModelAdmin):
    list_display = ('id', 'complaint_link', 'escalated_from', 'escalated_to', 'reason_short', 'escalated_at')
    list_filter = ('escalated_at', 'escalated_to__department')
    search_fields = ('complaint__title', 'reason')
    readonly_fields = ('complaint', 'escalated_from', 'escalated_to', 'reason', 'escalated_at')
    
    def complaint_link(self, obj):
        url = reverse('admin:civic_saathi_complaint_change', args=[obj.complaint.id])
        return format_html('<a href="{}">{} - {}</a>', url, obj.complaint.id, obj.complaint.title[:50])
    complaint_link.short_description = 'Complaint'
    
    def reason_short(self, obj):
        return obj.reason[:100] + '...' if len(obj.reason) > 100 else obj.reason
    reason_short.short_description = 'Reason'
    
    def has_add_permission(self, request):
        return False  # Escalations are created through other means
    
    def has_delete_permission(self, request, obj=None):
        return False  # Preserve escalation history


# -----------------------------
# Worker Attendance
# -----------------------------
@admin.register(WorkerAttendance)
class WorkerAttendanceAdmin(admin.ModelAdmin):
    list_display = ('worker', 'date', 'status', 'check_in_time', 'check_out_time', 'marked_by')
    list_filter = ('status', 'date', 'worker__department')
    search_fields = ('worker__user__username', 'worker__user__first_name', 'worker__user__last_name')
    date_hierarchy = 'date'


# -----------------------------
# Hide raw logs from main menu
# -----------------------------
@admin.register(ComplaintLog)
class ComplaintLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'complaint', 'action_by', 'note_short', 'timestamp')
    list_filter = ('timestamp',)
    readonly_fields = ('complaint', 'action_by', 'note', 'old_status', 'new_status', 'timestamp')
    
    def note_short(self, obj):
        return obj.note[:100] + '...' if len(obj.note) > 100 else obj.note
    note_short.short_description = 'Note'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


# -----------------------------
# AI Verification Log (Filter B Audit Trail)
# -----------------------------
@admin.register(AIVerificationLog)
class AIVerificationLogAdmin(admin.ModelAdmin):
    """Read-only audit trail for every AI-assisted verification decision."""
    list_display = ('id', 'complaint', 'result', 'image_path_snapshot', 'created_at')
    list_filter = ('result', 'created_at')
    search_fields = ('complaint__title', 'description_snapshot')
    readonly_fields = (
        'complaint', 'result', 'description_snapshot',
        'image_path_snapshot', 'error_detail', 'created_at'
    )
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# -----------------------------
# Worker Notification Admin
# -----------------------------
@admin.register(WorkerNotification)
class WorkerNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'worker', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'worker__user__username')
    readonly_fields = ('worker', 'complaint', 'notification_type', 'title', 'message', 'created_at')
    ordering = ('-created_at',)