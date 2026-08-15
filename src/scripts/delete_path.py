from pathlib import Path


def delete_path(path: str):
    project_root = Path("/project") / path

    for sub_path, dirs, files in project_root.walk(top_down=False):
        for dir_name in dirs:
            (sub_path / dir_name).rmdir()

        for filename in files:
            file = sub_path / filename
            file.unlink(missing_ok=True)

    if len(project_root.parents) > 1:
        if project_root.is_file():
            project_root.unlink(True)
        else:
            project_root.rmdir()


delete_path
