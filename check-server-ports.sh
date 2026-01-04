#!/bin/bash

# Script kiểm tra các cổng đang sử dụng trên server
# Sử dụng: ssh user@192.168.100.237 'bash -s' < check-server-ports.sh

echo "=========================================="
echo "KIỂM TRA CÁC CỔNG ĐANG SỬ DỤNG"
echo "Server: $(hostname)"
echo "Date: $(date)"
echo "=========================================="
echo ""

# 1. Kiểm tra tất cả các cổng đang LISTEN
echo "📡 1. CÁC CỔNG ĐANG LISTEN:"
echo "----------------------------------------"
sudo netstat -tlnp | grep LISTEN | sort -t: -k2 -n
echo ""

# 2. Kiểm tra Docker containers và ports
echo "🐳 2. DOCKER CONTAINERS VÀ PORTS:"
echo "----------------------------------------"
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
else
    echo "Docker không được cài đặt hoặc không chạy"
fi
echo ""

# 3. Kiểm tra các website trong /opt/websites/sites
echo "🌐 3. CÁC WEBSITE TRONG /opt/websites/sites:"
echo "----------------------------------------"
if [ -d "/opt/websites/sites" ]; then
    for site in /opt/websites/sites/*/; do
        if [ -d "$site" ]; then
            site_name=$(basename "$site")
            echo "📁 $site_name"
            
            # Kiểm tra docker-compose.yml
            if [ -f "$site/docker-compose.yml" ]; then
                echo "   Docker compose:"
                grep -A 2 "ports:" "$site/docker-compose.yml" | grep -E "^\s*-\s*[0-9]" || echo "   No ports mapped"
            fi
            
            # Kiểm tra containers đang chạy
            if command -v docker &> /dev/null; then
                containers=$(docker ps --filter "name=$site_name" --format "{{.Names}}" 2>/dev/null)
                if [ ! -z "$containers" ]; then
                    echo "   Containers running:"
                    echo "$containers" | while read container; do
                        ports=$(docker port "$container" 2>/dev/null)
                        if [ ! -z "$ports" ]; then
                            echo "      $container:"
                            echo "$ports" | sed 's/^/         /'
                        fi
                    done
                fi
            fi
            echo ""
        fi
    done
else
    echo "/opt/websites/sites không tồn tại"
fi
echo ""

# 4. Kiểm tra Nginx/Apache
echo "🌍 4. WEB SERVERS:"
echo "----------------------------------------"
if command -v nginx &> /dev/null; then
    echo "Nginx installed: $(nginx -v 2>&1)"
    sudo netstat -tlnp | grep nginx
fi

if command -v apache2 &> /dev/null; then
    echo "Apache installed: $(apache2 -v 2>&1 | head -1)"
    sudo netstat -tlnp | grep apache
fi
echo ""

# 5. Kiểm tra Cloudflare Tunnel
echo "☁️  5. CLOUDFLARE TUNNEL CONFIG:"
echo "----------------------------------------"
if [ -f "/etc/cloudflared/config.yml" ]; then
    echo "Cloudflare config exists"
    echo "Ingress rules (ports):"
    grep -E "service: http://|service: https://" /etc/cloudflared/config.yml | grep -oE ":[0-9]+" | sort -u
else
    echo "Cloudflare config not found"
fi
echo ""

# 6. Tóm tắt các cổng đang dùng
echo "📊 6. TÓM TẮT CÁC CỔNG ĐANG SỬ DỤNG:"
echo "----------------------------------------"
sudo netstat -tlnp | grep LISTEN | awk '{print $4}' | grep -oE ":[0-9]+$" | sort -u | tr -d ':' | while read port; do
    process=$(sudo netstat -tlnp | grep ":$port " | awk '{print $7}' | cut -d'/' -f2 | head -1)
    printf "Port %5s - %s\n" "$port" "$process"
done
echo ""

# 7. Gợi ý cổng trống
echo "💡 7. GỢI Ý CỔNG TRỐNG CÓ THỂ DÙNG:"
echo "----------------------------------------"
used_ports=$(sudo netstat -tlnp | grep LISTEN | awk '{print $4}' | grep -oE ":[0-9]+$" | tr -d ':' | sort -n)

echo "Checking common web ports..."
for port in 3000 3001 3002 3003 4000 5000 8000 8080 8081 8082 8090 8091 8092 9000; do
    if ! echo "$used_ports" | grep -q "^${port}$"; then
        echo "   ✅ Port $port - Available"
    else
        echo "   ❌ Port $port - In use"
    fi
done
echo ""

echo "=========================================="
echo "HOÀN THÀNH KIỂM TRA"
echo "=========================================="
