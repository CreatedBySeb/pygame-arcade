from pathlib import Path


def delete_project():
    project_root = Path("/project")

    for path, dirs, files in project_root.walk(top_down=False):
        for dir_name in dirs:
            (path / dir_name).rmdir()

        for filename in files:
            file = path / filename
            file.unlink(missing_ok=True)


delete_project()
