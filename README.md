# MU6300 Process Survey — v6

Read-only TizenBrew module. Tested functionality in earlier versions on Samsung MU6300 (Tizen 3.0); v6 itself has not yet been TV-tested.

## Changes from v5

- Export **all visible process IDs**, not just keyword matches. Includes PID, process name, UID, PPID, executable path from argv[0] (no further arguments), and accessible SMACK label. `processes.all` contains the complete census; `processes.matches` keeps the short on-screen summary.
- Retry initial data loading up to four times to mitigate TizenBrew service-startup delays.
- Keep remote D-pad and on-screen numerical keypad; prevent a huge JSON dump freezing the old TV browser by limiting on-screen preview to the summary. **The exported JSON includes all processes.**
- Loopback service uses port 38772 to avoid leftover v5 module on port 38770. LilBox receiver remains TCP 38767 and requires no changes.

## Deployment

Publish `package.json`, `index.html`, and `service.js` to the same GitHub repository and tag a **new** release `v6` pointing at the updated commit. Add module `OWNER/REPO@v6` (substitute your repository account and name). Do not reuse an old tag because jsDelivr caches it. Keep the receiver script on LilBox rather than uploading it to GitHub.

## Privacy and safety

The public module source contains no hostnames, MAC addresses, serial numbers, private IPs, one-time codes, or collected reports. The TV only exports when you press **Send survey to receiver**, using the private IPv4 address and one-time code entered through its UI. The report can expose installed application names and executable paths, so review the locally saved JSON before sharing or publishing. Traffic is plaintext HTTP over the LAN; do not route over an untrusted network. No shell execution, process manipulation, settings changes, or firmware writes.
