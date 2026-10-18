async function verifyBrowserFlow() {
  console.log('=== 1. VERIFYING HEALTH CHECK ===');
  const healthRes = await fetch('http://localhost:5000/api/v1/health');
  const health = await healthRes.json();
  console.log('Health HTTP Status:', healthRes.status);
  console.log('Health Payload:', health);

  console.log('\n=== 2. VERIFYING POST /api/v1/analyze ===');
  const analyzeRes = await fetch('http://localhost:5000/api/v1/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changedFiles: ['server/models/user.js'] }),
  });
  const analyze = await analyzeRes.json();
  console.log('Analyze HTTP Status:', analyzeRes.status);
  console.log('Analysis ID:', analyze.data.analysisId);
  console.log('Summary:', analyze.data.summary);

  const id = analyze.data.analysisId;

  console.log('\n=== 3. VERIFYING GET /api/v1/analyses/:id/graph ===');
  const graphRes = await fetch(`http://localhost:5000/api/v1/analyses/${id}/graph`);
  const graph = await graphRes.json();
  console.log('Graph HTTP Status:', graphRes.status);
  console.log('Total Nodes:', graph.data.nodes.length);
  console.log('Total Edges:', graph.data.edges.length);
  console.log('ELK Node Bounds:', graph.data.bounds);

  console.log('\n=== 4. VERIFYING GET /api/v1/analyses/:id/impact ===');
  const impactRes = await fetch(`http://localhost:5000/api/v1/analyses/${id}/impact`);
  const impact = await impactRes.json();
  console.log('Impact HTTP Status:', impactRes.status);
  console.log('All Findings Count:', impact.data.allFindings.length);
  impact.data.allFindings.forEach((f) => {
    console.log(`  -> [${f.severity} Lv ${f.depth}] ${f.affectedFile} (Line ${f.evidence?.location?.startLine})`);
  });

  console.log('\n=== 5. VERIFYING GET /api/v1/analyses/:id/explain ===');
  const explainRes = await fetch(`http://localhost:5000/api/v1/analyses/${id}/explain`);
  const explain = await explainRes.json();
  console.log('Explain HTTP Status:', explainRes.status);
  console.log('Risk Level:', explain.data.riskLevel);
  console.log('Executive Summary:', explain.data.executiveSummary);
  console.log('Action Items Count:', explain.data.actionItems.length);
  console.log('PR Markdown Length:', explain.data.prCommentMarkdown.length, 'chars');

  console.log('\n=== 6. VERIFYING STATIC JS & CSS ASSETS DELIVERY ===');
  const htmlRes = await fetch('http://localhost:5000/');
  const html = await htmlRes.text();
  console.log('HTML loaded length:', html.length, 'bytes');

  // Extract assets from HTML
  const jsMatches = [...html.matchAll(/\/assets\/[^"'\s>]+\.js/g)].map((m) => m[0]);
  const cssMatches = [...html.matchAll(/\/assets\/[^"'\s>]+\.css/g)].map((m) => m[0]);

  console.log('JS Bundle referenced:', jsMatches[0] || 'NOT FOUND');
  console.log('CSS Bundle referenced:', cssMatches[0] || 'NOT FOUND');

  if (jsMatches[0]) {
    const jsRes = await fetch(`http://localhost:5000${jsMatches[0]}`);
    console.log(`JS Bundle HTTP Status: ${jsRes.status} (Content-Type: ${jsRes.headers.get('content-type')})`);
  }
  if (cssMatches[0]) {
    const cssRes = await fetch(`http://localhost:5000${cssMatches[0]}`);
    console.log(`CSS Bundle HTTP Status: ${cssRes.status} (Content-Type: ${cssRes.headers.get('content-type')})`);
  }
}

await verifyBrowserFlow();
