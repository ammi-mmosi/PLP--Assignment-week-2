const serverUrl = "http://localhost:3000"; 

async function testPivotFlow() {
    console.log("____Starting Solstice Kiosk Pivot Flow test____");

 // Step 1: Initial Scan for Olkalau (mtu_1)
  console.log('\n[Client] Sending print request for Olkalau (mtu_1)...');
  let response = await fetch(serverUrl + '/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'mtu_1' })
  });
  console.log('[Server Status]:', response.status);
  console.log('[Server Body]:', await response.json());

  // Step 2: Immediate Duplicate Scan for Olkalau (mtu_1) to verify protection
  console.log('\n[Client] Attempting duplicate scan for Olkalau (mtu_1) before print completes...');
  response = await fetch(serverUrl + '/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'mtu_1' })
  });
  console.log('[Server Status]:', response.status);
  console.log('[Server Body]:', await response.json());

  // Step 3: Trigger simulated printer success callback from vendor
  console.log('\n[Client] Simulating printer vendor callback confirming print success...');
  response = await fetch(serverUrl + '/api/printer/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId: 'mtu_1', printStatus: 'SUCCESS' })
  });
  console.log('[Server Status]:', response.status);
  console.log('[Server Body]:', await response.text());

  // Step 4: Final Database Status Verification
  console.log('\n[Client] Checking final database state...');
  response = await fetch(serverUrl + '/');
  console.log('[Server Body]:', await response.json());
}

testPivotFlow().catch(console.error);

