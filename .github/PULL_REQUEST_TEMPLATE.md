## What and why

<!-- Describe the user/platform problem and the smallest behavior change. Never paste real clipboard data. -->

## Verification

<!-- List commands, operating systems, architectures, and manual paths tested. -->

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Native behavior was tested on each affected platform, or the limitation is stated above.

## Safety and scope

- [ ] No clipboard data, credentials, vaults, personal paths, or signing material are included.
- [ ] New IPC input is sender-checked and validated in the main process.
- [ ] The renderer still has no Node.js or unrestricted Electron access.
- [ ] Keyboard, focus, reduced motion, forced colors, light, and dark behavior were considered.
- [ ] This change stays within `PRODUCT.md`; it does not add accounts, sync, AI, collaboration, telemetry, or a dashboard.

## Visible changes

<!-- Add generated-data screenshots for UI changes. Otherwise write “None.” -->
