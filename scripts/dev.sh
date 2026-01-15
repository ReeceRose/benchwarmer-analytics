#!/bin/bash
set -e

cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    echo "Benchwarmer Analytics Development Script"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start PostgreSQL (default)"
    echo "  stop      Stop all Docker containers"
    echo "  migrate   Run EF Core database migrations"
    echo "  reset     Drop and recreate databases (destroys data)"
    echo "  help      Show this help message"
    echo ""
    echo "Quick Start:"
    echo "  ./scripts/dev.sh         # Start PostgreSQL"
    echo "  ./scripts/dev.sh migrate # Run migrations (after creating them)"
    echo ""
    echo "Then in separate terminals:"
    echo "  dotnet watch run --project server/Benchwarmer.Api --no-hot-reload"
    echo "  cd client && npm run dev"
}

start_postgres() {
    echo -e "${GREEN}Starting PostgreSQL...${NC}"
    docker compose up -d postgres

    echo "Waiting for PostgreSQL to be ready..."
    until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        sleep 1
    done
    echo -e "${GREEN}PostgreSQL is ready!${NC}"
}

cmd_start() {
    start_postgres
    echo ""
    echo "Connection details:"
    echo "  Host:     localhost"
    echo "  Port:     5432"
    echo "  Database: benchwarmer"
    echo "  User:     benchwarmer"
    echo "  Password: benchwarmer"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  Terminal 1: dotnet watch run --project server/Benchwarmer.Api --no-hot-reload"
    echo "  Terminal 2: cd client && npm run dev"
}

cmd_stop() {
    echo -e "${YELLOW}Stopping development environment...${NC}"
    docker compose down
    echo -e "${GREEN}Done!${NC}"
}

cmd_migrate() {
    if ! docker compose ps postgres 2>/dev/null | grep -q "running"; then
        echo -e "${RED}Error: PostgreSQL is not running.${NC}"
        echo "Start it with: ./scripts/dev.sh"
        exit 1
    fi

    echo -e "${GREEN}Running Entity Framework migrations...${NC}"
    dotnet ef database update \
        --project server/Benchwarmer.Data \
        --startup-project server/Benchwarmer.Api
    echo -e "${GREEN}Migrations applied successfully!${NC}"
}

cmd_reset() {
    echo -e "${RED}WARNING: This will delete all data in the development databases!${NC}"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi

    echo -e "${YELLOW}Resetting databases...${NC}"
    docker compose down -v

    start_postgres

    echo ""
    echo -e "${GREEN}Databases have been reset!${NC}"
    echo ""
    echo "Next steps:"
    echo "  ./scripts/dev.sh migrate  # Apply migrations"
}

# Parse command
case "${1:-}" in
    ""|start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    migrate)
        cmd_migrate
        ;;
    reset)
        cmd_reset
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
