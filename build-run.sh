#!/usr/bin/env bash
#
# Build blunux-installer.run using makeself
#
# This script:
# 1. Builds the Tauri app in release mode
# 2. Packages the binary into a self-extracting .run archive via makeself
#
# Prerequisites:
#   - Rust toolchain (cargo, rustc)
#   - System libraries: webkit2gtk, gtk3, etc.
#   - makeself (pacman -S makeself)
#
# Usage:
#   ./build-run.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
PAYLOAD_DIR="${BUILD_DIR}/payload"
OUTPUT_DIR="${SCRIPT_DIR}/out"
BINARY_NAME="blunux-installer"

echo "=== Building Blunux Installer ==="

# Step 1: Build Tauri app in release mode
echo "[1/3] Building Tauri application..."
cd "${SCRIPT_DIR}/src-tauri"
cargo build --release

BINARY_PATH="${SCRIPT_DIR}/src-tauri/target/release/${BINARY_NAME}"

if [ ! -f "${BINARY_PATH}" ]; then
    echo "ERROR: Binary not found at ${BINARY_PATH}"
    exit 1
fi

echo "Binary size: $(du -h "${BINARY_PATH}" | cut -f1)"

# Step 2: Prepare payload directory
echo "[2/3] Preparing payload..."
rm -rf "${PAYLOAD_DIR}"
mkdir -p "${PAYLOAD_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Copy binary
cp "${BINARY_PATH}" "${PAYLOAD_DIR}/${BINARY_NAME}"
chmod 755 "${PAYLOAD_DIR}/${BINARY_NAME}"

# Create startup script that makeself will execute
cat > "${PAYLOAD_DIR}/startup.sh" << 'STARTUP'
#!/usr/bin/env bash
set -euo pipefail

SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
BINARY="${SELF_DIR}/blunux-installer"

# Ensure running as root
if [ "$(id -u)" -ne 0 ]; then
    echo "Blunux Installer must be run as root."
    echo "Usage: sudo ./blunux-installer.run"
    exit 1
fi

# Check for display server
if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
    echo "ERROR: No display server detected. Please run from a graphical environment."
    exit 1
fi

# Check for WebKitGTK
if ! pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    echo "ERROR: webkit2gtk-4.1 is required. Install it with:"
    echo "  pacman -S webkit2gtk-4.1"
    exit 1
fi

echo "Starting Blunux Installer..."
exec "${BINARY}"
STARTUP
chmod 755 "${PAYLOAD_DIR}/startup.sh"

# Step 3: Build .run with makeself
echo "[3/3] Creating self-extracting archive..."

# Check for makeself
if ! command -v makeself &>/dev/null; then
    echo "ERROR: makeself not found. Install with: pacman -S makeself"
    exit 1
fi

makeself \
    --gzip \
    --nox11 \
    "${PAYLOAD_DIR}" \
    "${OUTPUT_DIR}/${BINARY_NAME}.run" \
    "Blunux Linux Installer" \
    ./startup.sh

echo ""
echo "=== Build Complete ==="
echo "Output: ${OUTPUT_DIR}/${BINARY_NAME}.run"
echo "Size:   $(du -h "${OUTPUT_DIR}/${BINARY_NAME}.run" | cut -f1)"
echo ""
echo "To install on the live ISO:"
echo "  cp ${OUTPUT_DIR}/${BINARY_NAME}.run /path/to/profile/airootfs/usr/local/bin/"
