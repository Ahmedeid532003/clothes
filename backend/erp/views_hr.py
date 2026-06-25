from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from erp.hr_structure_models import HrSection, WorkShift
from erp.models import Department, User
from erp.permissions import HasPageAction, can_access_page
from erp.serializers_hr import (
    DepartmentSerializer,
    DepartmentWriteSerializer,
    EmployeeLimitsSerializer,
    EmployeeSerializer,
    EmployeeWriteSerializer,
    HrSectionWriteSerializer,
    PermissionsSchemaSerializer,
    WorkShiftWriteSerializer,
)
from erp.services import hr as hr_service
from erp.services import hr_employee_data as emp_data_service
from tenancy.context import get_current_tenant


def _actor(request) -> User:
    return request.user


class PermissionsSchemaView(APIView):
    permission_classes = [HasPageAction]
    required_page = "create-users"
    required_action = "view"

    def get(self, request):
        return Response(PermissionsSchemaSerializer.build())


class DepartmentListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "departments"
    required_action = "view"

    def get(self, request):
        if Department.objects.using("tenant").filter(is_active=True).count() == 0:
            hr_service.seed_hr_org_defaults(actor=_actor(request))
        qs = Department.objects.using("tenant").filter(is_active=True)
        return Response(DepartmentSerializer(qs, many=True).data)

    def post(self, request):
        ser = DepartmentWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dept = hr_service.create_department(
            actor=_actor(request),
            name=ser.validated_data["name"],
            code=ser.validated_data.get("code") or None,
            manager_name=ser.validated_data.get("manager_name", ""),
            operational_budget=ser.validated_data.get("operational_budget", 0),
            description=ser.validated_data.get("description", ""),
        )
        return Response(
            DepartmentSerializer(dept).data,
            status=status.HTTP_201_CREATED,
        )


class DepartmentDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "departments"
    required_action = "update"

    def get_object(self, pk):
        return Department.objects.using("tenant").get(pk=pk, is_active=True)

    def patch(self, request, pk):
        try:
            dept = self.get_object(pk)
        except Department.DoesNotExist:
            return Response({"detail": "القسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = DepartmentWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        dept = hr_service.update_department(
            actor=_actor(request),
            instance=dept,
            name=ser.validated_data["name"],
            manager_name=ser.validated_data.get("manager_name"),
            operational_budget=ser.validated_data.get("operational_budget"),
            description=ser.validated_data.get("description"),
        )
        return Response(DepartmentSerializer(dept).data)

    def delete(self, request, pk):
        try:
            dept = self.get_object(pk)
        except Department.DoesNotExist:
            return Response({"detail": "القسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if User.objects.using("tenant").filter(department=dept, is_active=True).exists():
            return Response(
                {"detail": "لا يمكن حذف قسم مرتبط بموظفين نشطين."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dept.is_active = False
        dept.updated_by = _actor(request)
        dept.save(using="tenant", update_fields=["is_active", "updated_by", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class HrSectionListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "hr-sections"
    required_action = "view"

    def get(self, request):
        dept_id = request.query_params.get("department")
        if HrSection.objects.using("tenant").filter(is_active=True).count() == 0:
            hr_service.seed_hr_org_defaults(actor=_actor(request))
        qs = HrSection.objects.using("tenant").filter(is_active=True).select_related("department")
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        return Response([hr_service.serialize_hr_section(s) for s in qs])

    def post(self, request):
        ser = HrSectionWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sec = hr_service.create_hr_section(actor=_actor(request), **ser.validated_data)
        return Response(hr_service.serialize_hr_section(sec), status=status.HTTP_201_CREATED)


class HrSectionDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "hr-sections"
    required_action = "update"

    def patch(self, request, pk):
        try:
            sec = HrSection.objects.using("tenant").select_related("department").get(
                pk=pk, is_active=True
            )
        except HrSection.DoesNotExist:
            return Response({"detail": "القسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = HrSectionWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        if "name" in ser.validated_data:
            sec = hr_service.update_hr_section(
                actor=_actor(request), instance=sec, name=ser.validated_data["name"]
            )
        return Response(hr_service.serialize_hr_section(sec))

    def delete(self, request, pk):
        try:
            sec = HrSection.objects.using("tenant").get(pk=pk, is_active=True)
        except HrSection.DoesNotExist:
            return Response({"detail": "القسم غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if User.objects.using("tenant").filter(hr_section=sec, is_active=True).exists():
            return Response(
                {"detail": "لا يمكن حذف قسم مرتبط بموظفين نشطين."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sec.is_active = False
        sec.updated_by = _actor(request)
        sec.save(using="tenant", update_fields=["is_active", "updated_by", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkShiftListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "work-shifts"
    required_action = "view"

    def get(self, request):
        if WorkShift.objects.using("tenant").filter(is_active=True).count() == 0:
            hr_service.seed_hr_org_defaults(actor=_actor(request))
        qs = WorkShift.objects.using("tenant").filter(is_active=True)
        return Response([hr_service.serialize_work_shift(s) for s in qs])

    def post(self, request):
        ser = WorkShiftWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        shift = hr_service.create_work_shift(
            actor=_actor(request),
            name=data["name"],
            name_en=data.get("name_en") or "",
            code=data.get("code") or None,
            description=data.get("description") or "",
            period_count=data.get("period_count") or 1,
            weekly_schedule=data.get("weekly_schedule"),
        )
        return Response(hr_service.serialize_work_shift(shift), status=status.HTTP_201_CREATED)


class WorkShiftDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "work-shifts"
    required_action = "update"

    def get(self, request, pk):
        try:
            shift = WorkShift.objects.using("tenant").get(pk=pk, is_active=True)
        except WorkShift.DoesNotExist:
            return Response({"detail": "الشيفت غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(hr_service.serialize_work_shift(shift))

    def patch(self, request, pk):
        try:
            shift = WorkShift.objects.using("tenant").get(pk=pk, is_active=True)
        except WorkShift.DoesNotExist:
            return Response({"detail": "الشيفت غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = WorkShiftWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        shift = hr_service.update_work_shift(
            actor=_actor(request), instance=shift, **ser.validated_data
        )
        return Response(hr_service.serialize_work_shift(shift))

    def delete(self, request, pk):
        try:
            shift = WorkShift.objects.using("tenant").get(pk=pk, is_active=True)
        except WorkShift.DoesNotExist:
            return Response({"detail": "الشيفت غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if User.objects.using("tenant").filter(work_shift=shift, is_active=True).exists():
            return Response(
                {"detail": "لا يمكن حذف شيفت مرتبط بموظفين نشطين."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        shift.is_active = False
        shift.updated_by = _actor(request)
        shift.save(using="tenant", update_fields=["is_active", "updated_by", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "create-users"
    required_action = "view"

    def get(self, request):
        user = _actor(request)
        if not user.is_owner and not can_access_page(user, "create-users"):
            raise PermissionDenied("ليس لديك صلاحية عرض الموظفين.")
        qs = (
            User.objects.using("tenant")
            .select_related(
                "department",
                "hr_section",
                "work_shift",
                "created_by",
                "updated_by",
                "default_branch",
            )
            .prefetch_related("allowed_branches")
            .order_by("-created_at")
        )
        return Response(EmployeeSerializer(qs, many=True).data)

    def post(self, request):
        if not _actor(request).is_owner and not can_access_page(_actor(request), "create-users"):
            raise PermissionDenied("ليس لديك صلاحية إضافة موظف.")
        ser = EmployeeWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if data.get("uses_system", True) and not data.get("password"):
            return Response(
                {"detail": "كلمة المرور مطلوبة عند إنشاء موظف."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = hr_service.create_employee(actor=_actor(request), data=data)
        return Response(
            EmployeeSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class EmployeeDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "create-users"
    required_action = "update"

    def get_object(self, pk):
        return (
            User.objects.using("tenant")
            .select_related(
                "department",
                "hr_section",
                "work_shift",
                "created_by",
                "updated_by",
                "default_branch",
            )
            .prefetch_related("allowed_branches")
            .get(pk=pk)
        )

    def patch(self, request, pk):
        try:
            user = self.get_object(pk)
        except User.DoesNotExist:
            return Response({"detail": "الموظف غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        ser = EmployeeWriteSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        user = hr_service.update_employee(
            actor=_actor(request),
            instance=user,
            data=ser.validated_data,
        )
        return Response(EmployeeSerializer(user).data)

    def delete(self, request, pk):
        try:
            user = self.get_object(pk)
        except User.DoesNotExist:
            return Response({"detail": "الموظف غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        if user.is_owner:
            return Response(
                {"detail": "لا يمكن تعطيل حساب المالك."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.updated_by = _actor(request)
        user.save(using="tenant", update_fields=["is_active", "updated_by", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeLimitsView(APIView):
    permission_classes = [HasPageAction]
    required_page = "create-users"
    required_action = "view"

    def get(self, request):
        tenant = get_current_tenant()
        current = User.objects.using("tenant").filter(is_active=True).count()
        max_users = tenant.plan.max_users if tenant else 0
        data = {
            "current_users": current,
            "max_users": max_users,
            "can_add": current < max_users,
            "plan_name": tenant.plan.name if tenant else "",
        }
        return Response(EmployeeLimitsSerializer(data).data)


class JobTitleListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "job-titles"
    required_action = "view"

    def get(self, request):
        emp_data_service.ensure_hr_catalogs_seeded()
        return Response(emp_data_service.list_job_titles())

    def post(self, request):
        self.required_action = "update"
        row = emp_data_service.create_job_title(
            name=request.data.get("name", ""),
            code=request.data.get("code") or None,
            job_level=request.data.get("job_level") or "B",
        )
        return Response(row, status=status.HTTP_201_CREATED)


class JobTitleDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "job-titles"
    required_action = "update"

    def patch(self, request, pk):
        from erp.hr_structure_models import JobTitle

        if not JobTitle.objects.using("tenant").filter(pk=pk, is_active=True).exists():
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            emp_data_service.update_job_title(
                pk,
                name=request.data.get("name", ""),
                job_level=request.data.get("job_level"),
            )
        )

    def delete(self, request, pk):
        from erp.hr_structure_models import JobTitle

        self.required_action = "delete"
        t = JobTitle.objects.using("tenant").get(pk=pk)
        if User.objects.using("tenant").filter(
            employee_profile__job_title=t, is_active=True
        ).exists():
            return Response(
                {"detail": "لا يمكن حذف مسمى مرتبط بموظفين."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        t.is_active = False
        t.save(using="tenant", update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeGroupListCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-groups"
    required_action = "view"

    def get(self, request):
        emp_data_service.ensure_hr_catalogs_seeded()
        return Response(emp_data_service.list_employee_groups())

    def post(self, request):
        self.required_action = "update"
        row = emp_data_service.create_employee_group(
            name=request.data.get("name", ""),
            code=request.data.get("code") or None,
            description=request.data.get("description") or "",
            color=request.data.get("color") or "blue",
        )
        return Response(row, status=status.HTTP_201_CREATED)


class EmployeeGroupDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-groups"
    required_action = "update"

    def patch(self, request, pk):
        from erp.hr_structure_models import EmployeeGroup

        if not EmployeeGroup.objects.using("tenant").filter(pk=pk, is_active=True).exists():
            return Response({"detail": "غير موجود."}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            emp_data_service.update_employee_group(
                pk,
                name=request.data.get("name", ""),
                description=request.data.get("description") or "",
                color=request.data.get("color"),
            )
        )

    def delete(self, request, pk):
        from erp.hr_structure_models import EmployeeGroup

        self.required_action = "delete"
        g = EmployeeGroup.objects.using("tenant").get(pk=pk)
        if User.objects.using("tenant").filter(
            employee_profile__employee_group=g, is_active=True
        ).exists():
            return Response(
                {"detail": "لا يمكن حذف مجموعة مرتبطة بموظفين."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        g.is_active = False
        g.save(using="tenant", update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeDataListView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "view"

    def get(self, request):
        emp_data_service.ensure_hr_catalogs_seeded()
        return Response(emp_data_service.list_employee_data())


class EmployeeDataDetailView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "view"

    def get(self, request, pk):
        try:
            return Response(emp_data_service.get_employee_data(pk))
        except User.DoesNotExist:
            return Response({"detail": "الموظف غير موجود."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        self.required_action = "update"
        try:
            return Response(emp_data_service.upsert_employee_data(pk, request.data))
        except User.DoesNotExist:
            return Response({"detail": "الموظف غير موجود."}, status=status.HTTP_404_NOT_FOUND)


class EmployeeAllowanceCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "update"

    def post(self, request, pk):
        row = emp_data_service.add_allowance(
            pk,
            name=request.data.get("name", ""),
            amount=request.data.get("amount", 0),
        )
        return Response(row, status=status.HTTP_201_CREATED)


class EmployeeAllowanceDeleteView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "delete"

    def delete(self, request, pk, allowance_id):
        emp_data_service.delete_allowance(allowance_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EmployeeSalaryIncreaseCreateView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "update"

    def post(self, request, pk):
        row = emp_data_service.add_salary_increase(
            pk,
            amount=request.data.get("amount", 0),
            effective_date=request.data.get("effective_date", ""),
            notes=request.data.get("notes") or "",
        )
        return Response(row, status=status.HTTP_201_CREATED)


class EmployeeSalaryIncreaseDeleteView(APIView):
    permission_classes = [HasPageAction]
    required_page = "employee-data"
    required_action = "delete"

    def delete(self, request, pk, increase_id):
        emp_data_service.delete_salary_increase(increase_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
