from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .services import ExportService
from apps.website_projects.models import WebsiteProject
from django.shortcuts import get_object_or_404

class ExportZIPView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project = get_object_or_404(WebsiteProject, id=project_id, user=request.user)
        
        zip_buffer = ExportService.generate_static_zip(project)
        
        response = HttpResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{project.title}.zip"'
        return response
