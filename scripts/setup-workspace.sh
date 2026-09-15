#!/usr/bin/env bash
#
# Prepares ./workspace/ for `docker compose up`.
#
# Clones Ecommerce-BE and Ecommerce-UI, copies the showroom module into each,
# applies the two integration patches, and drops the Docker build files in.
#
# Idempotent: safe to re-run. Existing clones are reused (left at whatever
# revision they are on); already-applied patches are detected and skipped.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$ROOT/workspace"
BE="$WORKSPACE/Ecommerce-BE"
UI="$WORKSPACE/Ecommerce-UI"

BE_REPO="${BE_REPO:-https://github.com/truongviethoa99xx/Ecommerce-BE}"
UI_REPO="${UI_REPO:-https://github.com/truongviethoa99xx/Ecommerce-UI}"

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
ok()   { printf '\033[1;32m  ok\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m  !!\033[0m %s\n' "$1"; }
die()  { printf '\033[1;31mERROR\033[0m %s\n' "$1" >&2; exit 1; }

clone_if_missing() {
  local url="$1" dest="$2" name="$3"
  if [ -d "$dest/.git" ]; then
    ok "$name already cloned"
  else
    [ -e "$dest" ] && die "$dest exists but is not a git clone. Remove it and re-run."
    info "Cloning $name"
    git clone --depth 1 "$url" "$dest"
  fi
}

# patch_file <before|after> <file> <anchor> <payload> <guard>
#
# Inserts payload before or after the first line containing anchor, unless guard
# already appears in the file.
#
# The anchor MUST be a single line: matching is line-by-line, so a multi-line
# anchor matches nothing. A missed anchor is a hard error - reporting success on
# one is how a patch goes silently absent and only shows up as a runtime fault.
patch_file() {
  local mode="$1" file="$2" anchor="$3" payload="$4" guard="$5"
  [ -f "$file" ] || die "no such file: $file"
  if grep -qF -- "$guard" "$file"; then
    ok "$(basename "$file") already has: $guard"
    return
  fi
  python3 - "$mode" "$file" "$anchor" "$payload" <<'PYEOF'
import sys
mode, path, anchor, payload = sys.argv[1:5]
if "\n" in anchor:
    sys.exit("anchor must be a single line, got: %r" % anchor)
lines = open(path, encoding="utf-8").read().split("\n")
for i, line in enumerate(lines):
    if anchor in line:
        at = i if mode == "before" else i + 1
        lines[at:at] = payload.split("\n")
        open(path, "w", encoding="utf-8").write("\n".join(lines))
        break
else:
    sys.exit("anchor not found in %s: %r" % (path, anchor))
PYEOF
  ok "patched $(basename "$file") -> $guard"
}

command -v git >/dev/null || die "git is required"
command -v python3 >/dev/null || die "python3 is required"

mkdir -p "$WORKSPACE"
clone_if_missing "$BE_REPO" "$BE" "Ecommerce-BE"
clone_if_missing "$UI_REPO" "$UI" "Ecommerce-UI"

# ---------------------------------------------------------------- backend ----
info "Installing showroom module into Ecommerce-BE"
rm -rf "$BE/src/showroom"
cp -r "$ROOT/ecommerce-be/src/showroom" "$BE/src/showroom"
ok "src/showroom/"

patch_file before "$BE/src/app.module.ts" \
  "import * as entities from './entities';" \
  "import { ShowroomModule } from './showroom/showroom.module';" \
  "showroom/showroom.module"

patch_file after "$BE/src/app.module.ts" \
  "    ContactsModule," \
  "    ShowroomModule," \
  "    ShowroomModule,"

# --------------------------------------------------------------- frontend ----
info "Installing showroom-3d route into Ecommerce-UI"
rm -rf "$UI/src/showroom-3d"
cp -r "$ROOT/ecommerce-ui/src/showroom-3d" "$UI/src/showroom-3d"
ok "src/showroom-3d/"

patch_file before "$UI/src/App.jsx" \
  "// 404 Page" \
  "// Showroom 3D (self-contained module)
import ShowroomPage from \"./showroom-3d\";
" \
  "./showroom-3d"

patch_file before "$UI/src/App.jsx" \
  "{/* Auth Routes (without main layout) */}" \
  "          {/* Showroom 3D - standalone, outside MainLayout */}
          <Route path=\"showroom-3d\" element={<ShowroomPage />} />
" \
  "showroom-3d\" element"

# ----------------------------------------------------------- docker files ----
info "Adding Docker build files"
cp "$ROOT/docker/Dockerfile.api" "$BE/Dockerfile"
cp "$ROOT/docker/dockerignore"   "$BE/.dockerignore"
cp "$ROOT/docker/Dockerfile.web" "$UI/Dockerfile"
cp "$ROOT/docker/dockerignore"   "$UI/.dockerignore"
cp "$ROOT/docker/nginx.conf"     "$UI/docker-nginx.conf"
ok "Dockerfiles, .dockerignore, nginx conf"

# -------------------------------------------------------------- verifying ----
info "Verifying"
for f in "$BE/src/showroom/showroom.module.ts" "$BE/src/showroom/migrations/1757923200000-CreateShowroomTables.ts" \
         "$UI/src/showroom-3d/index.js" "$UI/src/showroom-3d/ShowroomPage.jsx" \
         "$BE/Dockerfile" "$UI/Dockerfile" "$UI/docker-nginx.conf"; do
  [ -f "$f" ] || die "missing: $f"
done
grep -q "ShowroomModule," "$BE/src/app.module.ts"    || die "app.module.ts imports array not patched"
grep -q "showroom/showroom.module" "$BE/src/app.module.ts" || die "app.module.ts import statement missing"
grep -q 'showroom-3d" element' "$UI/src/App.jsx"     || die "App.jsx route not added"
grep -q './showroom-3d' "$UI/src/App.jsx"            || die "App.jsx import missing"
ok "all checks passed"

if [ ! -f "$ROOT/.env" ]; then
  warn "No .env yet. Run: cp .env.docker.example .env   (then set JWT_SECRET)"
fi

printf '\n\033[1;32mWorkspace ready.\033[0m Next: docker compose up -d --build\n'
