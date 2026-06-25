from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("saas", "0003_tenant_db_credentials"),
    ]

    operations = [
        migrations.AddField(
            model_name="tenant",
            name="db_initial_password",
            field=models.CharField(
                blank=True,
                help_text="كلمة مرور قاعدة البيانات — تُحفظ عند الإنشاء للمرجع في الأدمن",
                max_length=128,
            ),
        ),
    ]
