#!/bin/bash
pct exec 104 -- bash -c "cd /opt/budget-planner/server && git pull origin refactor/js-to-tsx && npm install && npm run build"
pct exec 104 -- systemctl restart budget-planner
sleep 2
pct exec 104 -- systemctl status budget-planner --no-pager
pct exec 104 -- journalctl -u budget-planner -n 20 --no-pager
