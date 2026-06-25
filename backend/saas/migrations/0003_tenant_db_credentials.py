from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("saas", "0002_tenant_owner_initial_password_tenant_owner_username"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="db_user",
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                help_text="دور PostgreSQL الخاص بهذه المنشأة (منفصل عن MainClothes)",
                max_length=63,
            ),
        ),
        migrations.AddField(
            model_name="tenant",
            name="db_password_encrypted",
            field=models.TextField(
                blank=True,
                editable=False,
                help_text="كلمة مرور دور PostgreSQL (مشفّرة)",
            ),
        ),
    ]
