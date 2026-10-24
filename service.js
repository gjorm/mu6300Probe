// TizenBrew service module. Read-only diagnostics, loopback-only HTTP output.
// No commands, persistent file writes, or outbound telemetry.
(function () {
  var fs = require('fs');
  var http = require('http');
  var port = 38765;

  function readText(path) {
    try { return fs.readFileSync(path, 'utf8').trim(); }
    catch (e) { return 'unavailable (' + e.code + ')'; }
  }
  function sysInfo() {
    var status = readText('/proc/self/status');
    var selected = {};
    if (status.indexOf('unavailable') !== 0) {
      status.split('\n').forEach(function (line) {
        var match = line.match(/^(Name|Pid|PPid|Uid|Gid|Groups|CapEff|NoNewPrivs|Seccomp):\s*(.*)$/);
        if (match) selected[match[1]] = match[2];
      });
    }
    return {
      nodeVersion: process.version,
      architecture: process.arch,
      platform: process.platform,
      uid: typeof process.getuid === 'function' ? process.getuid() : null,
      gid: typeof process.getgid === 'function' ? process.getgid() : null,
      processStatus: selected,
      securityLabel: readText('/proc/self/attr/current')
    };
  }

  var server = http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET' || req.url !== '/status') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(sysInfo()));
  });
  server.on('error', function (err) {
    console.log('MU6300 probe server error: ' + String(err));
  });
  server.listen(port, '127.0.0.1');
})();
