# Restricted investigation trial

Use $debug. Diagnose this intermittent checkout delay from the captured evidence
below. Do not edit application files or access production. Local code and further
captures are unavailable. Explain what the evidence supports and a useful next
experiment we can run under these constraints.

After release 82, our 12-minute load run's p95 grew from 310 ms to 1,600 ms.
Release 81 ran at 30 requests/sec against 10,000 orders with warm caches.
Release 82 ran at 45 requests/sec against 15,000 orders after a cold restart.
Both used four workers and the same database host. Most requests still finish
under 300 ms; occasional outliers reach 4 seconds.

Two captured traces from release 82:

| Request | Total | SQL calls | SQL time | Connection acquisition wait |
| --- | ---: | ---: | ---: | ---: |
| c401 | 220 ms | 4 | 70 ms | 2 ms |
| c402 | 3,900 ms | 4 | 74 ms | 3,500 ms |

There is no local reproduction command. We can run one more representative
12-minute load experiment tomorrow with ordinary existing telemetry. Production
instrumentation changes are not authorized.
