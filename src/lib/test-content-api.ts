// =============================================================================
// Content System API Tests
// Run from browser console: import('/src/lib/test-content-api').then(m => m.runAllTests())
// Or call individual tests: m.testCreateBundle(), m.testListWorkflows(), etc.
// =============================================================================

const BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3000'

async function fetchJSON(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

function log(label: string, result: any, pass: boolean) {
  const icon = pass ? '✅' : '❌'
  console.log(`${icon} ${label}`, result)
  return pass
}

// ---------------------------------------------------------------------------
// Individual Tests
// ---------------------------------------------------------------------------

export async function testGetAnalytics(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/analytics')
  const isValid = data.success === true
    && typeof data.data.activeWorkflows === 'number'
    && typeof data.data.queuedWorkflows === 'number'
    && typeof data.data.approvedContent === 'number'
    && typeof data.data.avgAgentHealth === 'number'
  return log('GET /analytics', data.data, isValid)
}

export async function testListWorkflows(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/workflows?limit=10')
  const isValid = data.success === true
    && Array.isArray(data.data)
    && data.system_status !== undefined
  return log('GET /workflows', { count: data.data.length, system_status: data.system_status }, isValid)
}

export async function testTriggerWorkflow(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/workflows', {
    method: 'POST',
    body: JSON.stringify({
      type: 'content-machine',
      input: { topic: 'Test workflow', trade: 'HVAC' },
      auto_start: true,
    }),
  })
  const isValid = data.success === true
    && data.data?.id !== undefined
    && data.data?.type === 'content-machine'
  return log('POST /workflows (trigger)', { id: data.data?.id, status: data.data?.status }, isValid)
}

export async function testCreateBundle(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/bundles', {
    method: 'POST',
    body: JSON.stringify({
      topic: 'Spring HVAC maintenance tips',
      trade: 'HVAC',
    }),
  })
  const isValid = data.success === true
    && data.data?.bundleId !== undefined
    && data.data?.workflowId !== undefined
  return log('POST /bundles (create)', {
    bundleId: data.data?.bundleId,
    workflowId: data.data?.workflowId,
  }, isValid)
}

export async function testListBundles(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/bundles?limit=10')
  const isValid = data.success === true
    && Array.isArray(data.data?.bundles)
    && typeof data.data?.totalCount === 'number'
  return log('GET /bundles', { count: data.data?.bundles?.length, total: data.data?.totalCount }, isValid)
}

export async function testListAssets(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/assets?limit=10')
  const isValid = data.success === true
    && Array.isArray(data.data?.assets)
    && typeof data.data?.totalCount === 'number'
  return log('GET /assets', { count: data.data?.assets?.length, total: data.data?.totalCount }, isValid)
}

export async function testCreateAsset(): Promise<boolean> {
  const data = await fetchJSON('/api/content-dashboard/assets', {
    method: 'POST',
    body: JSON.stringify({
      type: 'email',
      content: 'Test email content for HVAC spring maintenance',
      status: 'draft',
      metadata: { subject: 'Spring HVAC Tips' },
    }),
  })
  const isValid = data.success === true
    && data.data?.id !== undefined
    && data.data?.type === 'email'
  return log('POST /assets (create)', { id: data.data?.id, type: data.data?.type }, isValid)
}

// ---------------------------------------------------------------------------
// Run All
// ---------------------------------------------------------------------------

export async function runAllTests(): Promise<void> {
  console.log('🧪 Running Content System API Tests...\n')

  const results: boolean[] = []

  results.push(await testGetAnalytics())
  results.push(await testListWorkflows())
  results.push(await testTriggerWorkflow())
  results.push(await testCreateBundle())
  results.push(await testListBundles())
  results.push(await testListAssets())
  results.push(await testCreateAsset())

  const passed = results.filter(Boolean).length
  const total = results.length
  console.log(`\n📊 Results: ${passed}/${total} passed`)

  if (passed === total) {
    console.log('🎉 All tests passed!')
  } else {
    console.log(`⚠️ ${total - passed} test(s) failed`)
  }
}
