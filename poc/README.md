# nf-gui prototype

This is a small, runnable Tauri/React prototype and a repeatable checkpoint for
dependency and runtime-artifact reviews. It is not the nf-gui application.
Project code is licensed under the repository [MIT License](../LICENSE).
Dependencies retain their own open-source licenses and notices; the project
license does not replace those obligations.

## What it demonstrates

- Tauri 2.12.7 desktop shell, `@tauri-apps/api` 2.12.5, and a
  React/TypeScript/Vite frontend.
- A local Monaco plain-text editor and a static React Flow canvas.
- Exact direct dependency pins plus `package-lock.json` and `src-tauri/Cargo.lock`.
- A local-only SHA-256 verifier for the optional Nextflow language-server JAR
  and nf-schema plugin blob.

The editor and graph are independent examples: changing the editor does not
change the graph. The editor now has explicit connect/stop controls for the
supervised LSP transport. When connected, it opens one in-memory sample buffer,
syncs edits, displays server diagnostics, and provides completion and hover if
the server advertises support. The graph remains static and is not derived
from the server.

The Rust commands only launch fixed `java -jar` with the packaged
`artifacts/language-server-all.jar` after checking its pinned SHA-256. The JAR
is not committed; without it, language-server startup returns an error in the
editor status. The pin is the latest stable release found for this update,
Nextflow language server `v26.10.2` (published 2026-10-27). Its release API
reports the asset digest, which was independently confirmed by downloading the
10,015,752-byte JAR and hashing it locally. From the `poc/` directory, stage and
verify it before building:

```sh
mkdir -p artifacts
curl -fL https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar \
  -o artifacts/language-server-all.jar
```

Check the JAR checksum using the command for your platform in the setup
instructions below. `npm run audit:artifacts` checks every artifact in the
manifest, including the deferred nf-schema blob; it will report that blob
missing unless it has also been staged.

The bundle configuration includes files placed in `artifacts/`; the runtime
repeats the digest check before launching. This remains a single-buffer integration spike in the UI: it has no project
workspace/file access, pipeline execution, plugin loading, automatic downloads,
or cross-file navigation. Its session API can register multiple in-memory
models, but no workspace UI uses that capability yet. The sample model uses a
synthetic URI and changes are not saved. Do not use it to open or analyze an
untrusted workflow.

The JAR requires Java 17 or newer. After staging and verifying it, run the app
with `npm run tauri dev` or package it with `npm run tauri -- build`.

## Run

Prerequisites: Node.js 22.12+ (Vite 8), npm, Rust/Cargo, Java 17+, and the
platform dependencies listed in the official
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/). The
setup instructions below distinguish the Ubuntu environment validated for this
checkpoint from macOS and Windows, which have not yet been built here. These
instructions do not by themselves establish supported-platform status.

### Ubuntu 24.04 x86_64 — validated here

Open Terminal (press **Ctrl+Alt+T**) and install the Tauri system libraries:

```sh
sudo apt update
sudo apt install -y build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev libwebkit2gtk-4.1-dev pkg-config \
  openjdk-17-jre-headless
```

If Node.js is unavailable or older than 22.12, install Node.js 22 using nvm:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install 22
```

Install Rust with the official `rustup` installer:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

When prompted, type `1` for the default installation and press **Enter**.
Close and reopen Terminal, then check the prerequisites:

```sh
node --version
npm --version
rustc --version
java -version
pkg-config --modversion glib-2.0 gio-2.0 webkit2gtk-4.1
```

Each command must print a version. From the repository directory, run:

```sh
cd poc
npm ci
mkdir -p artifacts
curl -fL https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar \
  -o artifacts/language-server-all.jar
echo '20326778651c5c5e5f40a570c2275d1f520419941624386a2b1a111f1dfa4b26  artifacts/language-server-all.jar' \
  | sha256sum -c -
npm test
npm run build
npm run tauri dev
```

In the app window, press **Connect language server**. To verify shutdown, press
**Stop language server**; to retry after an error, press **Retry language
server**. The JAR must be staged before building because it is a bundled
resource. `artifacts/` is git-ignored; do not commit the JAR.
The Linux native build and a virtual-display window launch were checked here;
the buttons and language-server UI flow were not interactively exercised.

### GitHub Codespaces — Linux desktop review

The repository devcontainer provides Node.js 22, stable Rust/Cargo, Java 17,
Tauri's Ubuntu 24.04 build libraries, Xvfb, Openbox, and noVNC. On creation,
`poc/scripts/codespace-setup.sh` installs the locked npm dependencies and stages
only the pinned Nextflow language-server JAR after verifying its manifest
SHA-256. The JAR remains outside version control.

Create a Codespace from the intended PR branch and commit. Before testing, check
that the checkout is the revision you expect:

```sh
git rev-parse HEAD
git status --short
```

Compare the first command's output with the intended commit SHA. If it differs,
stop and create or update the Codespace for the correct PR revision before
proceeding. The devcontainer setup runs automatically on creation; rerun it from
the repository root if needed:

```sh
bash poc/scripts/codespace-setup.sh
cd poc
npm test
npm run build
(cd src-tauri && cargo test --locked)
npm run tauri -- build --no-bundle
```

For interactive testing, run:

```sh
cd poc
npm run codespace:desktop
```

Open the automatically forwarded **Private Tauri desktop (noVNC)** port 6080
from the Codespaces **Ports** tab and navigate to `/vnc.html` if the server root
shows a directory listing. Connect to the desktop viewer. Forwarding is private
to authorized Codespaces users; the raw VNC server binds only to localhost and
its port must not be forwarded. Do not expose port 1420 as a substitute: the
browser Vite page does not exercise Tauri IPC. In the desktop window, test
Connect/Stop and the available diagnostics, hover, and completion features. The
prototype still uses a single in-memory sample buffer and does not demonstrate
workspace or cross-file behavior.

The user confirmed that the Codespaces noVNC viewer works when opened at
`/vnc.html`. Native build/Rust tests and the actual Tauri/LSP feature checks
remain to be reported. This optional interactive path does not replace headless
CI or by itself establish Linux product support.

### macOS — Tauri prerequisites documented; not validated here

This project has not yet been built on macOS. Tauri supports macOS; install the
Xcode development tools and Java before following the shared npm/Rust/JAR steps:

1. Open the **App Store**, search for **Xcode**, press **Get**/**Install**, then
   open Xcode and accept its license prompt.
2. Open **Terminal** with **Command+Space**, type `Terminal`, and press
   **Enter**. Run `xcode-select --install`; in the popup, press **Install** and
   wait for completion.
3. On [Node.js downloads](https://nodejs.org/en/download), select macOS and
   download the `.pkg` installer for Node.js 22.12+ (or a newer supported
   release). Open the downloaded file and press **Continue**, accept the
   license, choose the standard destination, press **Install**, and enter the
   Mac password if requested.
4. On [Eclipse Temurin](https://adoptium.net/temurin/releases/), select version
   **17**, operating system **macOS**, the Mac's processor architecture
   (**AArch64** for Apple Silicon or **x64** for Intel), and package **JRE**.
   Download/open the `.pkg`, then press **Continue**, accept the license,
   choose the standard destination, press **Install**, and enter the Mac
   password if requested.
5. Install Rust using the command above. Type `1` and press **Enter** when the
   rustup installer asks for an installation choice. Close and reopen Terminal.
6. In Terminal, change to your repository's `poc` folder. Replace the sample
   path below with the actual location you cloned into, then enter:

   ```sh
   cd /path/to/your/nf-gui/poc
   npm ci
   mkdir -p artifacts
   curl -fL https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar \
     -o artifacts/language-server-all.jar
   printf '%s  %s\n' \
     '20326778651c5c5e5f40a570c2275d1f520419941624386a2b1a111f1dfa4b26' \
     'artifacts/language-server-all.jar' | shasum -a 256 -c -
   npm test
   npm run build
   npm run tauri dev
   ```

   When the app window appears, press **Connect language server**, then press
   **Stop language server** to verify shutdown.

The JAR uses Java on macOS, including Apple Silicon; the separate upstream
standalone bundle is not used by this prototype.

### Windows x64 — setup documented; not validated here

The pinned Tauri `2.12.7` is above the first patched release (`2.11.1`) for
GHSA-7gmj-67g7-phm9. However, Windows builds and runtime behavior have not been
validated here. These steps target x64; full dependency audit/build evidence
and platform testing are required before claiming Windows support. Android is
not a target of this desktop prototype.

1. In a browser, download and run [Visual Studio Build Tools
   2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/). In the
   installer, select **Desktop development with C++**; ensure the MSVC v143
   build tools and a Windows 10 or 11 SDK are selected, then press **Install**.
   The full Visual Studio IDE is not required.
2. Install the [Microsoft Edge WebView2 Evergreen
   Runtime](https://developer.microsoft.com/microsoft-edge/webview2/). On
   Windows 11 it is normally already present; install the x64 Evergreen
   Standalone Runtime if it is missing.
3. Download Node.js 22.12+ for Windows from [Node.js
   downloads](https://nodejs.org/en/download), open the x64 `.msi`, accept the
   license, keep the standard features and **Add to PATH** enabled, and finish
   the installation.
4. Download Eclipse Temurin **JRE 17**, **Windows x64**, `.msi` from
   [Adoptium](https://adoptium.net/temurin/releases/). Run it with the standard
   options and enable **Add to PATH** if the installer offers that option.
5. Download and run `rustup-init.exe` from [rustup.rs](https://rustup.rs/).
   Choose the default installation (type **1** and press **Enter**); use the
   `x86_64-pc-windows-msvc` target. Close and reopen PowerShell afterward.
6. Open PowerShell (press **Windows**, type **PowerShell**, then press
   **Enter**). Check the tools:

```powershell
node --version
npm --version
rustc --version
java -version
```

Each command must print a version. Change to the repository's `poc` folder,
then run:

```powershell
cd C:\path\to\nf-gui\poc
npm ci
New-Item -ItemType Directory -Force artifacts | Out-Null
Invoke-WebRequest `
  -Uri https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar `
  -OutFile artifacts/language-server-all.jar
$expected = '20326778651c5c5e5f40a570c2275d1f520419941624386a2b1a111f1dfa4b26'
$actual = (Get-FileHash artifacts/language-server-all.jar -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Language-server JAR SHA-256 mismatch: $actual" }
npm test
npm run build
npm run tauri dev
```

Replace `C:\path\to\nf-gui\poc` with the actual folder. When the app window
appears, press **Connect language server**, then **Stop language server** to
verify shutdown. If Java startup fails, check that `java -version` works in the
same PowerShell window.

The Vite development server binds only to `127.0.0.1`. The Tauri window uses a
restrictive CSP and has no enabled capability permissions.

## Dependency and artifact review

The lockfiles are the resolved dependency graphs; do not infer transitive
exposure from the direct versions in `package.json` or `Cargo.toml`.

```sh
npm run audit:tree
npm run audit:npm
cargo install cargo-audit --version 0.23.0 --locked
npm run audit:cargo
npm sbom --sbom-format=cyclonedx > /tmp/nf-gui-poc.npm.cdx.json
cargo metadata --format-version 1 --locked > /tmp/nf-gui-poc.cargo-metadata.json
```

`npm run audit:dependencies` runs both checks even if the first one fails and
returns a failure if either check fails. Review the license, source, and integrity fields in the npm SBOM and Cargo
metadata. The current lockfiles declare open-source licenses for all 54 npm
components and 493 third-party Cargo packages. Accept open-source licenses,
including copyleft, and comply with their terms; escalate only a confirmed
closed/proprietary dependency license. Missing or ambiguous metadata requires
investigation rather than an assumption that the dependency is closed.
Keep generated inventories outside the repository unless a reviewed, dated
snapshot is intentionally required.

The earlier lockfile audit found npm and RustSec advisories. This checkpoint
updated the direct Tauri dependencies and transitive lockfile; the current npm
audit is clean. The current Rust lockfile audit is recorded below after the
latest dependency update. Keep the dev server loopback-only and rerun both
advisory checks whenever the lockfile changes.
The earlier Tauri 2.9.2 baseline was affected by
[GHSA-7gmj-67g7-phm9](https://github.com/advisories/GHSA-7gmj-67g7-phm9)
on Windows and Android. This checkpoint now pins Tauri 2.12.7, which is newer
than the advisory's first patched version, 2.11.1. The GHSA is therefore no
longer a known current-version blocker, but the complete dependency graph still
requires re-audit and Windows has not been built or tested.

Tauri 2.12.7 and the matching JavaScript API/CLI updates were made after the
older 2.9.2 dependency graph failed native compilation due to incompatible
resolved Tauri runtime/Wry interfaces. The native Linux build now serves as the
first integrated build validation; it does not establish Windows or macOS
support.

The prototype's own code is MIT-licensed. This does not relicense its
dependencies; preserve each dependency's attribution and license notices and
meet any applicable source-availability obligations.

### Deferred security risks and upgrade gates

Previous npm and RustSec findings were recorded against an older dependency
graph. The refreshed npm audit currently reports zero vulnerabilities; see the
current Rust audit result below. Treat any remaining findings as unresolved
until specifically addressed, not as false positives. Keep the dev server bound
to `127.0.0.1`.
The exact findings and RustSec package paths are recorded in the
[Phase 0 risk register](../docs/plan/phase-0-audit-findings.md#accepted-and-deferred-risks).

Tauri 2.12.7 includes the documented Windows/Android advisory fix, but desktop
platform support still requires per-platform build/runtime validation and a
fresh full audit. The nf-schema blob was not verified and is not included or
enabled; verify its digest/provenance and resolve the version boundary before
use. None of these deferrals indicates that the dependency graph is suitable
for a release.

### Verify optional runtime artifacts

The artifact files are intentionally not committed. Download them only from the
sources and versions in [`artifacts/manifest.json`](artifacts/manifest.json),
then verify them locally:

```sh
curl -fL \
  https://github.com/nextflow-io/language-server/releases/download/v26.10.2/language-server-all.jar \
  -o artifacts/language-server-all.jar
curl -fL \
  'https://public.cr.seqera.io/v2/nextflow/plugin/nf-schema/blobs/sha256:1466fea73502dda8c8059dfe4190be1a857151bc2a500a87a86ffd223918a3f2' \
  -o artifacts/nf-schema-2.8.0.blob
npm run audit:artifacts
```

The verifier reads only local regular files, checks SHA-256, rejects symlinked
files and path-containing filenames, and never downloads or executes artifacts.
The full manifest check currently reports the unavailable nf-schema blob unless
it is staged; this is expected because that plugin remains deferred. Use the
per-artifact SHA-256 commands above to verify only the language-server JAR.
To verify a different manifest or staging directory, use
`node scripts/verify-artifacts.mjs --manifest PATH --artifacts-dir PATH`.
On any update, first verify the upstream release/tag and license, update the
manifest's version/source/digest and provenance citation together, download to
a temporary local directory, and require a passing verifier result before
recording the artifact as approved. Do not weaken or remove a digest to make a
check pass.

The pinned language-server JAR was downloaded to a temporary directory and
matched its recorded SHA-256. The nf-schema registry host could not be resolved;
the plugin is intentionally deferred and is not approved for use until the
manifest digest and provenance are verified.

## Updating the prototype for future blockers

1. Record the affected task ID, exact blocker, evidence, and next action in
   [`../PLAN_TRACKING.md`](../PLAN_TRACKING.md) and
   [`../CHANGELOG.md`](../CHANGELOG.md); leave its checkbox open until the
   required evidence and checks pass.
2. Select exact direct versions, roles, licenses, and source/provenance. Check
   them with the GitHub advisory database before adding/updating dependencies.
3. Update manifests through npm/Cargo, commit both lockfiles, and inspect the
   complete resolved graphs (`npm ls`, `npm sbom`, `cargo tree`, and
   `cargo metadata`).
4. Run both advisory scanners, the artifact verifier, and the prototype build.
   Record failures and unavailable checks as blockers; do not hide known
   advisories with audit exceptions, stale lockfiles, or undocumented overrides.
5. Update this README and the P0-07 evidence with the exact outcome, then update
   the tracker and changelog together.

The current lockfiles establish the first real JavaScript and Rust dependency
graphs. P0-07 and P0-EXIT are complete for this non-shipping scope by explicit
risk deferral, not because the audits are clean. Re-open them before
distribution, material dependency changes, platform support, or enabling
deferred artifacts.
