#!/bin/sh
# Inject PLAYGROUND_API_KEY into config.js at runtime
cat > /usr/share/nginx/html/config.js <<EOF
window.__PLAYGROUND_API_KEY__ = "${PLAYGROUND_API_KEY:-rew_playground_demo}";
EOF

exec nginx -g "daemon off;"
