# Security policy

## Supported versions

Until the first stable release, security fixes are applied to the latest `0.x` release and the default branch only.

| Version                  | Supported |
| ------------------------ | --------- |
| Latest `0.x`             | Yes       |
| Older pre-release builds | No        |

## Report a vulnerability

Please use **GitHub private vulnerability reporting**:

1. Open the repository's **Security** tab.
2. Choose **Advisories**.
3. Select **Report a vulnerability** or create a private draft advisory.

Do not open a public issue, discussion, or pull request for a suspected vulnerability. Include the affected version/commit, operating system, reproduction steps using synthetic clipboard data, impact, and any suggested mitigation. Do not attach real vaults, credentials, signing material, or sensitive clipboard contents.

You should receive an acknowledgement within 7 days. The maintainers will validate the report, coordinate a fix and release, and credit the reporter unless anonymity is requested. Please allow a reasonable remediation window before public disclosure.

## Scope

Useful reports include encryption/authentication failures, plaintext history persistence, key-handling flaws, IPC or renderer privilege escalation, CSP bypass with practical impact, unsafe command construction, sensitive-format capture bypasses, update/release supply-chain weaknesses, and reproducible local data exposure beyond the documented threat model.

The documented trust boundaries and known limitations are in [`docs/SECURITY.md`](docs/SECURITY.md). Reports that only restate those explicit limitations may be closed, but concrete ways to reduce their impact are welcome through the private process.
