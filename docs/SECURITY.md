# Security model

Keypt handles data that may be sensitive, so its safe default is to store less, expose less, and fail closed when the OS key store is unavailable.

## Security invariants

- Clipboard data does not leave the device.
- Clipboard history is never written to disk without authenticated encryption.
- The renderer never receives Node.js or arbitrary Electron privileges.
- Every renderer-to-main action crosses a typed, validated, sender-checked IPC boundary.
- Navigation, popups, Chromium permissions, and all renderer network connections are denied.
- The main process may contact only the fixed public GitHub Releases feed for signed app updates.
- Concealed clipboard formats and sources identified as excluded are rejected before persistence.
- No fallback turns secure-storage failure into plaintext history.

## Threat model

Keypt is designed to protect history files from casual disclosure, offline disk inspection, backups that capture the vault without the usable OS account key, renderer compromise that attempts arbitrary Electron IPC, malformed local state, and accidental capture from applications that identify private clipboard content.

Keypt does not claim to protect against:

- Malware or an administrator already able to read the logged-in user's memory, clipboard, Keychain/DPAPI context, or keystrokes.
- Another application reading the current OS clipboard after Keypt restores an item.
- Screenshots, swap, crash dumps, or forensic capture of plaintext while an item is in process memory.
- A browser that exposes password-field copies as ordinary text without a private clipboard marker.
- Separate copies of history created by system backup software while the user's OS credentials are available.

Encryption at rest is one layer, not a sandbox against a compromised desktop account.

## Cryptography and keys

History uses Node's platform cryptography implementation for AES-256-GCM. Each encrypted file contains a `KYPT2` version marker, random 96-bit IV, 128-bit authentication tag, and ciphertext. The marker, file role, and item UUID are authenticated as AAD, so ciphertext cannot be moved between the index or payload files. Authentication and the indexed plaintext digest are checked before content is returned. Legacy development envelopes are migrated after a successful authenticated read.

The master key is 256 random bits generated once per vault. Electron `safeStorage` encrypts the base64 representation; on supported targets this delegates to macOS Keychain or Windows DPAPI. The key file and clipboard ciphertext are separate. Keypt has no recovery key, password reset, server escrow, or export path.

Metadata required by the UI—including previews, search text, source app, timestamps, and thumbnails—is inside the encrypted index. `preferences.json` is intentionally plaintext because it contains settings, app exclusion names, and retention choices, not clipboard content.

## Electron hardening

The application enables Electron's global Chromium sandbox before readiness. The panel uses:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- Production DevTools disabled

The preload is bundled as self-contained CommonJS because sandboxed Electron preloads cannot load arbitrary Node dependencies. It exposes a purpose-built `KeyptApi`, not `ipcRenderer`.

Window creation and top-level session hooks deny new windows, navigation, permission checks, and permission requests. A restrictive meta policy ships in the renderer HTML, and the packaged build applies the stricter network-deny policy below as a response header:

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'none';
media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors 'none'
```

## IPC validation

The renderer can request only snapshot read, item activation, pin, delete, clear, settings update,
pause, paste-permission prompt, data-folder open, update check/download/install, and panel hide. There
is no generic “send channel,” file read, process execute, or shell-open bridge. Both action results
and snapshots are validated again in preload before reaching React.

Handlers verify that `event.sender` belongs to the one panel window and that `event.senderFrame` is its main frame. Inputs are `unknown` until parsed with Zod in the main process. IDs must be UUIDs, settings are bounded, view names and actions are enums, and excluded-app lists have count and length limits. Snapshot events are validated again in preload before reaching React.

## Clipboard sensitivity controls

Keypt rejects standard markers used for transient, concealed, auto-generated, 1Password, and Windows
no-history content. The default excluded-app list covers common password managers and can be edited
or expanded. Capture can be paused from Settings or the tray. Resuming capture, unlocking the
screen, or resuming the computer records the current clipboard digest without persisting it, so
content copied while monitoring was stopped is not imported afterward.

These controls are necessarily best effort because clipboard conventions vary and source applications can omit them. Source attribution samples the foreground application after a clipboard change; switching applications before the next poll can therefore misattribute a copy. In particular, Chromium and other browsers do not promise a cross-platform marker for ordinary text copied from a password field. The UI states that limitation and recommends excluding the browser or pausing capture when needed. Exclusions are defense in depth, not a replacement for a password manager's concealed or transient clipboard marker.

## Files, child processes, and limits

Vault mutations are serialized and use atomic writes. Data directories request mode `0700` and files request `0600`; Windows applies its account ACL model instead of POSIX modes. Schemas bound index count and string sizes, while capture rejects text above 1 MiB and images above 20 MiB.

Native discovery and paste behavior use `execFile` with absolute system executable paths, fixed argument arrays, short timeouts, and non-interactive/hidden Windows processes. Clipboard text is never interpolated into a command. The only shell capability exposed to the UI opens the already-known vault directory through `shell.openPath`; arbitrary paths and URLs are not accepted.

## Runtime network behavior

Keypt has no telemetry, analytics, crash upload, remote fonts, remote images, account traffic, or
clipboard sync. Production CSP prevents renderer connections even if UI code regresses. The only
runtime network client lives in the main process and checks the fixed public `AmoonPod/keypt` GitHub
Releases endpoint after startup and every six hours. It disables prereleases, downgrades, and web
installers, never auto-downloads, never auto-installs on quit, and exposes explicit download and
restart actions only after GitHub release metadata reports a newer platform-signed artifact whose
digest matches the updater manifest.

## Dependency and release controls

The lockfile is committed and npm lifecycle scripts are allowlisted in strict mode. CI uses `npm ci`,
checks formatting/types/lint/tests and the renderer size budget, launches native Electron E2E on both
target platforms, and tests packaged applications. GitHub Actions are pinned to commit SHAs. Tagged
releases require signing secrets, verify notarization and Authenticode, validate updater manifests,
publish checksums and CycloneDX SBOMs, and attest artifact provenance before the release becomes
public.

See the repository [SECURITY.md](../SECURITY.md) to report a vulnerability privately.
