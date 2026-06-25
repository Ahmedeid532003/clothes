from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("erp", "0004_user_branch_access"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="users/avatars/%Y/%m/",
            ),
        ),
    ]
