# MU6300 read-only probe for TizenBrew

An experimental TizenBrew application module for Samsung Tizen 3.0.

It uses `serviceFile` to start a localhost-only HTTP listener on 127.0.0.1:38765. The application page polls it and displays Node version, CPU architecture, UID/GID, selected process status fields, and the SMACK security label (when readable).

## Safety and limits

- No root exploit, filesystem modifications, package removal, external data transmission, or command execution.
- The service runs with TizenBrew's existing permissions, **not necessarily UID 5001**.
- It may fail if this particular Tizen version prevents a local HTTP listener or web page requests to the port.
- This application is experimental and has not been tested on the actual TV.
- Review the code before running; the entire module consists of `package.json`, `service.js`, and `index.html`.

## Installation through GitHub / jsDelivr

1. Create a **public** GitHub repository, e.g. `mu6300-probe`.
2. Put `package.json`, `index.html`, `service.js` in the **repository root**, on the `main` branch.
3. Check `https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USER/mu6300-probe/package.json` loads valid JSON (replace username).
4. On the TV in TizenBrew Next Generation open Add Module and choose **GitHub** if the UI asks for type.
5. Enter `YOUR_GITHUB_USER/mu6300-probe` in a GitHub-specific field, or `gh/YOUR_GITHUB_USER/mu6300-probe` if asked for a full CDN module path.
6. Start the **MU6300 Read-Only Probe** module. A successful result displays runtime and privilege information.

The module is loaded through jsDelivr; publishing *code* on GitHub does not send the diagnostic results to GitHub. The results stay in the TV's browser and local loopback interface.
