from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('website_projects', '0003_projectversion'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteproject',
            name='generated_files',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
