import sys, json
data = json.load(sys.stdin)
runs = data.get('workflow_runs', [])
print(f'Total runs returned: {len(runs)}')
for r in runs:
    msg = r['head_commit']['message'].split('\n')[0]
    sha = r['head_commit']['id'][:8]
    print(f'  Run #{r["run_number"]}: {sha} | {msg} | status={r["status"]} | conclusion={r["conclusion"]}')
