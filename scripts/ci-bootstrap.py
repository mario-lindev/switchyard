"""Create an isolated, disposable Flagsmith project inside the CI container.

Run through `python manage.py shell`. Credentials stay in an ephemeral file;
this is never a production bootstrap or a source of committed credentials.
"""
from pathlib import Path
from organisations.models import Organisation
from projects.models import Project
from environments.models import Environment, EnvironmentAPIKey
from api_keys.models import MasterAPIKey
from features.models import Feature

org = Organisation.objects.create(name="Switchyard disposable CI")
project = Project.objects.create(name="Release safety lab", organisation=org)
environment = Environment.objects.create(name="CI rehearsal", project=project)
sdk_key = EnvironmentAPIKey.objects.create(environment=environment, name="Switchyard SDK")
_, management_token = MasterAPIKey.objects.create_key(
    name="Disposable CI token", organisation=org, is_admin=True
)
for name, value in [("checkout_v2", "25"), ("smart_cache", None), ("payment_retry", None)]:
    Feature.objects.create(name=name, project=project, initial_value=value, default_enabled=True)
Path("/tmp/switchyard-ci.env").write_text(
    f"\nFLAGSMITH_ENVIRONMENT_KEY={sdk_key.key}\n"
    f"FLAGSMITH_ENVIRONMENT_ID={environment.api_key}\n"
    f"FLAGSMITH_MANAGEMENT_TOKEN={management_token}\n"
    f"FLAGSMITH_PROJECT_ID={project.id}\n"
    "ALLOW_FLAG_MUTATIONS=true\n"
)
print("Created isolated CI project, environment, SDK key, management token, and three lab flags.")
