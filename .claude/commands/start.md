Start the demo server for the MLDS 2026 presentation and open it in a new Chrome tab.

Run this bash command:

```bash
cd /Users/adharshdhandapani/git/vthink-mlds-demos && kill -9 $(lsof -ti :3000) 2>/dev/null; sleep 1 && node --env-file=demo1-memory-inspector/.env server.js &
sleep 2 && open -na "Google Chrome" --args --new-tab http://localhost:3000
```
