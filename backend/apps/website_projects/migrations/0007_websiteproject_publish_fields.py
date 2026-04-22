from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('website_projects', '0006_conversation_chat_budget_nano'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteproject',
            name='slug',
            field=models.SlugField(blank=True, db_index=True, max_length=80, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='websiteproject',
            name='is_published',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='websiteproject',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='websiteproject',
            name='view_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
