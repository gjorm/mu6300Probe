// Samsung MU6300 / TizenBrew: passive system and process inventory.
// Reads /proc only. No exec, file writes or root attempts.
// One opt-in outbound HTTP POST is made only after a user presses Export in the UI.
(function () {
  'use strict';
  var fs = require('fs');
  var os = require('os');
  var http = require('http');
  var PORT = 38772;
  var RECEIVER_PORT = 38767;
  var MAX_REQUEST_BYTES = 512;
  var MAX_REPORT_BYTES = 256 * 1024;
  var interest = /(acr|rmdemon|presence|adsuite|adplayer|adplatform|telemetry|analytics|content.grab|samsungacr|remote.manage|smartthing|tizenbrew|litewebapp|sdb|logging|kdbus)/i;

  function read(path) {
    try { return fs.readFileSync(path, 'utf8').trim(); }
    catch (e) { return null; }
  }
  function fields(raw) {
    var result = {};
    if (!raw) return result;
    raw.split('\n').forEach(function (line) {
      var m = line.match(/^(Name|PPid|Uid|Gid|CapEff|NoNewPrivs|Seccomp):\s*(.*)$/);
      if (m) result[m[1]] = m[2];
    });
    return result;
  }
  function firstCommand(raw) {
    if (!raw) return '';
    // Only the executable name is displayed; omit arguments, which could include credentials.
    return raw.split('\u0000')[0].slice(0, 160);
  }
  // Full process census; never read process environments or command arguments.
  // /proc/<pid>/cmdline is used only for argv[0], the executable path.
  function scan() {
    var pids = [];
    try { pids = fs.readdirSync('/proc').filter(function (x) { return /^\d+$/.test(x); }); }
    catch (e) { return { error: 'Cannot list /proc: ' + e.code, count: 0, all: [], matches: [] }; }
    var all = [], matches = [], unreadable = 0;
    pids.forEach(function (pid) {
      var raw = read('/proc/' + pid + '/status');
      var status = fields(raw);
      if (!raw) unreadable++;
      var command = firstCommand(read('/proc/' + pid + '/cmdline'));
      var name = status.Name || '(unreadable)';
      var item = {
        pid: Number(pid), name: name, command: command,
        uid: status.Uid ? status.Uid.split(/\s+/)[0] : '?',
        ppid: status.PPid || '?',
        smack: read('/proc/' + pid + '/attr/current') || '(unreadable)'
      };
      all.push(item);
      if (interest.test(name + ' ' + command)) matches.push(item);
    });
    all.sort(function (a,b) { return a.pid - b.pid; });
    matches.sort(function (a,b) { return a.pid - b.pid; });
    return {count: pids.length, collected: all.length, unreadable: unreadable,
      all: all, matches: matches, truncated: false};
  }
  function report() {
    return {
      version: '6.0.0',
      host: {node: process.version, architecture: process.arch,
        uid: process.getuid ? process.getuid() : null,
        gid: process.getgid ? process.getgid() : null,
        smack: read('/proc/self/attr/current'),
        kernel: os.release(),
        status: fields(read('/proc/self/status'))},
      processes: scan()
    };
  }
  function privateIPv4(input) {
    if (typeof input !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) return false;
    var p = input.split('.').map(function (s) { return Number(s); });
    if (p.some(function (x) { return x < 0 || x > 255; })) return false;
    if (p[0] === 10) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    return p[0] === 192 && p[1] === 168;
  }
  function reply(res, code, obj) {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  }
  function transfer(receiver, pin, res) {
    var data;
    try { data = JSON.stringify(report()); }
    catch (e) { reply(res, 500, {error: 'Survey failed: ' + String(e)}); return; }
    if (Buffer.byteLength(data, 'utf8') > MAX_REPORT_BYTES) {
      reply(res, 413, {error: 'Survey too large'}); return;
    }
    var options = {
      hostname: receiver, port: RECEIVER_PORT, method: 'POST', path: '/upload',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data, 'utf8'),
                 'X-TV-Report-Code': pin }
    };
    var done = false;
    function finish(code, body) { if (!done) { done = true; reply(res, code, body); } }
    var outbound = http.request(options, function (r) {
      var chunks = [], total = 0;
      r.on('data', function (buf) { total += buf.length; if (total < 4096) chunks.push(buf); });
      r.on('end', function () {
        var answer = {};
        try { answer = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) {}
        if (r.statusCode === 200 && answer.ok) finish(200, {ok:true, filename: answer.filename || 'report.json'});
        else finish(502, {error: answer.error || ('Receiver HTTP ' + r.statusCode)});
      });
    });
    outbound.on('error', function (err) { finish(502, {error: 'Receiver unreachable (' + err.code + ')'}); });
    outbound.setTimeout(9000, function () { outbound.abort(); finish(504, {error: 'Receiver timed out'}); });
    outbound.end(data);
  }
  var server = http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    if (req.method === 'GET' && req.url === '/survey') {
      try { reply(res, 200, report()); }
      catch (e) { reply(res, 500, {error: String(e)}); }
      return;
    }
    if (req.method !== 'POST' || req.url !== '/export') {
      reply(res, 404, {error: 'Not found'}); return;
    }
    var chunks = [], size = 0, rejected = false;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) { rejected = true; reply(res, 413, {error: 'Request too large'}); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', function () {
      if (rejected) return;
      var params;
      try { params = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (e) { reply(res, 400, {error: 'Invalid request'}); return; }
      if (!privateIPv4(params.receiver)) { reply(res, 400, {error: 'Use a private IPv4 address'}); return; }
      if (typeof params.pin !== 'string' || !/^\d{8}$/.test(params.pin)) {
        reply(res, 400, {error: 'Expected eight-digit receiver code'}); return;
      }
      transfer(params.receiver, params.pin, res);
    });
  });
  server.on('error', function (err) { console.log('Local process survey: ' + String(err)); });
  server.listen(PORT, '127.0.0.1');
})();
