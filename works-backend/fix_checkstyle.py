import re
import glob

def remove_import(filepath, import_str):
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace(f"import {import_str};\n", "")
    with open(filepath, 'w') as f:
        f.write(content)

# Remove unused imports
files_to_remove_any_string = [
    "src/test/java/com/bcits/works/StandupSelfRecordAccessTest.java",
    "src/test/java/com/bcits/works/AssumptionControllerAccessTest.java",
    "src/test/java/com/bcits/works/SlaPolicyControllerAccessTest.java",
    "src/test/java/com/bcits/works/DependencyControllerAccessTest.java",
    "src/test/java/com/bcits/works/MeetingControllerAccessTest.java",
    "src/test/java/com/bcits/works/ReleaseControllerAccessTest.java",
    "src/test/java/com/bcits/works/ActionItemControllerAccessTest.java",
    "src/test/java/com/bcits/works/ServiceRequestControllerAccessTest.java",
    "src/test/java/com/bcits/works/RiskControllerAccessTest.java",
    "src/test/java/com/bcits/works/LessonLearnedControllerAccessTest.java",
    "src/test/java/com/bcits/works/StakeholderControllerAccessTest.java",
    "src/test/java/com/bcits/works/NotificationControllerAccessTest.java",
    "src/test/java/com/bcits/works/ArticleCommentControllerAccessTest.java",
    "src/test/java/com/bcits/works/DecisionControllerAccessTest.java",
    "src/test/java/com/bcits/works/CeremonyServiceAccessTest.java"
]

for file in files_to_remove_any_string:
    remove_import(file, "static org.mockito.ArgumentMatchers.anyString")
    remove_import(file, "org.mockito.ArgumentMatchers.anyString")

remove_import("src/main/java/com/bcits/works/projects/api/ProjectSequenceService.java", "com.bcits.works.projects.api.Project")
remove_import("src/main/java/com/bcits/works/projects/api/ProjectSequenceService.java", "com.bcits.works.projects.api.ProjectRepository")

# DevSyncWebhookController.java
devsync_file = "src/main/java/com/bcits/works/devsync/DevSyncWebhookController.java"
with open(devsync_file, 'r') as f:
    devsync_content = f.read()
devsync_content = devsync_content.replace("import org.springframework.web.bind.annotation.*;", "import org.springframework.web.bind.annotation.PostMapping;\nimport org.springframework.web.bind.annotation.RequestBody;\nimport org.springframework.web.bind.annotation.RequestHeader;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;")
with open(devsync_file, 'w') as f:
    f.write(devsync_content)

# InternalMessagingControllerTest.java
imc_file = "src/test/java/com/bcits/works/messaging/InternalMessagingControllerTest.java"
with open(imc_file, 'r') as f:
    lines = f.readlines()
new_lines = []
for i, line in enumerate(lines):
    if i == 193 or i == 194 or i == 235 or i == 238: # 0-indexed, so 194->193
        # split by ;
        parts = line.split(";")
        for part in parts:
            if part.strip():
                new_lines.append(part + ";\n")
    else:
        new_lines.append(line)
with open(imc_file, 'w') as f:
    f.writelines(new_lines)
