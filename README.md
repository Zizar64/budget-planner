# Budget Planner

A personal finance management application built with React, Vite, Express, and Better-SQLite3.

## Features

- **Dashboard**: Visual overview of your finances with projections.
- **Transactions**: Track expenses and income.
- **Recurring Items**: Manage subscriptions and regular bills.
- **Savings Goals**: Set and track savings targets.
- **Secure**: User authentication with bcrypt password hashing.

## Deployment on Proxmox (LXC)

### Prerequisites

- Debian 12 LXC Container
- Node.js 22+
- Git

### Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Zizar64/budget-planner /opt/budget-planner
   cd /opt/budget-planner
   ```

2. Run the setup script:

   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

### Updating the Application

To update to the latest version, run the update script locally on the server:

```bash
cd /opt/budget-planner
chmod +x scripts/update.sh
./scripts/update.sh
```

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev` (Runs backend on port 3000 and frontend on 5173 with proxy)

## Security

- Default admin user is removed.
- Initial user creation is handled during setup.
- Passwords are hashed using bcrypt.
