import hashlib, json, os, sys, urllib.request, urllib.error
sys.path.insert(0, "/opt/muse/skills/custom-connector-setup/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

ROOT = "/home/hatch/workspace/myvacaplanner"
PROJECT = "prj_jh5vczYkFZgMjYlBrqO9nM8PVAAH"
SKIP_DIRS = {".git", "node_modules", ".next", "data", "backups"}
SKIP_FILES = {"tsconfig.tsbuildinfo"}

files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if fn in SKIP_FILES: continue
        full = os.path.join(dirpath, fn)
        files.append((os.path.relpath(full, ROOT), full))
print(f"{len(files)} files to upload")

def api_req(method, url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    add_surrogate_to_request(req, "custom.vercel", allowed_hosts=("api.vercel.com",))
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, read_json_response(resp)
    except urllib.error.HTTPError as e:
        try: body = e.read().decode()[:400]
        except Exception: body = ""
        return e.code, {"_error": body}

manifest = []
for rel, full in files:
    with open(full, "rb") as f: content = f.read()
    sha = hashlib.sha1(content).hexdigest()
    s, d = api_req("POST", "https://api.vercel.com/v2/files", data=content,
                   headers={"Content-Type": "application/octet-stream", "x-vercel-digest": sha})
    if s not in (200, 201):
        print(f"UPLOAD FAIL {rel}: HTTP {s} {d}"); sys.exit(1)
    manifest.append({"file": rel, "sha": sha, "size": len(content)})
print("all files uploaded")

payload = {"name": "myvacaplanner", "project": PROJECT, "target": "production",
           "files": manifest, "projectSettings": {"framework": "nextjs"}}
s, d = api_req("POST", "https://api.vercel.com/v13/deployments",
               data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
print("deploy create:", s)
if s in (200, 201):
    print("DEPLOY_ID", d.get("id"), "STATUS", d.get("readyState") or d.get("status"))
else:
    print(json.dumps(d)[:300]); sys.exit(1)
