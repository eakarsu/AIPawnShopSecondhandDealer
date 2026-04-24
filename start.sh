#!/bin/bash

# ============================================
# Gold Shield Pawn - Management System
# Start Script with Database Setup & Hot Reload
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}============================================${NC}"
echo -e "${YELLOW}  Gold Shield Pawn - Management System${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ------------------------------------------
# 1. Kill processes on used ports
# ------------------------------------------
echo -e "${BLUE}[1/7] Cleaning up used ports...${NC}"

kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}  Killing processes on port $port: $pids${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo -e "${GREEN}  Port $port is free${NC}"
    fi
}

kill_port 3000
kill_port 3001

# ------------------------------------------
# 2. Check prerequisites
# ------------------------------------------
echo ""
echo -e "${BLUE}[2/7] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}  Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}  Node.js $(node -v) found${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}  PostgreSQL client not found. Please install PostgreSQL${NC}"
    exit 1
fi
echo -e "${GREEN}  PostgreSQL client found${NC}"

# Check if PostgreSQL is running
if ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
    if ! pg_isready -q 2>/dev/null; then
        echo -e "${RED}  PostgreSQL is not running. Please start it manually.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}  PostgreSQL is running${NC}"

# ------------------------------------------
# 3. Load environment variables
# ------------------------------------------
echo ""
echo -e "${BLUE}[3/7] Loading environment...${NC}"

if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
    echo -e "${GREEN}  .env file loaded${NC}"
else
    echo -e "${RED}  .env file not found! Creating default...${NC}"
    cat > "$PROJECT_DIR/.env" << 'ENVEOF'
DATABASE_URL=postgresql://pawnshop_user:pawnshop_pass@localhost:5432/pawnshop_db
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5
JWT_SECRET=pawnshop_jwt_secret_key_2024
BACKEND_PORT=3001
FRONTEND_PORT=3000
ENVEOF
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
    echo -e "${GREEN}  Default .env file created and loaded${NC}"
fi

# ------------------------------------------
# 4. Setup PostgreSQL database
# ------------------------------------------
echo ""
echo -e "${BLUE}[4/7] Setting up PostgreSQL database...${NC}"

# Get current user for PostgreSQL
PG_USER=$(whoami)

# Create role if it doesn't exist
psql -U "$PG_USER" -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='pawnshop_user'" | grep -q 1 || \
    psql -U "$PG_USER" -d postgres -c "CREATE ROLE pawnshop_user WITH LOGIN PASSWORD 'pawnshop_pass' CREATEDB;" 2>/dev/null || true
echo -e "${GREEN}  Database role ready${NC}"

# Create database if it doesn't exist
psql -U "$PG_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='pawnshop_db'" | grep -q 1 || \
    psql -U "$PG_USER" -d postgres -c "CREATE DATABASE pawnshop_db OWNER pawnshop_user;" 2>/dev/null || true
echo -e "${GREEN}  Database ready${NC}"

# Grant privileges
psql -U "$PG_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE pawnshop_db TO pawnshop_user;" 2>/dev/null || true

# Run schema
echo -e "${YELLOW}  Running schema...${NC}"
PGPASSWORD=pawnshop_pass psql -U pawnshop_user -d pawnshop_db -f "$PROJECT_DIR/server/schema.sql" 2>/dev/null || \
    psql -U "$PG_USER" -d pawnshop_db -f "$PROJECT_DIR/server/schema.sql" 2>/dev/null || true
echo -e "${GREEN}  Schema applied${NC}"

# Run seed data
echo -e "${YELLOW}  Seeding database...${NC}"
PGPASSWORD=pawnshop_pass psql -U pawnshop_user -d pawnshop_db -f "$PROJECT_DIR/server/seed.sql" 2>/dev/null || \
    psql -U "$PG_USER" -d pawnshop_db -f "$PROJECT_DIR/server/seed.sql" 2>/dev/null || true
echo -e "${GREEN}  Database seeded with sample data${NC}"

# ------------------------------------------
# 5. Install dependencies
# ------------------------------------------
echo ""
echo -e "${BLUE}[5/7] Installing dependencies...${NC}"

echo -e "${YELLOW}  Installing server dependencies...${NC}"
cd "$PROJECT_DIR/server" && npm install --silent 2>&1 | tail -1
echo -e "${GREEN}  Server dependencies installed${NC}"

echo -e "${YELLOW}  Installing client dependencies...${NC}"
cd "$PROJECT_DIR/client" && npm install --silent 2>&1 | tail -1
echo -e "${GREEN}  Client dependencies installed${NC}"

cd "$PROJECT_DIR"

# ------------------------------------------
# 6. Create uploads directory
# ------------------------------------------
echo ""
echo -e "${BLUE}[6/7] Setting up uploads directory...${NC}"
mkdir -p "$PROJECT_DIR/server/uploads"
echo -e "${GREEN}  Uploads directory ready${NC}"

# ------------------------------------------
# 7. Start servers with hot reload
# ------------------------------------------
echo ""
echo -e "${BLUE}[7/7] Starting servers with hot reload...${NC}"
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  Backend:  http://localhost:${BACKEND_PORT:-3001}${NC}"
echo -e "${GREEN}  Frontend: http://localhost:${FRONTEND_PORT:-3000}${NC}"
echo -e "${CYAN}============================================${NC}"
echo -e "${YELLOW}  Hot reload enabled - changes auto-refresh${NC}"
echo -e "${YELLOW}  Press Ctrl+C to stop all servers${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Trap to kill background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    wait 2>/dev/null || true
    echo -e "${GREEN}All servers stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend with nodemon (hot reload)
cd "$PROJECT_DIR/server"
npx nodemon --watch . --ext js,json --ignore node_modules index.js &
BACKEND_PID=$!

# Start frontend with Vite (hot reload built-in)
cd "$PROJECT_DIR/client"
npx vite --port ${FRONTEND_PORT:-3000} --host &
FRONTEND_PID=$!

cd "$PROJECT_DIR"

echo -e "${GREEN}Servers started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID${NC}"

# Wait for any process to exit
wait
