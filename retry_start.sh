#!/bin/bash
pct push 104 /tmp/budget-planner.service /etc/systemd/system/budget-planner.service
pct exec 104 -- systemctl daemon-reload
pct exec 104 -- systemctl restart budget-planner
sleep 3
pct exec 104 -- systemctl status budget-planner --no-pager
pct exec 104 -- journalctl -u budget-planner -n 20 --no-pager
