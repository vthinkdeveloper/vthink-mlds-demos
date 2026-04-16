Stop the demo server.

Run this bash command:

```bash
kill -9 $(lsof -ti :3000) 2>/dev/null && echo "Server stopped." || echo "No server was running."
```
