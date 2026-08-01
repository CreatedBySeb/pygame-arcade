from pathlib import Path
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED


def export_project():
    project_root = Path("/project")

    with BytesIO() as data:
        with ZipFile(data, mode="w", compression=ZIP_DEFLATED) as f:
            for path, dirs, files in project_root.walk():
                rel_path = path.relative_to(project_root)

                for dir_name in dirs:
                    f.mkdir(str(rel_path / dir_name))

                for file in files:
                    f.write(path / file, rel_path / file)

        return data.getvalue()


export_project()
