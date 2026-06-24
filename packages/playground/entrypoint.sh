#!/bin/sh
# Inject runtime config into config.js
cat > /usr/share/nginx/html/config.js <<EOF
window.__PLAYGROUND_API_KEY__ = "${PLAYGROUND_API_KEY:-rew_playground_demo}";
window.__DASHBOARD_URL__ = "${DASHBOARD_URL:-http://localhost:3010}";
EOF

exec nginx -g "daemon off;"
