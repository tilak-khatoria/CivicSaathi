from django.urls import path
from . import views_api

urlpatterns = [
    # Authentication
    path('auth/register/', views_api.register, name='register'),
    path('auth/login/', views_api.login, name='login'),
    path('auth/logout/', views_api.logout, name='logout'),
    path('auth/me/', views_api.current_user, name='current_user'),
    
    # Worker Authentication
    path('worker/login/', views_api.worker_login, name='worker_login'),
    path('worker/me/', views_api.worker_current_user, name='worker_current_user'),
    
    # Complaints - Citizen
    path('complaints/analyze-image/', views_api.analyze_complaint_image, name='analyze_complaint_image'),
    path('complaints/create/', views_api.ComplaintCreateView.as_view(), name='complaint_create'),
    path('complaints/all/', views_api.AllComplaintsView.as_view(), name='all_complaints'),
    path('complaints/my/', views_api.MyComplaintsView.as_view(), name='my_complaints'),
    path('complaints/upvoted/', views_api.MyUpvotedComplaintsView.as_view(), name='my_upvoted_complaints'),
    path('complaints/<int:pk>/', views_api.ComplaintDetailView.as_view(), name='complaint_detail'),
    path('complaints/<int:pk>/upvote/', views_api.upvote_complaint, name='upvote_complaint'),
    path('complaints/<int:pk>/logs/', views_api.complaint_logs, name='complaint_logs'),
    
    # Complaints - Department Admin
    path('department/complaints/', views_api.department_complaints, name='department_complaints'),
    path('complaints/<int:pk>/verify/', views_api.verify_complaint, name='verify_complaint'),
    path('complaints/<int:pk>/assign/', views_api.assign_to_worker, name='assign_to_worker'),
    path('complaints/<int:pk>/update-status/', views_api.update_complaint_status, name='update_complaint_status'),
    path('complaints/<int:pk>/reject/', views_api.reject_complaint, name='reject_complaint'),
    path('complaints/<int:pk>/delete/', views_api.delete_complaint, name='delete_complaint'),
    path('complaints/<int:pk>/reassign/', views_api.reassign_complaint, name='reassign_complaint'),
    path('complaints/<int:pk>/assign-office/', views_api.assign_office_to_complaint_view, name='assign_office_complaint'),
    
    # Worker
    path('worker/assignments/', views_api.worker_assignments, name='worker_assignments'),
    path('worker/dashboard/stats/', views_api.worker_dashboard_stats, name='worker_dashboard_stats'),
    path('worker/complaints/<int:pk>/', views_api.worker_complaint_detail, name='worker_complaint_detail'),
    path('worker/complaints/<int:pk>/complete/', views_api.worker_complete_complaint, name='worker_complete_complaint'),

    # Worker Notifications (Multi-Channel Alert System)
    path('worker/notifications/', views_api.worker_notifications, name='worker_notifications'),
    path('worker/notifications/<int:pk>/read/', views_api.worker_notification_mark_read, name='worker_notification_mark_read'),
    path('worker/notifications/mark-all-read/', views_api.worker_notifications_mark_all_read, name='worker_notifications_mark_all_read'),
    
    # Attendance
    path('attendance/mark/', views_api.mark_attendance, name='mark_attendance'),
    path('attendance/', views_api.get_attendance, name='get_attendance'),
    path('attendance/register/', views_api.get_attendance_register, name='get_attendance_register'),
    path('attendance/bulk-mark/', views_api.bulk_mark_attendance, name='bulk_mark_attendance'),
    
    # Categories & Departments
    path('categories/', views_api.get_categories, name='get_categories'),
    path('departments/', views_api.get_departments, name='get_departments'),
    path('offices/', views_api.get_offices, name='get_offices'),
    path('offices/create/', views_api.create_office, name='create_office'),
    path('offices/<int:pk>/update/', views_api.update_office, name='update_office'),
    
    # Workers
    path('workers/', views_api.get_workers, name='get_workers'),
    path('workers/create/', views_api.create_worker, name='create_worker'),
    path('workers/delete-all/', views_api.delete_all_workers, name='delete_all_workers'),
    path('workers/<int:pk>/', views_api.get_worker_detail, name='get_worker_detail'),
    path('workers/<int:pk>/update/', views_api.update_worker, name='update_worker'),
    path('workers/<int:pk>/statistics/', views_api.get_worker_statistics, name='get_worker_statistics'),
    path('workers/<int:pk>/complaints/', views_api.get_worker_complaints, name='get_worker_complaints'),
    
    # Dashboard
    path('dashboard/stats/', views_api.dashboard_stats, name='dashboard_stats'),

    # SLA Management
    path('sla/configs/', views_api.sla_configs, name='sla_configs'),
    path('sla/configs/<int:pk>/', views_api.update_sla_config, name='update_sla_config'),
    path('sla/report/', views_api.sla_report, name='sla_report'),
    path('sla/trigger-escalation/', views_api.trigger_escalation, name='trigger_escalation'),
]
