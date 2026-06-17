const http = require('http');

function request(method, path, body, raw) {
  raw = raw || false;
  return new Promise(function(resolve, reject) {
    var options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    var req = http.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        if (raw) return resolve({ status: res.statusCode, body: data });
        try { resolve({ status: res.statusCode, body: JSON.parse(data || '{}') }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

var passed = 0;
var failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log('  PASS: ' + name);
    passed++;
  } catch(err) {
    console.log('  FAIL: ' + name + ' - ' + err.message);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runTests() {
  console.log('');
  console.log('BodaConnect API Tests');
  console.log('');

  await test('GET / returns 200', async function() {
    var res = await request('GET', '/');
    assert(res.status === 200, 'Expected 200, got ' + res.status);
  });

  await test('GET /metrics returns prometheus data', async function() {
    var res = await request('GET', '/metrics', null, true);
    assert(res.status === 200, 'Expected 200, got ' + res.status);
    assert(res.body.indexOf('# HELP') !== -1, 'Expected prometheus format');
  });

  await test('POST /rides creates a ride', async function() {
    var res = await request('POST', '/rides', {
      passenger_name: 'Test Passenger',
      passenger_phone: '+255700000000',
      pickup: 'Kariakoo Market',
      destination: 'Mlimani City Mall',
      pickup_location: { latitude: -6.8160, longitude: 39.2738 },
      destination_location: { latitude: -6.7726, longitude: 39.2285 }
    });
    assert(res.status === 201, 'Expected 201, got ' + res.status);
    assert(res.body.id !== undefined, 'Missing ride id');
    assert(res.body.status === 'pending', 'Ride should be pending');
    assert(res.body.passenger_name === 'Test Passenger', 'Missing passenger name');
  });

  await test('POST /rides without pickup returns 400', async function() {
    var res = await request('POST', '/rides', {
      passenger_name: 'Test Passenger',
      passenger_phone: '+255700000000',
      destination: 'Mwenge'
    });
    assert(res.status === 400, 'Expected 400, got ' + res.status);
    assert(res.body.error !== undefined, 'Missing error message');
  });

  await test('POST /auth/register without fields returns 400', async function() {
    var res = await request('POST', '/auth/register', { email: 'test@test.com' });
    assert(res.status === 400, 'Expected 400, got ' + res.status);
  });

  await test('POST /auth/login with wrong password returns 401', async function() {
    var res = await request('POST', '/auth/login', { email: 'nobody@x.com', password: 'wrong' });
    assert(res.status === 401, 'Expected 401, got ' + res.status);
  });

  await test('GET /rides without token returns 401', async function() {
    var res = await request('GET', '/rides');
    assert(res.status === 401, 'Expected 401, got ' + res.status);
  });

  await test('POST /auth/login without fields returns 400', async function() {
    var res = await request('POST', '/auth/login', {});
    assert(res.status === 400, 'Expected 400, got ' + res.status);
  });

  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
  console.log('');

  if (failed > 0) {
    console.log('TESTS FAILED');
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED');
    process.exit(0);
  }
}

runTests().catch(function(err) {
  console.error('Test runner crashed: ' + err.message);
  process.exit(1);
});
