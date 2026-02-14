#!/usr/bin/env bash
# Install system and Node dependencies required by the WhatsApp bridge (whatsapp/index.js).
# Run from project root: ./scripts/install-whatsapp-deps.sh   or   bash scripts/install-whatsapp-deps.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "=== WhatsApp bridge dependencies ==="

# --- 1) System browser (Chromium) for Puppeteer ---
install_chromium() {
  if command -v chromium-browser &>/dev/null || command -v chromium &>/dev/null || command -v google-chrome &>/dev/null; then
    echo "Chromium/Chrome already available: $(command -v chromium-browser 2>/dev/null || command -v chromium 2>/dev/null || command -v google-chrome 2>/dev/null)"
    return 0
  fi

  if command -v apt-get &>/dev/null; then
    echo "Installing Chromium (apt)..."
    sudo apt-get update -qq
    if apt-cache show chromium-browser &>/dev/null; then
      sudo apt-get install -y chromium-browser
    elif apt-cache show chromium &>/dev/null; then
      sudo apt-get install -y chromium
    else
      sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium
    fi
    echo "Chromium installed."
    return 0
  fi

  if command -v dnf &>/dev/null; then
    echo "Installing Chromium (dnf)..."
    sudo dnf install -y chromium
    echo "Chromium installed."
    return 0
  fi

  if command -v brew &>/dev/null; then
    echo "Installing Chromium (Homebrew)..."
    brew install --cask chromium
    echo "Chromium installed."
    return 0
  fi

  echo "Could not install Chromium automatically. Install manually:"
  echo "  Ubuntu/Debian: sudo apt install chromium-browser"
  echo "  Fedora/RHEL:   sudo dnf install chromium"
  echo "  macOS:         brew install --cask chromium"
  echo "Or set PUPPETEER_EXECUTABLE_PATH to your Chrome/Chromium path."
  return 1
}

install_chromium || true

# --- 2) Node dependencies (whatsapp-web.js, puppeteer, qrcode, dotenv) ---
echo ""
echo "Installing Node dependencies..."
if command -v pnpm &>/dev/null; then
  pnpm install
elif command -v npm &>/dev/null; then
  npm install
else
  echo "No pnpm or npm found. Install Node.js and run: pnpm install  or  npm install"
  exit 1
fi

echo ""
echo "=== Done ==="
echo "Start the WhatsApp bridge with:  pnpm run whatsapp   (or  npm run whatsapp)"
echo "Then open the app, go to Messages (admin), and scan the QR code."
