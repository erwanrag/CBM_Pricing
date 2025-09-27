import os
import zipfile

BASE_DIR = r"D:\Projet\CBM_Pricing_dev"
OUTPUT_ZIP = r"D:\Projet\CBM_Pricing_clean_dev.zip"

EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.pytest_cache', '.idea', '.vs', 'dist', 'build'}
EXCLUDE_EXTS = {'.pyc', '.log', '.vsidx'}

def should_exclude(path):
    parts = set(path.split(os.sep))
    if parts & EXCLUDE_DIRS:
        return True
    if any(path.endswith(ext) for ext in EXCLUDE_EXTS):
        return True
    return False

with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for foldername, subfolders, filenames in os.walk(BASE_DIR):
        subfolders[:] = [d for d in subfolders if d not in EXCLUDE_DIRS]
        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            relpath = os.path.relpath(filepath, BASE_DIR)
            if not should_exclude(relpath):
                zipf.write(filepath, arcname=relpath)

print(f"✅ Archive générée : {OUTPUT_ZIP}")
