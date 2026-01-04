#!/bin/bash

# Docker Management Scripts for Linux/Mac

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Build và start tất cả services
start_giapha() {
    echo -e "${GREEN}Starting Gia Pha Version 7...${NC}"
    docker-compose up -d --build
    echo -e "${GREEN}Services started successfully!${NC}"
    echo -e "${CYAN}Frontend: http://localhost${NC}"
    echo -e "${CYAN}Backend API: http://localhost:3000/api${NC}"
}

# Stop tất cả services
stop_giapha() {
    echo -e "${YELLOW}Stopping Gia Pha Version 7...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped successfully!${NC}"
}

# Restart tất cả services
restart_giapha() {
    echo -e "${YELLOW}Restarting Gia Pha Version 7...${NC}"
    docker-compose restart
    echo -e "${GREEN}Services restarted successfully!${NC}"
}

# Xem logs
show_logs() {
    local service=$1
    if [ -n "$service" ]; then
        docker-compose logs -f "$service"
    else
        docker-compose logs -f
    fi
}

# Xem status
show_status() {
    echo -e "${CYAN}Gia Pha Version 7 Status:${NC}"
    docker-compose ps
}

# Rebuild một service cụ thể
rebuild_service() {
    local service=$1
    if [ -z "$service" ]; then
        echo -e "${RED}ERROR: Service name required (backend or frontend)${NC}"
        return 1
    fi
    echo -e "${YELLOW}Rebuilding $service...${NC}"
    docker-compose up -d --build "$service"
    echo -e "${GREEN}$service rebuilt successfully!${NC}"
}

# Clean up
remove_giapha() {
    local include_volumes=$1
    echo -e "${RED}Removing Gia Pha Version 7...${NC}"
    read -p "Are you sure? This will stop and remove all containers. (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ "$include_volumes" = "--volumes" ]; then
            docker-compose down -v
            echo -e "${GREEN}Containers and volumes removed!${NC}"
        else
            docker-compose down
            echo -e "${GREEN}Containers removed! (volumes preserved)${NC}"
        fi
    fi
}

# Backup uploads
backup_uploads() {
    local backup_path=${1:-"./uploads-backup"}
    echo -e "${YELLOW}Backing up uploads to $backup_path...${NC}"
    docker cp giapha-version7-backend:/app/uploads "$backup_path"
    echo -e "${GREEN}Backup completed successfully!${NC}"
}

# Restore uploads
restore_uploads() {
    local backup_path=$1
    if [ -z "$backup_path" ]; then
        echo -e "${RED}ERROR: Backup path required${NC}"
        return 1
    fi
    echo -e "${YELLOW}Restoring uploads from $backup_path...${NC}"
    docker cp "$backup_path/." giapha-version7-backend:/app/uploads/
    echo -e "${GREEN}Restore completed successfully!${NC}"
}

# Check environment
check_environment() {
    echo -e "${CYAN}Checking environment...${NC}"
    
    if [ ! -f ".env" ]; then
        echo -e "${RED}ERROR: .env file not found!${NC}"
        echo -e "${YELLOW}Please create .env file from .env.example${NC}"
        return 1
    fi
    
    if grep -q "mongodb+srv://.*@.*\.mongodb\.net" .env; then
        echo -e "${GREEN}✓ MongoDB URI configured${NC}"
    else
        echo -e "${YELLOW}WARNING: MongoDB URI might not be configured correctly${NC}"
    fi
    
    echo -e "${GREEN}✓ Environment check completed${NC}"
    return 0
}

# Quick start
quick_start() {
    if check_environment; then
        start_giapha
    fi
}

# Show help
show_help() {
    cat << EOF

${CYAN}Gia Pha Version 7 - Docker Management Commands${NC}
===============================================

Quick Start:
  ./docker-management.sh quick-start      # Check environment and start

Basic Commands:
  ./docker-management.sh start            # Build and start all services
  ./docker-management.sh stop             # Stop all services
  ./docker-management.sh restart          # Restart all services
  ./docker-management.sh status           # Show status of all services

Logs:
  ./docker-management.sh logs             # Show all logs (follow mode)
  ./docker-management.sh logs backend     # Show backend logs only
  ./docker-management.sh logs frontend    # Show frontend logs only

Rebuild:
  ./docker-management.sh rebuild backend  # Rebuild backend only
  ./docker-management.sh rebuild frontend # Rebuild frontend only

Backup & Restore:
  ./docker-management.sh backup                    # Backup uploads to ./uploads-backup
  ./docker-management.sh backup /path/to/backup    # Backup to custom path
  ./docker-management.sh restore /path/to/backup   # Restore from backup

Cleanup:
  ./docker-management.sh remove           # Remove containers (keep volumes)
  ./docker-management.sh remove --volumes # Remove containers and volumes

Environment:
  ./docker-management.sh check            # Check .env configuration

EOF
}

# Main script
case "$1" in
    start)
        start_giapha
        ;;
    stop)
        stop_giapha
        ;;
    restart)
        restart_giapha
        ;;
    logs)
        show_logs "$2"
        ;;
    status)
        show_status
        ;;
    rebuild)
        rebuild_service "$2"
        ;;
    remove)
        remove_giapha "$2"
        ;;
    backup)
        backup_uploads "$2"
        ;;
    restore)
        restore_uploads "$2"
        ;;
    check)
        check_environment
        ;;
    quick-start)
        quick_start
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
