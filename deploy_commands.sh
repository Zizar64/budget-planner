pct exec 104 -- runuser -u postgres -- psql -c "CREATE USER budget WITH PASSWORD 'budget';" || true
pct exec 104 -- runuser -u postgres -- psql -c "CREATE DATABASE budget_planner OWNER budget;" || true

pct exec 104 -- bash -c "cd /opt/budget-planner && git stash && git fetch origin && git checkout refactor/js-to-tsx && git pull origin refactor/js-to-tsx"

echo "Building Server..."
pct exec 104 -- bash -c "cd /opt/budget-planner/server && npm install && npm run build"

echo "Building Client..."
pct exec 104 -- bash -c "cd /opt/budget-planner/client && npm install && npm run build"

echo "Stopping old Node processes..."
pct exec 104 -- pkill -f node || true
