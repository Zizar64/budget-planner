# Budget Planner

A personal finance application to track expenses, recurring items, and project future balances.

## 🏗 Architecture

This project has been refactored into a **containerized** application using Docker.

*   **Client**: React 19 + Vite (Port 8080)
*   **Server**: Node.js + Express (Port 3000)
*   **Database**: PostgreSQL 15 (Port 5432)

## 🚀 Getting Started

### Prerequisites

*   **Docker Desktop** (or Docker Engine + Compose)
*   *Make sure ports 8080, 3000, and 5432 are free.*

### Installation & Run

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd Budget_planner
    ```

2.  Start the application:
    ```bash
    docker compose up --build -d
    ```

3.  Access the app:
    *   Frontend: [http://localhost:8080](http://localhost:8080)
    *   Backend API: [http://localhost:3000](http://localhost:3000)

### Default Login

When the database is initialized for the first time, a default admin user is created:

*   **Username**: `admin`
*   **Password**: `admin`

*(You can change the password in the "Paramètres" section after logging in).*

## 🛠 Tech Stack

*   **Frontend**: React, TailwindCSS, Lucide Icons, Recharts, Date-fns.
*   **Backend**: Express, pg (node-postgres), Bcrypt, JWT.
*   **DevOps**: Docker, Docker Compose, Nginx (Client serving).

## 📂 Project Structure

*   `client/`: Frontend source code.
*   `server/`: Backend source code and database logic.
*   `docker-compose.yml`: Service orchestration.
*   `_legacy_backup/`: Old files (SQLite DB, etc.) from previous versions.

## 📝 development

To work on the project locally without Docker (optional):

1.  **Server**: `cd server && npm install && npm run dev` (Requires a running Postgres DB)
2.  **Client**: `cd client && npm install && npm run dev`
