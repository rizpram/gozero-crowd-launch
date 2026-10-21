#!/usr/bin/env python3
"""Apply the activation-audio update without overwriting .env or session data."""
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

root = Path.cwd().resolve()
if not (root / "compose.yaml").is_file() or not (root / "server.mjs").is_file():
    raise SystemExit("Run this inside /opt/gozero-crowd-launch.")
ref = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
commit = subprocess.check_output(["git", "rev-parse", "--verify", ref + "^{commit}"], text=True).strip()
paths = ["server.mjs", "media.mjs", "public/app.js", "public/led.js", "public/sound.js",
         "test/activation-audio.test.mjs", "test/activation-media.test.mjs"]
def git_text(revision, name):
    return subprocess.check_output(["git", "show", revision + ":" + name], stderr=subprocess.DEVNULL).decode("utf-8")
def normalize(text):
    return text.replace("password.length<Number(process.env.OPERATOR_PASSWORD_MIN_LENGTH||16)", "password.length<16").replace(
        "Production operator password does not meet the configured requirements.",
        "Production requires OPERATOR_PASSWORD of at least 16 characters.")
updates = {}
for name in paths:
    wanted = git_text(commit, name)
    current = root / name
    if current.exists():
        old = current.read_text(encoding="utf-8")
        try:
            baseline = git_text("HEAD", name)
        except subprocess.CalledProcessError:
            baseline = wanted
        if normalize(old) not in [normalize(baseline), normalize(wanted)]:
            raise SystemExit("Unrecognized local changes; no files changed: " + name)
    updates[name] = wanted
backup = root.parent / ("gozero-audio-backup-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
backup.mkdir(mode=0o700)
for name, content in updates.items():
    target = root / name
    if target.exists():
        saved = backup / name
        saved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, saved)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".activation-update.tmp")
    temporary.write_text(content, encoding="utf-8", newline="\n")
    temporary.replace(target)
print("Activation audio update applied:", commit)
print("Source backup:", backup)
print("Next: rebuild only the gozero Compose service, then upload the MP3 from Operator.")
