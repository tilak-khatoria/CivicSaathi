from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.conf import settings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from .models import (
    CustomUser, Complaint, ComplaintLog, ComplaintVote, ComplaintCategory,
    Department, SubAdminCategory, Worker, WorkerAttendance, DepartmentAttendance, Office, SLAConfig,
    AIVerificationLog
)
from .serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer,
    ComplaintSerializer, ComplaintCreateSerializer, ComplaintUpdateSerializer,
    ComplaintLogSerializer, ComplaintVoteSerializer, DepartmentSerializer,
    SubAdminCategorySerializer, ComplaintCategorySerializer,
    WorkerSerializer, WorkerAttendanceSerializer, DepartmentAttendanceSerializer, OfficeSerializer
)
from .filter_system import ComplaintFilterSystem, ComplaintSortingSystem, ComplaintAssignmentSystem
from .ai_filter import is_complaint_genuine  # Filter B: AI-assisted visual verification
from .duplicate_detection import generate_smart_hash, generate_candidate_hashes, find_duplicate
from .permissions import IsAdmin, IsSubAdmin, IsDepartmentAdmin, IsCitizen
from .admin_auth import AdminTokenAuthentication
from .email_service import (
    send_complaint_created_email,
    send_complaint_upvoted_email,
    send_worker_assigned_email,
    send_completion_email,
)


# -------------------------
# Helper Functions
# -------------------------
def get_action_user(request):
    """Get the user for logging actions, handling admin mock users"""
    if hasattr(request.user, 'is_admin') and request.user.is_admin:
        # Admin user is a mock object, return None for logging
        return None
    return request.user


# -------------------------
# Authentication Views
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration"""
    try:
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print("Registration Error:", str(e))
        traceback.print_exc()
        return Response({
            'error': str(e),
            'detail': 'An error occurred during registration'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User (citizen) login only"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user:
        if user.user_type == 'WORKER':
            return Response(
                {'error': 'Worker accounts must use the Worker Login Portal.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if user.user_type in ('ADMIN', 'SUB_ADMIN', 'DEPT_ADMIN'):
            return Response(
                {'error': 'Admin accounts must use the Admin Login Portal.'},
                status=status.HTTP_403_FORBIDDEN
            )
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def worker_login(request):
    """Worker login"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    if user and user.user_type == 'WORKER':
        # Check if worker exists
        try:
            worker = Worker.objects.get(user=user, is_active=True)
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'user_type': user.user_type,
                },
                'worker': {
                    'id': worker.id,
                    'department': worker.department.name,
                    'department_id': worker.department.id,
                    'office': worker.office.name if worker.office else None,
                    'office_id': worker.office.id if worker.office else None,
                    'role': worker.role,
                    'city': worker.city,
                    'state': worker.state,
                },
                'token': token.key
            })
        except Worker.DoesNotExist:
            return Response({'error': 'Worker account not found or inactive'}, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({'error': 'Invalid credentials or not a worker account'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout"""
    request.user.auth_token.delete()
    return Response({'message': 'Successfully logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current user info"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


# -------------------------
# Complaint Views for Citizens
# -------------------------
class ComplaintCreateView(generics.CreateAPIView):
    """Create new complaint with Smart Geo-Hash Duplicate Detection"""
    serializer_class = ComplaintCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Override create() to run duplicate detection BEFORE saving.

        Flow:
          1. Validate incoming data.
          2. Generate the 10-char smart hash [TITLE3][LAT2][LON2][DEPT3].
          3. Search for existing active complaint with that hash.
             • Match + same user   → HTTP 409 ("You have already reported this issue.")
             • Match + diff user   → HTTP 200 with auto-upvote.
             • No match            → proceed with normal creation pipeline.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vd = serializer.validated_data
        title = vd.get('title', '')
        latitude = vd.get('latitude')
        longitude = vd.get('longitude')
        department = vd.get('department')
        dept_name = department.name if department else None

        # ── Generate 10-char Smart Hash ─────────────────────────────────────
        smart_hash = generate_smart_hash(title, latitude, longitude, dept_name)

        # ── Generate all 9 candidate hashes (primary + 8 neighbors) ────────
        lat_f = float(latitude) if latitude is not None else None
        lng_f = float(longitude) if longitude is not None else None
        candidate_hashes = generate_candidate_hashes(
            title, latitude, longitude, dept_name
        )

        # ── Duplicate lookup with neighbor search + Haversine ──────────────
        existing = find_duplicate(
            smart_hash,
            candidate_hashes=candidate_hashes,
            new_lat=lat_f,
            new_lng=lng_f,
        )

        if existing is not None:
            # Same user already reported this issue
            if existing.user_id == request.user.id:
                return Response(
                    {
                        'duplicate': True,
                        'auto_upvoted': False,
                        'smart_hash': smart_hash,
                        'message': 'You have already reported this issue.',
                        'existing_complaint_id': existing.id,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Different user → auto-upvote
            vote, vote_created = ComplaintVote.objects.get_or_create(
                complaint=existing,
                user=request.user,
            )
            if vote_created:
                existing.upvote_count += 1
                existing.save()
                send_complaint_upvoted_email(existing)

            complaint_data = ComplaintSerializer(
                existing, context={'request': request}
            ).data
            return Response(
                {
                    'duplicate': True,
                    'auto_upvoted': True,
                    'smart_hash': smart_hash,
                    'message': 'This issue already exists. Your support has been added.',
                    'existing_complaint_id': existing.id,
                    'upvote_count': existing.upvote_count,
                    'complaint': complaint_data,
                },
                status=status.HTTP_200_OK,
            )

        # ── No duplicate → normal creation ──────────────────────────────────
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer):
        complaint = serializer.save(user=self.request.user)

        # ── Sorting Layer B prep: pin city/state from citizen's registered profile ─────
        # The office routing in Sorting Layer B uses complaint.city to locate the
        # correct municipal office.  We always override the submitted value with
        # the authenticated user's registered city so complaints are never
        # mis-routed due to a typo or deliberate change in the submission form.
        registered_city = (self.request.user.city or '').strip()
        registered_state = (self.request.user.state or '').strip()
        if registered_city and (
            complaint.city != registered_city or complaint.state != registered_state
        ):
            complaint.city = registered_city
            complaint.state = registered_state
            complaint.save(update_fields=['city', 'state', 'updated_at'])

        # ── Filter A: Rule-based NLP check ──────────────────────────────────────
        validation_result = ComplaintFilterSystem.validate_complaint(complaint)
        
        complaint.filter_checked = True
        complaint.filter_passed = validation_result['passed']
        complaint.filter_reason = validation_result['reason']
        complaint.is_spam = validation_result['is_spam']
        
        if not validation_result['passed']:
            complaint.status = 'DECLINED'
            complaint.save()
            ComplaintLog.objects.create(
                complaint=complaint,
                action_by=self.request.user,
                note=f"Filter A rejected complaint. Reason: {validation_result['reason']}",
                new_status=complaint.status
            )
            send_complaint_created_email(complaint)
            return

        # ── Filter B: AI-assisted visual verification (Gemini Vision) ───────────
        if complaint.image:
            image_path = complaint.image.path
            description = complaint.description
            ai_result = 'ERROR'
            error_detail = ''

            try:
                is_valid = is_complaint_genuine(image_path, description)
                ai_result = 'YES' if is_valid else 'NO'
            except Exception as exc:
                # Fail-safe: do not block complaint; route to manual review
                error_detail = str(exc)
                ai_result = 'ERROR'
                is_valid = None  # unknown

            # Log the AI decision for audit / transparency
            AIVerificationLog.objects.create(
                complaint=complaint,
                result=ai_result,
                description_snapshot=description,
                image_path_snapshot=image_path,
                error_detail=error_detail,
            )

            if ai_result == 'NO':
                complaint.status = 'DECLINED'
                complaint.filter_reason = (
                    complaint.filter_reason
                    + " | Filter B: AI-assisted verification failed — image does not match description."
                )
                complaint.save()
                ComplaintLog.objects.create(
                    complaint=complaint,
                    action_by=self.request.user,
                    note="Filter B (Gemini Vision) declined complaint: image does not match description.",
                    new_status=complaint.status
                )
                send_complaint_created_email(complaint)
                return

            elif ai_result == 'ERROR':
                complaint.status = 'PENDING_VERIFICATION'
                complaint.save()
                ComplaintLog.objects.create(
                    complaint=complaint,
                    action_by=self.request.user,
                    note=f"Filter B (Gemini Vision) encountered an error; routed for manual review. Detail: {error_detail}",
                    new_status=complaint.status
                )
                send_complaint_created_email(complaint)
                return

            # ai_result == 'YES' → complaint is verified; continue pipeline
            complaint.is_genuine = True

        # ── Log: both filters cleared ────────────────────────────────────────────
        ComplaintLog.objects.create(
            complaint=complaint,
            action_by=self.request.user,
            note=(
                f"Complaint passed all verification filters. "
                f"Filter A result: {validation_result['reason']}"
                + (
                    " | Filter B (AI): image verified as genuine."
                    if complaint.image else " | No image submitted; Filter B skipped."
                )
            ),
            old_status='SUBMITTED',
            new_status='FILTERING',
        )

        # ── Automated Department Sorting Layer ───────────────────────────────────
        # Reads the department recorded at submission, transitions status through
        # SORTING → PENDING, and auto-assigns the matching city office.
        sorting_result = ComplaintSortingSystem.sort_complaint(complaint)

        # Keep city/state metadata in sync (no-op if already correct).
        ComplaintAssignmentSystem.assign_complaint(
            complaint,
            complaint.city,
            complaint.state,
        )

        # Log the sorting decision for full traceability.
        # old_status='FILTERING' → new_status='SORTING' represents the department-routing
        # step only. The subsequent SORTING → ASSIGNED (or PENDING) transition is already
        # logged independently by WorkerAssignmentLayer.assign_worker(), so keeping these
        # two statuses distinct prevents the "Being Sorted → Assigned" entry from
        # appearing twice in the activity log.
        ComplaintLog.objects.create(
            complaint=complaint,
            action_by=self.request.user,
            note=(
                f"[Automated Department Sorting Layer] {sorting_result['reason']}"
                if sorting_result['success']
                else (
                    f"[Automated Department Sorting Layer] Sorting could not complete automatically. "
                    f"Reason: {sorting_result['reason']}"
                )
            ),
            old_status='FILTERING',
            new_status='SORTING',
            new_dept=sorting_result.get('department'),
        )

        # Send confirmation email to citizen
        send_complaint_created_email(complaint)


class MyComplaintsView(generics.ListAPIView):
    """Get all complaints by current user"""
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Complaint.objects.filter(
            user=self.request.user,
            is_deleted=False
        ).order_by('-created_at')


class MyUpvotedComplaintsView(generics.ListAPIView):
    """Get all complaints upvoted by the current user"""
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        upvoted_ids = ComplaintVote.objects.filter(
            user=self.request.user
        ).values_list('complaint_id', flat=True)
        return Complaint.objects.filter(
            id__in=upvoted_ids,
            is_deleted=False
        ).order_by('-created_at')


class AllComplaintsView(generics.ListAPIView):
    """Get all complaints in user's area (city/state) or all for admins"""
    serializer_class = ComplaintSerializer
    permission_classes = [AllowAny]  # Allow any access for both users and admins
    authentication_classes = []  # Disable authentication requirement

    def get_queryset(self):
        # Check if admin headers are present
        is_admin = self.request.headers.get('X-Admin-Token') or self.request.headers.get('X-Admin-User')
        
        # Show all non-deleted complaints (including demo complaints that haven't been filtered)
        queryset = Complaint.objects.filter(
            is_deleted=False
        )
        
        # If admin, return all complaints without filtering
        if is_admin:
            return queryset.order_by('-created_at')
        
        # For regular users, filter by location (optional - show all if no filters)
        user = self.request.user if self.request.user.is_authenticated else None
        if user:
            city = self.request.query_params.get('city', None)  # Don't auto-filter by user's city
            state = self.request.query_params.get('state', None)
        else:
            city = self.request.query_params.get('city')
            state = self.request.query_params.get('state')
        
        if city:
            queryset = queryset.filter(city__icontains=city)
        if state:
            queryset = queryset.filter(state__icontains=state)
        
        # Always order by most recent first
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override to ensure proper response format"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ComplaintDetailView(generics.RetrieveAPIView):
    """Get complaint details"""
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer
    permission_classes = [AllowAny]  # Allow any access for both users and admins
    authentication_classes = []  # Disable authentication requirement

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upvote_complaint(request, pk):
    """Upvote a complaint"""
    complaint = get_object_or_404(Complaint, pk=pk)

    # Prevent users from upvoting their own complaints
    if complaint.user == request.user:
        return Response(
            {'error': 'You cannot upvote your own complaint.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if user already voted
    vote, created = ComplaintVote.objects.get_or_create(
        complaint=complaint,
        user=request.user
    )
    
    if created:
        # Increment upvote count
        complaint.upvote_count += 1
        complaint.save()
        # Notify original complainant about the new upvote
        send_complaint_upvoted_email(complaint)
        return Response({'message': 'Upvoted successfully', 'upvotes': complaint.upvote_count})
    else:
        # Remove vote
        vote.delete()
        complaint.upvote_count -= 1
        complaint.save()
        return Response({'message': 'Vote removed', 'upvotes': complaint.upvote_count})


# -------------------------
# Department Admin Views
# -------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_complaints(request):
    """Get complaints for department admin's department and city"""
    user = request.user
    
    # Check if user is department admin
    if not hasattr(user, 'departmentadminprofile'):
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    profile = user.departmentadminprofile
    department = profile.department
    city = profile.city
    
    status_filter = request.query_params.get('status', None)
    
    queryset = Complaint.objects.filter(
        department=department,
        city__icontains=city,
        is_deleted=False,
        filter_passed=True
    )
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    queryset = queryset.order_by('-priority', '-created_at')
    serializer = ComplaintSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def assign_to_worker(request, pk):
    """Assign complaint to worker"""
    complaint = get_object_or_404(Complaint, pk=pk)
    worker_id = request.data.get('worker_id')
    notes = request.data.get('notes', '')
    sla_hours = request.data.get('sla_hours')
    
    if not worker_id:
        return Response({'error': 'Worker ID required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not sla_hours:
        return Response({'error': 'SLA time (in hours) is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        sla_hours = int(sla_hours)
        if sla_hours <= 0:
            return Response({'error': 'SLA time must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)
    except (ValueError, TypeError):
        return Response({'error': 'Invalid SLA time format'}, status=status.HTTP_400_BAD_REQUEST)
    
    worker = get_object_or_404(Worker, pk=worker_id)
    
    # Calculate SLA deadline
    from django.utils import timezone
    from datetime import timedelta
    sla_deadline = timezone.now() + timedelta(hours=sla_hours)
    
    # Update complaint
    old_status = complaint.status
    complaint.current_worker = worker
    complaint.status = 'IN_PROGRESS'
    complaint.assigned = True
    complaint.sla_deadline = sla_deadline
    
    # Assign office from worker if worker has an office
    if worker.office:
        complaint.office = worker.office
    
    complaint.save()
    
    # Log the action - use get_action_user helper
    action_user = get_action_user(request)
    
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=action_user,
        note=f"Assigned to worker {worker.user.username}. SLA: {sla_hours} hours. {notes}",
        old_status=old_status,
        new_status='IN_PROGRESS',
        new_assignee=worker.user.username
    )

    # Notify citizen that a worker has been assigned
    send_worker_assigned_email(complaint)

    serializer = ComplaintSerializer(complaint)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_complaint(request, pk):
    """Verify a complaint as genuine (manual admin path for PENDING_VERIFICATION complaints)"""
    try:
        complaint = get_object_or_404(Complaint, pk=pk)

        old_status = complaint.status

        # Mark as genuine and verified
        complaint.is_genuine = True
        complaint.filter_passed = True
        complaint.filter_checked = True
        complaint.is_spam = False
        complaint.status = 'VERIFIED'
        complaint.save()

        action_user = get_action_user(request)

        ComplaintLog.objects.create(
            complaint=complaint,
            action_by=action_user,
            note="Complaint verified as genuine by admin",
            old_status=old_status,
            new_status=complaint.status,
        )

        # ── Automated Department Sorting Layer (manual-verify path) ─────────────
        # A PENDING_VERIFICATION complaint has cleared Filter A; the admin has now
        # confirmed it is genuine.  Run the sorting layer so the complaint is
        # automatically routed to the correct department + office, identical to
        # the automated path.
        sorting_result = ComplaintSortingSystem.sort_complaint(complaint)

        ComplaintLog.objects.create(
            complaint=complaint,
            action_by=action_user,
            note=(
                f"[Automated Department Sorting Layer] {sorting_result['reason']}"
                if sorting_result['success']
                else (
                    "[Automated Department Sorting Layer] Could not auto-sort after manual verification. "
                    f"Reason: {sorting_result['reason']}"
                )
            ),
            old_status='SORTING',
            new_status=complaint.status,
            new_dept=sorting_result.get('department'),
        )

        return Response({
            'message': 'Complaint verified and automatically sorted to the correct department.',
            'status': complaint.status,
            'is_genuine': complaint.is_genuine,
            'department': sorting_result['department'].name if sorting_result.get('department') else None,
            'office': sorting_result['office'].name if sorting_result.get('office') else None,
            'worker': sorting_result['worker'].user.username if sorting_result.get('worker') else None,
            'sorting_detail': sorting_result['reason'],
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to verify complaint: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_complaint_status(request, pk):
    """Update complaint status"""
    complaint = get_object_or_404(Complaint, pk=pk)
    new_status = request.data.get('status')
    note = request.data.get('note', '')
    
    if not new_status:
        return Response({'error': 'Status required'}, status=status.HTTP_400_BAD_REQUEST)
    
    old_status = complaint.status
    complaint.status = new_status
    
    # If marking as genuine or rejected
    if 'is_genuine' in request.data:
        complaint.is_genuine = request.data['is_genuine']
    
    # If completed, require completion image
    if new_status == 'COMPLETED':
        if 'completion_image' in request.FILES:
            complaint.completion_image = request.FILES['completion_image']
        complaint.completion_note = request.data.get('completion_note', '')
        complaint.completed_at = timezone.now()
    
    # Sorting Layer B: auto-assign office when transitioning to PENDING
    # (covers cases where a complaint reaches PENDING via manual admin action
    # rather than the automated submission pipeline).
    if new_status == 'PENDING' and not complaint.office:
        ComplaintSortingSystem.apply_office_sorting(complaint)

    complaint.save()
    
    # Log the action
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=get_action_user(request),
        note=note or f"Status updated to {new_status}",
        old_status=old_status,
        new_status=new_status
    )

    # Notify citizen when complaint is marked as completed
    if new_status == 'COMPLETED':
        send_completion_email(complaint)

    return Response({'message': 'Status updated successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_complaint(request, pk):
    """Reject a complaint"""
    complaint = get_object_or_404(Complaint, pk=pk)
    reason = request.data.get('reason', 'Not genuine')
    
    old_status = complaint.status
    complaint.status = 'REJECTED'
    complaint.is_genuine = False
    complaint.save()
    
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=get_action_user(request),
        note=f"Rejected: {reason}",
        old_status=old_status,
        new_status='REJECTED'
    )
    
    return Response({'message': 'Complaint rejected'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_complaint(request, pk):
    """Delete unnecessary/wrong complaint (Sub-Admin only)"""
    user = request.user
    
    # Check if user is sub-admin or admin (allow admin mock users)
    if hasattr(user, 'is_admin') and user.is_admin:
        # Admin mock user, allow access
        pass
    elif not hasattr(user, 'user_type') or user.user_type not in ['ADMIN', 'SUB_ADMIN']:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
    
    complaint = get_object_or_404(Complaint, pk=pk)
    complaint.is_deleted = True
    complaint.save()
    
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=get_action_user(request),
        note="Complaint deleted by admin",
        old_status=complaint.status,
        new_status='DELETED'
    )
    
    return Response({'message': 'Complaint deleted successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def reassign_complaint(request, pk):
    """Reassign complaint to a different department and auto-sort office."""
    complaint = get_object_or_404(Complaint, pk=pk)
    department_id = request.data.get('department_id')
    reason = request.data.get('reason', '')

    if not department_id:
        return Response({'error': 'department_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    department = get_object_or_404(Department, pk=department_id)
    old_dept = complaint.department
    old_status = complaint.status

    complaint.department = department
    complaint.office = None   # clear old office; sorting layer will re-assign
    complaint.sorted = False
    complaint.save()

    action_user = get_action_user(request)
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=action_user,
        note=f"Department reassigned from '{old_dept.name if old_dept else 'N/A'}' to '{department.name}'. Reason: {reason}",
        old_status=old_status,
        new_status=complaint.status,
        new_dept=department,
    )

    # Run Sorting Layer B to auto-assign the correct office in new department
    sorting_result = ComplaintSortingSystem.apply_office_sorting(complaint)
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=action_user,
        note=f"[Auto Office Sorting] {sorting_result['reason']}",
        old_status=complaint.status,
        new_status=complaint.status,
    )

    serializer = ComplaintSerializer(complaint)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def assign_office_to_complaint_view(request, pk):
    """Directly assign a specific office to a complaint."""
    complaint = get_object_or_404(Complaint, pk=pk)
    office_id = request.data.get('office_id')
    notes = request.data.get('notes', '')

    if not office_id:
        return Response({'error': 'office_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    office = get_object_or_404(Office, pk=office_id)
    old_status = complaint.status

    complaint.office = office
    complaint.save(update_fields=['office', 'updated_at'])

    action_user = get_action_user(request)
    ComplaintLog.objects.create(
        complaint=complaint,
        action_by=action_user,
        note=f"Office manually assigned to '{office.name}'. {notes}".strip(),
        old_status=old_status,
        new_status=complaint.status,
    )

    serializer = ComplaintSerializer(complaint)
    return Response(serializer.data)


# -------------------------
# Worker Views
# -------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_assignments(request):
    """Get complaints assigned to current worker"""
    user = request.user
    
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)
    
    worker = user.worker
    complaints = Complaint.objects.filter(
        current_worker=worker,
        is_deleted=False
    ).order_by('-priority', '-created_at')
    
    serializer = ComplaintSerializer(complaints, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_current_user(request):
    """Get current worker details"""
    user = request.user
    
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)
    
    worker = user.worker
    serializer = WorkerSerializer(worker)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_dashboard_stats(request):
    """Get dashboard statistics for current worker"""
    user = request.user
    
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)
    
    worker = user.worker
    from django.utils import timezone
    from datetime import timedelta
    
    # Get all complaints assigned to this worker
    all_complaints = Complaint.objects.filter(current_worker=worker, is_deleted=False)
    
    # Calculate overdue complaints (complaints older than 7 days and still in progress)
    overdue_threshold = timezone.now() - timedelta(days=7)
    
    # Calculate statistics
    stats = {
        'assigned': all_complaints.count(),
        'pending': all_complaints.filter(status__in=['ASSIGNED', 'PENDING']).count(),
        'in_progress': all_complaints.filter(status='IN_PROGRESS').count(),
        'completed': all_complaints.filter(status__in=['COMPLETED', 'RESOLVED']).count(),
        'overdue': all_complaints.filter(
            status__in=['ASSIGNED', 'IN_PROGRESS'],
            created_at__lt=overdue_threshold
        ).count(),
    }
    
    return Response(stats)


# -------------------------
# Worker Notification API (Multi-Channel Alert System)
# -------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_notifications(request):
    """Return the current worker's notifications, newest first.

    Query params
    ────────────
    unread_only=true   – filter to unread notifications only
    """
    from .models import WorkerNotification

    user = request.user
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)

    qs = WorkerNotification.objects.filter(worker=user.worker).select_related('complaint')

    if request.query_params.get('unread_only', '').lower() == 'true':
        qs = qs.filter(is_read=False)

    notifications = qs[:50]  # cap at 50 most recent
    data = [
        {
            'id': n.id,
            'type': n.notification_type,
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'complaint_id': n.complaint_id,
            'complaint_title': n.complaint.title if n.complaint else '',
            'created_at': n.created_at.isoformat(),
        }
        for n in notifications
    ]

    unread_count = WorkerNotification.objects.filter(worker=user.worker, is_read=False).count()

    return Response({
        'notifications': data,
        'unread_count': unread_count,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def worker_notification_mark_read(request, pk):
    """Mark a single notification as read."""
    from .models import WorkerNotification

    user = request.user
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)

    try:
        notification = WorkerNotification.objects.get(pk=pk, worker=user.worker)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'status': 'ok'})
    except WorkerNotification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def worker_notifications_mark_all_read(request):
    """Mark all unread notifications for the current worker as read."""
    from .models import WorkerNotification

    user = request.user
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)

    count = WorkerNotification.objects.filter(worker=user.worker, is_read=False).update(is_read=True)
    return Response({'status': 'ok', 'marked': count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def worker_complaint_detail(request, pk):
    """Get complaint detail for worker"""
    user = request.user
    
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        complaint = Complaint.objects.get(pk=pk, current_worker=user.worker, is_deleted=False)
        serializer = ComplaintSerializer(complaint, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Complaint.DoesNotExist:
        return Response(
            {'error': 'Complaint not found or not assigned to you'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def worker_complete_complaint(request, pk):
    """Mark complaint as completed by worker"""
    user = request.user
    
    if not hasattr(user, 'worker'):
        return Response({'error': 'Not a worker'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        complaint = Complaint.objects.get(pk=pk, current_worker=user.worker, is_deleted=False)
        
        # Update complaint status
        complaint.status = 'COMPLETED'
        complaint.completion_note = request.data.get('completion_note', '')
        
        # Handle completion image if provided
        if 'completion_image' in request.FILES:
            complaint.completion_image = request.FILES['completion_image']
        
        complaint.resolved_at = timezone.now()
        complaint.save()
        
        # Create log entry
        ComplaintLog.objects.create(
            complaint=complaint,
            note=f'Status changed to COMPLETED by worker {user.username}. Completion note: {complaint.completion_note}',
            old_status=complaint.status,
            new_status='COMPLETED',
            action_by=user
        )

        # Notify citizen of successful resolution
        send_completion_email(complaint)

        serializer = ComplaintSerializer(complaint, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Complaint.DoesNotExist:
        return Response(
            {'error': 'Complaint not found or not assigned to you'},
            status=status.HTTP_404_NOT_FOUND
        )


# -------------------------
# Worker Management Views
# -------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def get_workers(request):
    """Get all workers with optional filters"""
    queryset = Worker.objects.filter(is_active=True).select_related('user', 'department', 'office')
    
    # Filters
    department_id = request.query_params.get('department')
    office_id = request.query_params.get('office')
    city = request.query_params.get('city')
    
    if department_id:
        queryset = queryset.filter(department_id=department_id)
    if office_id:
        queryset = queryset.filter(office_id=office_id)
    if city:
        queryset = queryset.filter(user__city__iexact=city)
    
    serializer = WorkerSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_worker_detail(request, pk):
    """Get worker detail"""
    worker = get_object_or_404(Worker, pk=pk)
    serializer = WorkerSerializer(worker)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_worker(request):
    """Create a new worker"""
    from django.db import connection
    from datetime import date
    
    # Extract data
    username = request.data.get('username')
    password = request.data.get('password')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    email = request.data.get('email')
    phone = request.data.get('phone')
    department_id = request.data.get('department_id')
    office_id = request.data.get('office_id')
    role = request.data.get('role')
    city = request.data.get('city')
    state = request.data.get('state', 'Rajasthan')
    address = request.data.get('address', '')
    
    # Validation
    if not all([username, password, first_name, last_name, department_id, role, city]):
        return Response(
            {'error': 'Missing required fields: username, password, first_name, last_name, department_id, role, city'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if username already exists
    if CustomUser.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate phone number if provided
    if phone:
        import re
        if not re.match(r'^[6-9]\d{9}$', phone):
            return Response(
                {'error': 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if phone number already exists
        if CustomUser.objects.filter(phone=phone).exists():
            return Response(
                {'error': 'This phone number is already registered. Please use a different number.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Check if department exists
    try:
        department = Department.objects.get(id=department_id)
    except Department.DoesNotExist:
        return Response(
            {'error': 'Department not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if office exists (optional)
    office = None
    if office_id:
        try:
            office = Office.objects.get(id=office_id)
        except Office.DoesNotExist:
            pass
    
    try:
        # Create user in custom_user table
        user = CustomUser.objects.create_user(
            username=username,
            email=email or f'{username}@municipal.gov.in',
            password=password,
            first_name=first_name,
            last_name=last_name,
            user_type='WORKER',
            city=city,
            state=state,
            phone=phone or ''
        )
        
        # Create worker (Worker model uses CustomUser directly, no need for auth_user)
        worker = Worker.objects.create(
            user=user,
            department=department,
            office=office,
            role=role,
            city=city,
            state=state,
            address=address or f'{city}, {state}',
            joining_date=date.today(),
            is_active=True
        )
        
        serializer = WorkerSerializer(worker)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        # If worker creation fails, delete the user
        if 'user' in locals():
            user.delete()
        return Response(
            {'error': f'Failed to create worker: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def delete_all_workers(request):
    """Delete all workers and their associated users"""
    try:
        # Get all workers
        workers = Worker.objects.all()
        worker_count = workers.count()
        
        # Delete users associated with workers
        user_ids = list(workers.values_list('user_id', flat=True))
        CustomUser.objects.filter(id__in=user_ids, user_type='WORKER').delete()
        
        # Delete workers
        workers.delete()
        
        return Response({
            'message': f'Successfully deleted {worker_count} workers',
            'deleted_count': worker_count
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to delete workers: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@authentication_classes([])
@permission_classes([AllowAny])
def update_worker(request, pk):
    """Update worker details"""
    try:
        worker = get_object_or_404(Worker, pk=pk)
        
        # Extract data
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        phone = request.data.get('phone')
        department_id = request.data.get('department_id')
        office_id = request.data.get('office_id')
        role = request.data.get('role')
        city = request.data.get('city')
        state = request.data.get('state')
        address = request.data.get('address')
        is_active = request.data.get('is_active')
        
        # Update user fields
        user = worker.user
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None:
            user.email = email
        if phone is not None:
            user.phone = phone
        if city is not None:
            user.city = city
        if state is not None:
            user.state = state
        user.save()
        
        # Update worker fields
        if department_id is not None:
            try:
                department = Department.objects.get(id=department_id)
                worker.department = department
            except Department.DoesNotExist:
                return Response(
                    {'error': 'Department not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        if office_id is not None:
            if office_id == '':
                worker.office = None
            else:
                try:
                    office = Office.objects.get(id=office_id)
                    worker.office = office
                except Office.DoesNotExist:
                    return Response(
                        {'error': 'Office not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
        
        if role is not None:
            worker.role = role
        if city is not None:
            worker.city = city
        if state is not None:
            worker.state = state
        if address is not None:
            worker.address = address
        if is_active is not None:
            worker.is_active = is_active
        
        worker.save()
        
        serializer = WorkerSerializer(worker)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to update worker: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_worker_statistics(request, pk):
    """Get worker statistics including active and completed assignments"""
    try:
        worker = get_object_or_404(Worker, pk=pk)
        
        # Get active assignments (IN_PROGRESS or ASSIGNED status)
        active_count = Complaint.objects.filter(
            current_worker=worker,
            status__in=['ASSIGNED', 'IN_PROGRESS']
        ).count()
        
        # Get completed assignments
        completed_count = Complaint.objects.filter(
            current_worker=worker,
            status='COMPLETED'
        ).count()
        
        # Total assignments
        total_count = Complaint.objects.filter(current_worker=worker).count()
        
        return Response({
            'worker_id': worker.id,
            'active_assignments': active_count,
            'completed_assignments': completed_count,
            'total_assignments': total_count
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to get worker statistics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def get_worker_complaints(request, pk):
    """Get all complaints assigned to a specific worker"""
    try:
        worker = get_object_or_404(Worker, pk=pk)
        
        # Get all complaints for this worker
        complaints = Complaint.objects.filter(
            current_worker=worker,
            is_deleted=False
        ).order_by('-created_at')
        
        serializer = ComplaintSerializer(complaints, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to get worker complaints: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# -------------------------
# Attendance Views
# -------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    """Mark worker attendance"""
    worker_id = request.data.get('worker_id')
    date_str = request.data.get('date', timezone.now().date())
    attendance_status = request.data.get('status', 'PRESENT')
    check_in = request.data.get('check_in_time')
    check_out = request.data.get('check_out_time')
    
    worker = get_object_or_404(Worker, pk=worker_id)
    
    if isinstance(date_str, str):
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        date_obj = date_str
    
    attendance, created = WorkerAttendance.objects.update_or_create(
        worker=worker,
        date=date_obj,
        defaults={
            'status': attendance_status,
            'check_in_time': check_in,
            'check_out_time': check_out,
            'marked_by': request.user
        }
    )
    
    serializer = WorkerAttendanceSerializer(attendance)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance(request):
    """Get attendance records"""
    department_id = request.query_params.get('department')
    city = request.query_params.get('city')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    queryset = WorkerAttendance.objects.all()
    
    if department_id:
        queryset = queryset.filter(worker__department_id=department_id)
    if city:
        queryset = queryset.filter(worker__city__icontains=city)
    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)
    
    queryset = queryset.order_by('-date')
    serializer = WorkerAttendanceSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([AllowAny])
def get_attendance_register(request):
    """
    Get attendance register for all workers for a specific date.
    Returns all workers with their attendance status (present/absent).
    If no attendance record exists for a worker on that date, they are marked as absent.
    """
    from datetime import date as date_module
    
    # Get query parameters
    date_str = request.query_params.get('date')
    department_id = request.query_params.get('department_id')
    city = request.query_params.get('city')
    
    # Default to today if no date provided
    if date_str:
        try:
            target_date = date_module.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    else:
        target_date = date_module.today()
    
    # Get all workers with filters
    workers_query = Worker.objects.select_related('user', 'department', 'office').filter(is_active=True)
    
    if department_id:
        workers_query = workers_query.filter(department_id=department_id)
    if city:
        workers_query = workers_query.filter(user__city__iexact=city)
    
    workers = workers_query.order_by('department__name', 'user__first_name')
    
    # Get attendance records for the target date
    attendance_records = WorkerAttendance.objects.filter(date=target_date).select_related('worker')
    attendance_dict = {att.worker_id: att for att in attendance_records}
    
    # Build register data
    register_data = []
    for worker in workers:
        attendance = attendance_dict.get(worker.id)
        
        register_entry = {
            'worker_id': worker.id,
            'worker_name': f"{worker.user.first_name} {worker.user.last_name}".strip() or worker.user.username,
            'username': worker.user.username,
            'role': worker.role,
            'department': worker.department.name if worker.department else 'N/A',
            'office': worker.office.name if worker.office else 'N/A',
            'city': worker.user.city,
            'date': target_date,
            'status': attendance.status if attendance else 'ABSENT',
            'check_in_time': attendance.check_in_time if attendance else None,
            'check_out_time': attendance.check_out_time if attendance else None,
            'marked_by': attendance.marked_by.username if attendance and attendance.marked_by else None,
        }
        register_data.append(register_entry)
    
    return Response({
        'date': target_date,
        'total_workers': len(register_data),
        'present_count': sum(1 for entry in register_data if entry['status'] == 'PRESENT'),
        'absent_count': sum(1 for entry in register_data if entry['status'] == 'ABSENT'),
        'register': register_data
    })


@api_view(['POST'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([AllowAny])
def bulk_mark_attendance(request):
    """
    Mark multiple workers as present for a specific date.
    Accepts a list of worker IDs and marks them all as present.
    """
    from datetime import date as date_module
    
    worker_ids = request.data.get('worker_ids', [])
    date_str = request.data.get('date')
    check_in_time = request.data.get('check_in_time')
    
    if not worker_ids:
        return Response({'error': 'worker_ids is required'}, status=400)
    
    # Default to today if no date provided
    if date_str:
        try:
            target_date = date_module.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    else:
        target_date = date_module.today()
    
    # Get marked_by user
    marked_by_user = get_action_user(request)
    
    # Mark attendance for all workers
    marked_count = 0
    for worker_id in worker_ids:
        try:
            worker = Worker.objects.get(id=worker_id)
            WorkerAttendance.objects.update_or_create(
                worker=worker,
                date=target_date,
                defaults={
                    'status': 'PRESENT',
                    'check_in_time': check_in_time,
                    'marked_by': marked_by_user
                }
            )
            marked_count += 1
        except Worker.DoesNotExist:
            continue
    
    return Response({
        'success': True,
        'message': f'Marked {marked_count} workers as present',
        'date': target_date,
        'marked_count': marked_count
    })


# -------------------------
# Category & Department Views
# -------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def get_categories(request):
    """Get all complaint categories"""
    categories = ComplaintCategory.objects.all()
    serializer = ComplaintCategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_departments(request):
    """Get all departments"""
    departments = Department.objects.all()
    serializer = DepartmentSerializer(departments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_offices(request):
    """Get all offices with optional filters"""
    city = request.query_params.get('city')
    department_id = request.query_params.get('department_id')
    
    queryset = Office.objects.filter(is_active=True)
    
    if city:
        queryset = queryset.filter(city__iexact=city)
    if department_id:
        queryset = queryset.filter(department_id=department_id)
    
    queryset = queryset.order_by('city', 'department__name')
    serializer = OfficeSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_office(request):
    """Create a new office"""
    # Extract data
    name = request.data.get('name')
    department_id = request.data.get('department_id')
    city = request.data.get('city')
    state = request.data.get('state', 'Rajasthan')
    address = request.data.get('address')
    pincode = request.data.get('pincode', '')
    phone = request.data.get('phone', '')
    email = request.data.get('email', '')
    office_hours = request.data.get('office_hours', '9:00 AM - 5:00 PM')
    
    # Validation
    if not all([name, department_id, city, address]):
        return Response(
            {'error': 'Missing required fields: name, department_id, city, address'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if department exists
    try:
        department = Department.objects.get(id=department_id)
    except Department.DoesNotExist:
        return Response(
            {'error': 'Department not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if office with same department and city already exists
    if Office.objects.filter(department=department, city__iexact=city).exists():
        return Response(
            {'error': f'An office for {department.name} in {city} already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create office
        office = Office.objects.create(
            name=name,
            department=department,
            city=city,
            state=state,
            address=address,
            pincode=pincode or '000000',
            phone=phone or '0000000000',
            email=email or f'{city.lower()}.{department.name.lower().replace(" ", "")}@municipal.gov.in',
            office_hours=office_hours,
            is_active=True
        )
        
        serializer = OfficeSerializer(office)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {'error': f'Failed to create office: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@authentication_classes([])
@permission_classes([AllowAny])
def update_office(request, pk):
    """Update an existing office"""
    try:
        office = Office.objects.get(id=pk)
    except Office.DoesNotExist:
        return Response({'error': 'Office not found'}, status=status.HTTP_404_NOT_FOUND)

    name = request.data.get('name', office.name)
    city = request.data.get('city', office.city)
    state = request.data.get('state', office.state)
    address = request.data.get('address', office.address)
    pincode = request.data.get('pincode', office.pincode)
    phone = request.data.get('phone', office.phone)
    email = request.data.get('email', office.email)
    office_hours = request.data.get('office_hours', office.office_hours)
    is_active = request.data.get('is_active', office.is_active)

    # If department_id provided, validate and update
    department_id = request.data.get('department_id')
    if department_id:
        try:
            department = Department.objects.get(id=department_id)
            # Only check uniqueness if city or department changed
            if department != office.department or city.lower() != office.city.lower():
                if Office.objects.filter(department=department, city__iexact=city).exclude(id=pk).exists():
                    return Response(
                        {'error': f'An office for {department.name} in {city} already exists'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            office.department = department
        except Department.DoesNotExist:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
    elif city.lower() != office.city.lower():
        # city changed but department didn't – still check duplicate
        if Office.objects.filter(department=office.department, city__iexact=city).exclude(id=pk).exists():
            return Response(
                {'error': f'An office for {office.department.name} in {city} already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

    try:
        office.name = name
        office.city = city
        office.state = state
        office.address = address
        office.pincode = pincode
        office.phone = phone
        office.email = email
        office.office_hours = office_hours
        if isinstance(is_active, bool):
            office.is_active = is_active
        elif isinstance(is_active, str):
            office.is_active = is_active.lower() == 'true'
        office.save()
        serializer = OfficeSerializer(office)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': f'Failed to update office: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics based on user role"""
    user = request.user
    stats = {}
    
    if user.user_type == 'CITIZEN':
        # Show all system complaints for citizens (not just their own)
        all_complaints = Complaint.objects.filter(is_deleted=False)
        user_complaints = Complaint.objects.filter(user=user, is_deleted=False)
        
        stats = {
            'total_complaints': all_complaints.count(),
            'pending': all_complaints.filter(status__in=['SUBMITTED', 'PENDING', 'FILTERING', 'SORTING']).count(),
            'in_progress': all_complaints.filter(status__in=['ASSIGNED', 'IN_PROGRESS']).count(),
            'completed': all_complaints.filter(status__in=['COMPLETED', 'RESOLVED']).count(),
            'declined': all_complaints.filter(status__in=['DECLINED', 'REJECTED']).count(),
            # Also include personal stats
            'my_complaints': user_complaints.count(),
            'my_pending': user_complaints.filter(status__in=['SUBMITTED', 'PENDING', 'FILTERING', 'SORTING']).count(),
            'my_in_progress': user_complaints.filter(status__in=['ASSIGNED', 'IN_PROGRESS']).count(),
            'my_completed': user_complaints.filter(status__in=['COMPLETED', 'RESOLVED']).count(),
            'my_declined': user_complaints.filter(status__in=['DECLINED', 'REJECTED']).count(),
        }
    
    elif user.user_type == 'DEPT_ADMIN' and hasattr(user, 'departmentadminprofile'):
        profile = user.departmentadminprofile
        dept_complaints = Complaint.objects.filter(
            department=profile.department,
            city__icontains=profile.city,
            is_deleted=False
        )
        stats = {
            'total_complaints': dept_complaints.count(),
            'new_complaints': dept_complaints.filter(status='PENDING').count(),
            'assigned': dept_complaints.filter(status='ASSIGNED').count(),
            'in_progress': dept_complaints.filter(status='IN_PROGRESS').count(),
            'completed': dept_complaints.filter(status='COMPLETED').count(),
            'rejected': dept_complaints.filter(status='REJECTED').count(),
        }
    
    elif user.user_type in ['ADMIN', 'SUB_ADMIN']:
        all_complaints = Complaint.objects.filter(is_deleted=False)
        stats = {
            'total_complaints': all_complaints.count(),
            'pending': all_complaints.filter(status='PENDING').count(),
            'assigned': all_complaints.filter(status='ASSIGNED').count(),
            'in_progress': all_complaints.filter(status='IN_PROGRESS').count(),
            'completed': all_complaints.filter(status='COMPLETED').count(),
            'rejected': all_complaints.filter(status='REJECTED').count(),
            'declined': all_complaints.filter(status='DECLINED').count(),
        }
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def complaint_logs(request, pk):
    """Get complaint history logs"""
    complaint = get_object_or_404(Complaint, pk=pk)
    logs = ComplaintLog.objects.filter(complaint=complaint).order_by('-timestamp')
    serializer = ComplaintLogSerializer(logs, many=True)
    return Response(serializer.data)


# -------------------------
# SLA Management Views
# -------------------------

@api_view(['GET'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAdmin])
def sla_configs(request):
    """List all SLA configurations per category"""
    configs = SLAConfig.objects.select_related(
        'category', 'category__department'
    ).all().order_by('category__department__name', 'category__name')
    data = [
        {
            'id': cfg.id,
            'category_id': cfg.category.id,
            'category_name': cfg.category.name,
            'department_name': cfg.category.department.name,
            'escalation_hours': cfg.escalation_hours,
            'resolution_hours': cfg.resolution_hours,
        }
        for cfg in configs
    ]
    return Response(data)


@api_view(['PUT', 'PATCH'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAdmin])
def update_sla_config(request, pk):
    """Update a single SLA configuration"""
    try:
        cfg = SLAConfig.objects.select_related('category', 'category__department').get(pk=pk)
    except SLAConfig.DoesNotExist:
        return Response({'error': 'SLA config not found'}, status=status.HTTP_404_NOT_FOUND)

    if 'escalation_hours' in request.data:
        val = int(request.data['escalation_hours'])
        if val < 1:
            return Response({'error': 'escalation_hours must be >= 1'}, status=400)
        cfg.escalation_hours = val
    if 'resolution_hours' in request.data:
        val = int(request.data['resolution_hours'])
        if val < 1:
            return Response({'error': 'resolution_hours must be >= 1'}, status=400)
        cfg.resolution_hours = val
    cfg.save()
    return Response({
        'id': cfg.id,
        'category_id': cfg.category.id,
        'category_name': cfg.category.name,
        'department_name': cfg.category.department.name,
        'escalation_hours': cfg.escalation_hours,
        'resolution_hours': cfg.resolution_hours,
    })


@api_view(['GET'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAdmin])
def sla_report(request):
    """SLA compliance report with summary stats and per-department breakdown"""
    now = timezone.now()

    active_complaints = Complaint.objects.filter(
        status__in=['SUBMITTED', 'PENDING', 'FILTERING', 'SORTING', 'ASSIGNED', 'IN_PROGRESS'],
        is_deleted=False
    ).select_related('category__sla_config', 'department')

    overdue_count = 0
    warning_count = 0
    on_time_count = 0
    dept_stats = {}

    for c in active_complaints:
        if not c.category or not hasattr(c.category, 'sla_config'):
            continue
        sla = c.category.sla_config
        hours_elapsed = (now - c.created_at).total_seconds() / 3600
        hours_until = sla.escalation_hours - hours_elapsed
        dept_name = c.department.name if c.department else 'Unknown'

        if dept_name not in dept_stats:
            dept_stats[dept_name] = {'overdue': 0, 'warning': 0, 'on_time': 0, 'total': 0}
        dept_stats[dept_name]['total'] += 1

        if hours_until <= 0:
            overdue_count += 1
            dept_stats[dept_name]['overdue'] += 1
        elif hours_until <= 6:
            warning_count += 1
            dept_stats[dept_name]['warning'] += 1
        else:
            on_time_count += 1
            dept_stats[dept_name]['on_time'] += 1

    # Resolved complaints — check resolution compliance
    completed = Complaint.objects.filter(
        status__in=['COMPLETED', 'RESOLVED'],
        is_deleted=False
    ).select_related('category__sla_config')

    resolved_on_time = 0
    resolved_overdue = 0
    for c in completed:
        if not c.category or not hasattr(c.category, 'sla_config'):
            continue
        sla = c.category.sla_config
        hours_to_resolve = (c.updated_at - c.created_at).total_seconds() / 3600
        if hours_to_resolve <= sla.resolution_hours:
            resolved_on_time += 1
        else:
            resolved_overdue += 1

    total_active = overdue_count + warning_count + on_time_count
    compliance_rate = round(
        ((on_time_count + warning_count) / total_active * 100) if total_active > 0 else 100.0, 1
    )
    total_resolved = resolved_on_time + resolved_overdue
    resolution_compliance = round(
        (resolved_on_time / total_resolved * 100) if total_resolved > 0 else 100.0, 1
    )

    dept_breakdown = sorted(
        [{'department': name, **stats} for name, stats in dept_stats.items()],
        key=lambda x: x['overdue'],
        reverse=True
    )

    return Response({
        'summary': {
            'total_active': total_active,
            'overdue': overdue_count,
            'warning': warning_count,
            'on_time': on_time_count,
            'compliance_rate': compliance_rate,
            'resolved_on_time': resolved_on_time,
            'resolved_overdue': resolved_overdue,
            'resolution_compliance': resolution_compliance,
        },
        'department_breakdown': dept_breakdown,
    })


@api_view(['POST'])
@authentication_classes([AdminTokenAuthentication])
@permission_classes([IsAdmin])
def trigger_escalation(request):
    """Manually trigger SLA auto-escalation check"""
    from django.core.management import call_command
    from io import StringIO

    dry_run = request.data.get('dry_run', False)
    out = StringIO()
    try:
        if dry_run:
            call_command('auto_escalate', '--dry-run', stdout=out)
        else:
            call_command('auto_escalate', stdout=out)
        return Response({'success': True, 'output': out.getvalue()})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# -------------------------
# AI Image Analysis View
# -------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_complaint_image(request):
    """
    Accepts an image upload and uses Gemini Vision to auto-generate
    complaint fields: title, department, description, and location.
    """
    import json
    import io
    from google import genai
    from PIL import Image as PIL_Image

    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'Image is required'}, status=400)

    try:
        # Build department list to pass to Gemini
        departments = Department.objects.all()
        dept_list_str = '\n'.join(f'- {d.name}' for d in departments)

        # Load image bytes into PIL
        image_bytes = image_file.read()
        pil_image = PIL_Image.open(io.BytesIO(image_bytes))

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""You are an AI assistant for a Smart City civic complaint platform called CivicSaathi.
Analyze the provided image and generate a structured civic complaint based solely on what you can see.

Available municipal departments (choose EXACTLY one):
{dept_list_str}

Instructions:
1. Identify the civic issue visible in the image.
2. Generate a SHORT, clear complaint title (max 10 words).
3. Select the MOST APPROPRIATE department from the list above using the EXACT name provided.
4. Write a DETAILED, factual description of the issue (minimum 30 words) based on what is visible.
5. Describe the TYPE OF PLACE or scene visible in the image as a short location phrase.
   Focus on what kind of PUBLIC PLACE or area it is — NOT a street address.
   Examples: "Public dustbin near a residential building entrance", "Roadside pothole on a busy street",
   "Public washroom in a park", "Overflowing drain near a market area", "Broken streetlight on a main road".
   Be concise (max 10 words). Always provide a meaningful scene-based description — never say it is unknown.

Respond ONLY with the following JSON and no other text:
{{
  "title": "<short complaint title>",
  "department": "<exact department name from list>",
  "description": "<detailed description>",
  "location": "<landmark-style location description>"
}}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[pil_image, prompt],
        )

        raw = response.text.strip()
        # Strip possible markdown code fences
        if raw.startswith('```'):
            parts = raw.split('```')
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith('json'):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)

        # Match department by exact name, then partial
        matched_dept = None
        ai_dept_name = data.get('department', '').strip()
        for dept in departments:
            if dept.name.lower() == ai_dept_name.lower():
                matched_dept = dept
                break
        if not matched_dept:
            for dept in departments:
                if dept.name.lower() in ai_dept_name.lower() or ai_dept_name.lower() in dept.name.lower():
                    matched_dept = dept
                    break

        return Response({
            'title': data.get('title', '').strip(),
            'department_name': matched_dept.name if matched_dept else ai_dept_name,
            'department_id': matched_dept.id if matched_dept else None,
            'description': data.get('description', '').strip(),
            'location': data.get('location', '').strip(),
        })

    except json.JSONDecodeError:
        return Response({'error': 'AI returned an unexpected response. Please try again.'}, status=500)
    except Exception as e:
        logger.error(f"analyze_complaint_image error: {e}")
        return Response({'error': f'Image analysis failed: {str(e)}'}, status=500)

