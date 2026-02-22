.PHONY: all build run clean install-deps

BINARY_NAME = blunux-installer
SRC_TAURI   = src-tauri
OUTPUT_DIR  = out

all: build

# Build the Tauri binary in release mode
build:
	cd $(SRC_TAURI) && cargo build --release

# Build debug version
debug:
	cd $(SRC_TAURI) && cargo build

# Build the .run self-extracting archive
run: build
	bash build-run.sh

# Run in development mode (requires cargo-tauri)
dev:
	cd $(SRC_TAURI) && cargo tauri dev

# Run clippy lints
lint:
	cd $(SRC_TAURI) && cargo clippy -- -D warnings

# Format code
fmt:
	cd $(SRC_TAURI) && cargo fmt

# Check formatting
fmt-check:
	cd $(SRC_TAURI) && cargo fmt -- --check

# Clean build artifacts
clean:
	cd $(SRC_TAURI) && cargo clean
	rm -rf build/ $(OUTPUT_DIR)/

# Install system dependencies (Arch Linux)
install-deps:
	pacman -S --needed \
		webkit2gtk-4.1 \
		gtk3 \
		libappindicator-gtk3 \
		librsvg \
		base-devel \
		curl \
		wget \
		openssl \
		appmenu-gtk-module \
		makeself

# Check that all dependencies are available
check-deps:
	@echo "Checking dependencies..."
	@pkg-config --exists webkit2gtk-4.1 && echo "  webkit2gtk-4.1: OK" || echo "  webkit2gtk-4.1: MISSING"
	@pkg-config --exists gtk+-3.0 && echo "  gtk3: OK" || echo "  gtk3: MISSING"
	@command -v cargo >/dev/null && echo "  cargo: OK" || echo "  cargo: MISSING"
	@command -v makeself >/dev/null && echo "  makeself: OK" || echo "  makeself: MISSING"

help:
	@echo "Blunux Installer - Build Targets"
	@echo ""
	@echo "  make build        - Build release binary"
	@echo "  make debug        - Build debug binary"
	@echo "  make run          - Build .run self-extracting archive"
	@echo "  make dev          - Run in development mode"
	@echo "  make lint         - Run clippy lints"
	@echo "  make fmt          - Format code"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make install-deps - Install system dependencies (Arch)"
	@echo "  make check-deps   - Check dependency availability"
