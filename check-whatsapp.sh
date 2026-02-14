#!/bin/bash

# WhatsApp Admin Messaging - Quick Diagnostic Script
# Run this to diagnose messaging issues

echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║   WhatsApp Admin Messaging - Diagnostic Check                  ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""

# Check 1: WhatsApp Bridge Running
echo "1️⃣  Checking WhatsApp Bridge..."
if ps aux | grep -q "whatsapp/index.js" | grep -v grep; then
    echo "✅ WhatsApp bridge is RUNNING"
else
    echo "❌ WhatsApp bridge is NOT running"
    echo "   Fix: In a new terminal, run: pnpm run whatsapp"
    echo ""
fi

# Check 2: Bridge Port Listening
echo "2️⃣  Checking if bridge port 3001 is open..."
if nc -z localhost 3001 2>/dev/null; then
    echo "✅ Port 3001 is OPEN"
else
    echo "❌ Port 3001 is NOT listening"
    echo "   Fix: Start the bridge: pnpm run whatsapp"
    echo ""
fi

# Check 3: Bridge Health
echo "3️⃣  Checking bridge health status..."
STATUS=$(curl -s http://localhost:3001/status 2>/dev/null)
if [ -n "$STATUS" ]; then
    READY=$(echo "$STATUS" | grep -o '"ready"[^,}]*' | grep -o 'true\|false')
    if [ "$READY" = "true" ]; then
        echo "✅ WhatsApp client is READY"
    else
        echo "⚠️  WhatsApp client NOT ready (needs QR scan)"
        echo "   Fix: Go to Admin → Messages → Scan QR code on phone"
        echo ""
    fi
else
    echo "❌ Can't reach bridge at http://localhost:3001"
    echo "   Fix: Make sure bridge is running: pnpm run whatsapp"
    echo ""
fi

# Check 4: .env Configuration
echo "4️⃣  Checking .env configuration..."
if grep -q "WHATSAPP_BRIDGE_URL" .env 2>/dev/null; then
    BRIDGE_URL=$(grep "WHATSAPP_BRIDGE_URL" .env | cut -d'=' -f2)
    echo "✅ WHATSAPP_BRIDGE_URL found: $BRIDGE_URL"
else
    echo "⚠️  WHATSAPP_BRIDGE_URL not in .env (using default: http://localhost:3001)"
fi

# Check 5: Database Connection
echo "5️⃣  Checking database..."
if mysql -u iantar -p1234 -h 127.0.0.1 lab -e "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connection is OK"
    
    # Check admin users
    ADMIN_COUNT=$(mysql -u iantar -p1234 -h 127.0.0.1 lab -se "SELECT COUNT(*) FROM User WHERE isAdmin=1;" 2>/dev/null)
    if [ "$ADMIN_COUNT" -gt 0 ]; then
        echo "✅ Found $ADMIN_COUNT admin user(s)"
    else
        echo "❌ No admin users found"
        echo "   Fix: UPDATE User SET isAdmin=1 WHERE email='your@email.com';"
    fi
else
    echo "❌ Can't connect to database"
    echo "   Check: DATABASE_URL in .env"
fi

# Check 6: Next.js App Running
echo "6️⃣  Checking if Next.js app is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Next.js app is RUNNING"
else
    echo "❌ Next.js app is NOT running"
    echo "   Fix: In another terminal: pnpm dev"
fi

echo ""
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║   Diagnostic Complete                                          ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Full guide: ADMIN_WHATSAPP_MESSAGING_FIX.md"
