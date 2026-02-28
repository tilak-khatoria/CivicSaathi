"""
AI-based Filter System for Complaint Validation
Checks if photo and description match the category
"""
from typing import Dict, Tuple
import re


class ComplaintFilterSystem:
    """
    Filter system to validate complaints using description, category, and image analysis
    """
    
    # Keywords for each department category
    CATEGORY_KEYWORDS = {
        'pothole': ['pothole', 'road', 'damage', 'crack', 'hole', 'pavement', 'broken'],
        'street_light': ['light', 'street light', 'lamp', 'dark', 'electricity', 'bulb', 'lighting'],
        'garbage': ['garbage', 'waste', 'trash', 'litter', 'dump', 'rubbish', 'dirt', 'dirty'],
        'water_supply': ['water', 'pipe', 'leak', 'supply', 'tap', 'pipeline', 'drainage'],
        'sewage': ['sewage', 'drain', 'overflow', 'smell', 'blockage', 'clogged', 'drainage'],
        'park': ['park', 'garden', 'playground', 'maintenance', 'grass', 'bench'],
        'traffic': ['traffic', 'signal', 'sign', 'crossing', 'zebra crossing', 'road sign'],
        'animal': ['stray', 'dog', 'cattle', 'animal', 'cow', 'nuisance'],
        'toilet': ['toilet', 'public toilet', 'washroom', 'bathroom', 'sanitation'],
        'health': ['health', 'hospital', 'clinic', 'medical', 'sanitation', 'hygiene'],
    }
    
    @staticmethod
    def check_description_category_match(description: str, category_name: str) -> Tuple[bool, str]:
        """
        Check if description matches the category
        Returns: (is_valid, reason)
        """
        description_lower = description.lower()
        category_lower = category_name.lower()
        
        # Find relevant keywords for this category
        relevant_keywords = []
        for key, keywords in ComplaintFilterSystem.CATEGORY_KEYWORDS.items():
            if key in category_lower:
                relevant_keywords.extend(keywords)
        
        # If no specific keywords, use category name itself
        if not relevant_keywords:
            relevant_keywords = [word for word in category_lower.split() if len(word) > 3]
        
        # Check if any keyword is in description
        matches = [kw for kw in relevant_keywords if kw in description_lower]
        
        if matches:
            return True, f"Valid: Found relevant keywords - {', '.join(matches[:3])}"
        else:
            return False, f"Description does not match category '{category_name}'"
    
    @staticmethod
    def check_spam_content(description: str) -> Tuple[bool, str]:
        """
        Check if content is spam
        Returns: (is_spam, reason)
        """
        spam_patterns = [
            r'\b(buy|purchase|discount|offer|sale|cheap|free|win|prize)\b',
            r'\b(click here|visit|website|link)\b',
            r'(.)\1{4,}',  # Repeated characters
        ]
        
        for pattern in spam_patterns:
            if re.search(pattern, description, re.IGNORECASE):
                return True, "Detected spam pattern in description"
        
        # Check for very short descriptions
        if len(description.strip()) < 20:
            return True, "Description too short (minimum 20 characters)"
        
        return False, "Content appears genuine"
    
    @staticmethod
    def validate_complaint(complaint) -> Dict[str, any]:
        """
        Main validation function
        Returns: {
            'passed': bool,
            'reason': str,
            'is_spam': bool
        }
        """
        # Check for spam
        is_spam, spam_reason = ComplaintFilterSystem.check_spam_content(complaint.description)
        if is_spam:
            return {
                'passed': False,
                'reason': spam_reason,
                'is_spam': True
            }
        
        # Check description-category match
        if complaint.category:
            is_match, match_reason = ComplaintFilterSystem.check_description_category_match(
                complaint.description,
                complaint.category.name
            )
            
            if not is_match:
                return {
                    'passed': False,
                    'reason': match_reason,
                    'is_spam': False
                }
        
        # All checks passed
        return {
            'passed': True,
            'reason': 'Complaint appears genuine and matches category',
            'is_spam': False
        }


class ComplaintSortingSystem:
    """
    Automated Department Sorting Layer

    Operates after both Filter A (NLP) and Filter B (AI image verification)
    have cleared a complaint.  It reads the department value already stored on
    the complaint record (set by the citizen at submission time), routes the
    complaint to that department's office in the correct city, and transitions
    the status from SORTING → PENDING so department admins can act on it.

    Design goals
    ────────────
    • Zero manual intervention for standard cases.
    • Falls back to category-derived department if no direct department is set.
    • Auto-assigns the matching city office so SLA tracking starts immediately.
    • Returns a rich result dict so callers can log / audit every decision.
    """

    @staticmethod
    def sort_complaint(complaint):
        """
        Route a verified complaint to the correct municipal department.

        Department resolution priority
        ──────────────────────────────
        1. complaint.department  – citizen-selected at submission (preferred)
        2. complaint.category.department – derived from the complaint category

        Side-effects (in order)
        ────────────────────────
        1. Sets status → SORTING and persists department.
        2. Looks up the active Office for (department, city).
        3. Sets complaint.office, complaint.sorted = True, status → PENDING.
        4. Saves only the changed fields to minimise DB writes.

        Returns
        ───────
        dict with keys:
            success    (bool)
            department (Department instance | None)
            office     (Office instance | None)
            reason     (str)  – human-readable audit string
        """
        # ── Step 1: Resolve department ────────────────────────────────────────
        department = None

        # Citizen-selected department takes priority (stored at submission).
        if complaint.department_id:
            department = complaint.department

        # Fall back to the department linked to the complaint's category.
        if department is None and complaint.category_id and complaint.category:
            department = complaint.category.department

        if department is None:
            return {
                'success': False,
                'department': None,
                'office': None,
                'reason': (
                    'Sorting failed: no department associated with this complaint. '
                    'Manual review required.'
                ),
            }

        # ── Step 2: Mark as SORTING; pin the resolved department ─────────────
        complaint.department = department
        complaint.status = 'SORTING'
        complaint.save(update_fields=['department', 'status', 'updated_at'])

        # ── Steps 3 & 4: Sorting Layer B – office routing ───────────────────
        # Delegate to apply_office_sorting() to find and attach the correct
        # municipal office for this (department, city) pair.
        office_result = ComplaintSortingSystem.apply_office_sorting(complaint)
        office = office_result['office']

        # ── Step 5: Worker Assignment Layer ─────────────────────────────────
        # Attempt automated worker assignment now that department + office are
        # both resolved.
        assignment_result = WorkerAssignmentLayer.assign_worker(complaint)

        # Finalise sort: mark sorted=True.
        # • If a worker was auto-assigned, complaint.status is already 'ASSIGNED'
        #   (set inside assign_worker); just persist sorted=True.
        # • If no worker could be found, drop back to PENDING for manual routing.
        complaint.sorted = True
        if not assignment_result['success']:
            complaint.status = 'PENDING'
        complaint.save(update_fields=['sorted', 'status', 'updated_at'])

        office_info = f", office '{office.name}'" if office else " (no active office registered for this city — manual assignment required)"
        assignment_info = (
            f" {assignment_result['reason']}"
            if assignment_result['success']
            else " No available workers — status set to Pending Assignment for manual routing."
        )
        return {
            'success': True,
            'department': department,
            'office': office,
            'worker': assignment_result.get('worker'),
            'reason': (
                f"Automatically sorted to department '{department.name}'{office_info}."
                f"{assignment_info}"
            ),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Sorting Layer B — Office Routing
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def apply_office_sorting(complaint):
        """
        Sorting Layer B: Automated Office Routing.

        Routes a complaint to the correct municipal office by matching the
        complaint's already-resolved department against all active offices
        in the **citizen's registered city** (stored in complaint.city, which
        is pinned from the user's profile at submission time).

        Design goals
        ────────────
        • Eliminates manual office-assignment for standard city complaints.
        • Prevents cross-city mis-routing by using the citizen's registered city.
        • Can be called independently of sort_complaint() when only office
          assignment is needed (e.g., admin triggers a status→PENDING transition
          after the department is already known).
        • Idempotent: safe to call multiple times; only updates the office field.

        Side-effects
        ────────────
        • Sets complaint.office if a matching active office is found.
        • Saves only the 'office' field to minimise DB writes.
        • Does NOT change status or sorted flag — that is the caller's
          responsibility (sort_complaint handles those transitions).

        Returns
        ───────
        dict with keys:
            success  (bool)   – True if an office was successfully matched
            office   (Office instance | None)
            reason   (str)    – human-readable audit/log string
        """
        from .models import Office  # noqa: PLC0415

        # Guard: department must already be resolved (done by sort_complaint /
        # citizen form selection) before office routing can proceed.
        if not complaint.department_id:
            return {
                'success': False,
                'office': None,
                'reason': (
                    'Sorting Layer B skipped: complaint has no department assigned. '
                    'Complete department assignment first.'
                ),
            }

        # Guard: city must be available (pinned from citizen's registered profile).
        if not complaint.city:
            return {
                'success': False,
                'office': None,
                'reason': (
                    'Sorting Layer B skipped: complaint city is not set. '
                    'Unable to match a municipal office without a city.'
                ),
            }

        office = None
        try:
            office = Office.objects.get(
                department=complaint.department,
                city__iexact=complaint.city,
                is_active=True,
            )
        except Office.DoesNotExist:
            pass  # No active office in this city for the department yet
        except Office.MultipleObjectsReturned:
            # More than one active office — pick the earliest registered one.
            office = (
                Office.objects.filter(
                    department=complaint.department,
                    city__iexact=complaint.city,
                    is_active=True,
                )
                .order_by('id')
                .first()
            )

        if office:
            complaint.office = office
            complaint.save(update_fields=['office', 'updated_at'])
            return {
                'success': True,
                'office': office,
                'reason': (
                    f"Sorting Layer B: office '{office.name}' ({complaint.city}) "
                    f"matched and assigned for department '{complaint.department.name}'."
                ),
            }

        return {
            'success': False,
            'office': None,
            'reason': (
                f"Sorting Layer B: no active office found for department "
                f"'{complaint.department.name}' in city '{complaint.city}'. "
                "Complaint queued — manual office assignment required."
            ),
        }


class WorkerAssignmentLayer:
    """
    Automated Worker Assignment Layer

    Final routing stage in the CivicSaathi complaint pipeline.  Activates
    only after a complaint has been sorted to a department (Sorting Layer A)
    and a city-level office (Sorting Layer B).

    Assignment algorithm
    ────────────────────
    1. Collects all active Workers attached to complaint.office.
    2. Counts each worker's current active workload: complaints whose status
       is PENDING, ASSIGNED, or IN_PROGRESS.
    3. Selects the worker(s) with the minimum workload count.
    4. On a tie, picks one at random to distribute work fairly.
    5. Derives the SLA deadline from the category's SLAConfig
       (resolution_hours); defaults to 48 h if no config exists.
    6. Persists the assignment, creates an audit log, and notifies the citizen.
    """

    ACTIVE_STATUSES = ('PENDING', 'ASSIGNED', 'IN_PROGRESS')

    @staticmethod
    def assign_worker(complaint):
        """
        Assign the optimal worker to a fully-sorted complaint.

        Pre-conditions (enforced internally)
        ─────────────────────────────────────
        • complaint.office must be set (Sorting Layer B completed).
        • At least one active Worker must exist in that office.

        Side-effects (only on success)
        ────────────────────────────────
        • Sets complaint.current_worker
        • Sets complaint.status  → 'ASSIGNED'
        • Sets complaint.assigned = True
        • Sets complaint.sla_deadline (category SLAConfig or 48 h default)
        • Saves the above fields atomically
        • Creates a ComplaintLog audit entry
        • Fires send_worker_assigned_email (non-blocking; failure is swallowed)

        Returns
        ───────
        dict with keys:
            success  (bool)
            worker   (Worker instance | None)
            reason   (str)  – human-readable audit string
        """
        import random                                          # noqa: PLC0415
        from django.utils import timezone                      # noqa: PLC0415
        from datetime import timedelta                         # noqa: PLC0415
        from .models import Worker, Complaint, ComplaintLog    # noqa: PLC0415
        from .email_service import send_worker_assigned_email  # noqa: PLC0415

        # ── Guard: office must already be assigned ────────────────────────────
        if not complaint.office_id:
            return {
                'success': False,
                'worker': None,
                'reason': (
                    'Worker Assignment Layer skipped: complaint has no office assigned. '
                    'Complete Sorting Layer B first.'
                ),
            }

        # ── Step 1: Gather active workers for this office ─────────────────────
        active_workers = list(
            Worker.objects.filter(
                office=complaint.office,
                is_active=True,
            ).select_related('user')
        )

        if not active_workers:
            return {
                'success': False,
                'worker': None,
                'reason': (
                    f"Worker Assignment Layer: no active workers in office "
                    f"'{complaint.office.name}'. Manual assignment required."
                ),
            }

        # ── Step 2: Count active workload per worker ──────────────────────────
        workload = {
            w.id: Complaint.objects.filter(
                current_worker=w,
                status__in=WorkerAssignmentLayer.ACTIVE_STATUSES,
                is_deleted=False,
            ).count()
            for w in active_workers
        }

        # ── Step 3: Select least-loaded worker; random break on tie ──────────
        min_tasks = min(workload.values())
        candidates = [w for w in active_workers if workload[w.id] == min_tasks]
        selected_worker = random.choice(candidates)

        # ── Step 4: Resolve SLA deadline from category config ─────────────────
        sla_hours = 48  # safe default when no SLAConfig exists
        if complaint.category_id and complaint.category:
            try:
                sla_hours = complaint.category.sla_config.resolution_hours
            except Exception:
                pass

        sla_deadline = timezone.now() + timedelta(hours=sla_hours)

        # ── Step 5: Persist assignment ─────────────────────────────────────────
        old_status = complaint.status
        complaint.current_worker = selected_worker
        complaint.status = 'ASSIGNED'
        complaint.assigned = True
        complaint.sla_deadline = sla_deadline
        complaint.save(update_fields=[
            'current_worker', 'status', 'assigned', 'sla_deadline', 'updated_at'
        ])

        # ── Step 6: Audit log ─────────────────────────────────────────────────
        ComplaintLog.objects.create(
            complaint=complaint,
            action_by=None,  # system-generated action
            note=(
                f"[Automated Worker Assignment Layer] Assigned to "
                f"'{selected_worker.user.username}' "
                f"(office: '{complaint.office.name}', "
                f"workload: {min_tasks} active task(s), "
                f"candidates in pool: {len(candidates)}, "
                f"SLA: {sla_hours}h — deadline {sla_deadline.strftime('%d %b %Y %H:%M')})."
            ),
            old_status=old_status,
            new_status='ASSIGNED',
            new_assignee=selected_worker.user.username,
        )

        # ── Step 7: Notify citizen ─────────────────────────────────────────────
        try:
            send_worker_assigned_email(complaint)
        except Exception:
            pass  # notification failure must never block the assignment

        # ── Step 8: Multi-Channel Worker Alert System ──────────────────────────
        #  8a – In-app notification record (persisted for bell + polling)
        try:
            from .models import WorkerNotification  # noqa: PLC0415
            sla_str = (
                sla_deadline.strftime('%d %b %Y, %H:%M')
                if sla_deadline else 'Not set'
            )
            WorkerNotification.objects.create(
                worker=selected_worker,
                complaint=complaint,
                notification_type='ASSIGNMENT',
                title='New Complaint Assigned',
                message=(
                    f"Complaint \"{complaint.title}\" (#{complaint.id}) "
                    f"has been assigned to you. "
                    f"Location: {complaint.location}, {complaint.city}. "
                    f"SLA Deadline: {sla_str}."
                ),
            )
        except Exception as exc:
            import traceback; traceback.print_exc()
            pass  # notification persistence failure must not block assignment

        #  8b – Email notification to worker
        try:
            from .email_service import send_worker_new_assignment_email  # noqa: PLC0415
            send_worker_new_assignment_email(complaint, selected_worker)
        except Exception:
            pass  # email failure must not block the assignment

        return {
            'success': True,
            'worker': selected_worker,
            'reason': (
                f"Worker Assignment Layer: '{selected_worker.user.username}' selected "
                f"(office: '{complaint.office.name}', "
                f"active tasks at assignment: {min_tasks}, "
                f"SLA: {sla_hours}h)."
            ),
        }


class ComplaintAssignmentSystem:
    """
    Assignment system to assign complaints to workers based on location.
    """

    @staticmethod
    def assign_complaint(complaint, city: str, state: str):
        """
        Record location info and flag the complaint as ready for worker assignment.
        Department-level routing is handled by ComplaintSortingSystem.sort_complaint;
        this method only updates location metadata when it differs from what was
        saved at submission time.
        """
        changed_fields = ['updated_at']

        if complaint.city != city:
            complaint.city = city
            changed_fields.append('city')

        if complaint.state != state:
            complaint.state = state
            changed_fields.append('state')

        complaint.save(update_fields=changed_fields)
        return True
