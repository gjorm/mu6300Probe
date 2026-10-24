# MU6300 Local Process Survey — v0.5.0

TizenBrew application module for Samsung Tizen 3.0 (tested in earlier revisions on a 2017 MU6300).

## Changes

- Explicit D-pad remote focus navigation: Up/Down move between controls, OK activates; Back returns to TizenBrew.
- Visible yellow focus outline. Small remote key diagnostics line for troubleshooting.
- Two on-screen numeric editors operated only with D-pad/OK: private receiver IP and the 8-digit one-time receiver code.
- `Keyboard` key in editor opens a prompt for use with keyboards or TV IME as an optional shortcut.
- Report generation remains read-only, export occurs only when Send is activated.

## Privacy

Public repo contains source code only. No actual IP address, MAC, serial number, receiver code or report is embedded. The IP and code are typed *at runtime* on the TV and are not written to disk. Report transfer is unencrypted local HTTP, to a user-selected private RFC1918 address on TCP 38767. Review reports locally before sharing.

## Deploy

Publish `package.json`, `index.html`, `service.js` in the existing GitHub repository root; create tag `v0.5.0` pointing at that commit. Add module using `gh/OWNER/REPO@v0.5.0`. Don't reuse an old tag because jsDelivr caches it.

The TV-side loopback service is port 38770 (changed from v0.4's 38768 to avoid conflicts). The receiver is unchanged, port 38767. It can be started on Fedora with `python3 ~/Downloads/tv-survey-receiver.py --bind <YOUR_LILBOX_IP>`.

## Remote controls

- **Up/Down**: move focus between actions.
- **OK**: activate highlighted action.
- **Edit receiver IP / Edit code**: opens a 4 × 4 numerical keypad.
- **In keypad**: arrows move among digits; OK enters a digit; Save validates; Cancel or remote Return closes.
- **Return** (outside keypad): return to TizenBrew if history allows; otherwise exit the application.

No root, firmware change, package deletion, or shell commands are performed.
