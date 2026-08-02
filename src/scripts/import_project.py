from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def import_project(zip_data):
    project_root = Path("/project")
    project_root.mkdir(exist_ok=True)

    with (
        BytesIO(zip_data) as data,
        ZipFile(data, mode="r", compression=ZIP_DEFLATED) as f,
    ):
        f.extractall(path=project_root)


import_project
