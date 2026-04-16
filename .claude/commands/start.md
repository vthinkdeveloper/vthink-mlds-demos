Start the demo server for the MLDS 2026 presentation.

Run this bash command:

```bash
cd /Users/adharshdhandapani/git/vthink-mlds-demos && kill -9 $(lsof -ti :3000) 2>/dev/null; sleep 1 && node --env-file=demo1-memory-inspector/.env server.js &
sleep 2 && curl -s -o /dev/null -w "Server running at http://localhost:3000 (status: %{http_code})\n" http://localhost:3000
```
