import { readFileSync } from 'node:fs'

const request = JSON.parse(readFileSync(0, 'utf8'))
const mode = request.conformance_case

if (mode === 'bounded-output') {
  process.stdout.write('x'.repeat(5000))
} else if (mode === 'cancellation') {
  setInterval(() => {}, 1000)
} else if (['fresh', 'repeat', 'partial-parse', 'stale', 'wrong-worktree', 'unknown-schema'].includes(mode)) {
  const provenance = {
    extractor: 'fixture-parser',
    extractor_version: '1.0.0',
    evidence: 'fixture syntax',
    confidence: 'exact',
  }
  const moduleNode = {
    id: 'fixture-extractor:module:root', name: 'root', kind: 'module',
    path: 'src/lib.fixture', span: null, provenance,
  }
  const functionNode = {
    id: 'fixture-extractor:function:root/run', name: 'run', kind: 'function',
    path: 'src/lib.fixture',
    span: { line_start: 2, column_start: 1, line_end: 3, column_end: 2 },
    provenance,
  }
  const state = mode === 'partial-parse' ? 'partial' : mode === 'stale' ? 'stale' : 'fresh'
  const affected_paths = state === 'partial' ? ['src/broken.fixture']
    : state === 'stale' ? ['src/lib.fixture'] : []
  const diagnostics = state === 'partial'
    ? [{ code: 'fixture-parse', severity: 'warning', message: 'partial fixture parse', path: 'src/broken.fixture' }]
    : state === 'stale'
      ? [{ code: 'fixture-stale', severity: 'warning', message: 'fixture source changed', path: 'src/lib.fixture' }]
      : []
  const payload = {
    schema: mode === 'unknown-schema'
      ? 'agent-spec/code-graph-provider/extraction-payload-v99'
      : 'agent-spec/code-graph-provider/extraction-payload-v1',
    provider_id: 'fixture-extractor',
    provider_version: '1.0.0',
    language: 'fixture',
    worktree_id: mode === 'wrong-worktree' ? 'another-worktree' : 'fixture-worktree',
    freshness: {
      state,
      inputs: [{ path: 'src/lib.fixture', fingerprint: 'a'.repeat(64) }],
      affected_paths,
    },
    nodes: mode === 'repeat' ? [moduleNode, functionNode] : [functionNode, moduleNode],
    edges: [{
      from: 'fixture-extractor:module:root',
      to: 'fixture-extractor:function:root/run',
      kind: 'contains',
      provenance,
    }],
    diagnostics,
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`)
} else {
  process.stderr.write('fixture-unknown-case\n')
  process.exitCode = 17
}
