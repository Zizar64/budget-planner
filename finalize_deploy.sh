#!/bin/bash
# Push artifacts
pct push 104 /tmp/client_dist.tar.gz /opt/budget-planner/client/client_dist.tar.gz
pct push 104 /tmp/budget-planner.service /etc/systemd/system/budget-planner.service

# Setup Client
pct exec 104 -- bash -c "cd /opt/budget-planner/client && rm -rf dist && tar -xzf client_dist.tar.gz"

# Enable Service & Restart
pct exec 104 -- systemctl daemon-reload
pct exec 104 -- systemctl enable budget-planner
pct exec 104 -- systemctl restart budget-planner

# Check Status
pct exec 104 -- systemctl status budget-planner --no-pager
