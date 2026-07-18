# Releasing Keypt

Keypt uses electron-builder for platform artifacts and GitHub Actions for tagged releases. Each
release also publishes updater manifests and blockmaps, `SHA256SUMS.txt`, CycloneDX SBOMs, and GitHub
artifact provenance attestations. The app checks the official GitHub release channel, but users
explicitly choose when to download and when to restart to install.

## Artifacts

| Platform | Architecture | Output                 |
| -------- | ------------ | ---------------------- |
| macOS    | x64          | DMG and zip            |
| macOS    | arm64        | DMG and zip            |
| Windows  | x64          | NSIS installer and zip |

The filename format is `Keypt-<version>-<os>-<arch>.<ext>`.

Native jobs upload private workflow artifacts first. The publish job validates the complete asset
set, creates a draft release, uploads everything, and makes it public only after all checks pass.

## Required repository secrets

The release workflow intentionally requires signing credentials before it publishes binaries.

### macOS

- `MAC_CSC_LINK`: Developer ID Application certificate as a base64 value or supported electron-builder certificate link.
- `MAC_CSC_KEY_PASSWORD`: certificate password.
- `APPLE_ID`: Apple developer account email used for notarization.
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization.
- `APPLE_TEAM_ID`: Apple Developer team ID.

### Windows

- `WINDOWS_CSC_LINK`: code-signing certificate as a base64 value or supported electron-builder certificate link.
- `WINDOWS_CSC_KEY_PASSWORD`: certificate password.

Use organization or environment-scoped secrets with the smallest practical access. Never commit certificates, passwords, Apple credentials, or decoded signing files.

## First production release gate

Do not push the first public version tag until all signing and notarization secrets above are
configured. Local ad-hoc builds can validate application behavior and package structure, but they
cannot prove Gatekeeper, SmartScreen, or production updater behavior. Before calling updates
production-verified, publish two signed patch releases and exercise the complete previous-version to
new-version download and restart flow on clean macOS ARM64, macOS Intel, and Windows machines.

## Release checklist

1. Confirm the working tree is clean and CI is green on the intended commit.
2. Update `version` in `package.json` and `package-lock.json` together.
3. Move user-visible changes from `CHANGELOG.md`'s Unreleased section into the release version.
4. Run locally:

   ```bash
   npm ci
   npm run check
   npm run build
   npm run test:e2e
   ```

5. Create an annotated tag matching the package version:

   ```bash
   git tag -a v0.1.0 -m "Keypt 0.1.0"
   git push origin v0.1.0
   ```

6. Watch `.github/workflows/release.yml`. It validates credentials, reruns quality and Electron tests,
   tests packaged apps, verifies signatures, fuses, and every update payload's SHA-512 and size, then
   publishes one atomic release.
7. Confirm the release contains `latest-mac.yml`, `latest.yml`, required blockmaps, checksums, both
   SBOMs, and every documented installer/ZIP.
8. On macOS, independently verify both architectures with `codesign --verify --deep --strict`,
   `spctl --assess --type execute`, and `xcrun stapler validate`.
9. On Windows, inspect Authenticode and run a clean-machine install/uninstall smoke test.
10. Install the previous version, confirm the update button appears, then exercise download and
    restart-to-install on both target operating systems.

If any signing, notarization, test, or artifact job fails, do not manually upload a differently built binary under the same tag. Fix the cause, delete the failed draft/release artifacts if any, and tag a new patch version so provenance remains unambiguous.

## Local unsigned artifacts

Contributors can verify package structure without signing:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run package
```

Unsigned builds are for local development only. The tagged workflow requires credentials so the public release path cannot silently normalize unsigned production installers.
