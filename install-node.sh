#!/bin/bash

echo "Installing Node.js for Basic Finance..."
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    echo "This will require your password for sudo access."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [ -f /opt/homebrew/bin/brew ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Install Node.js
echo ""
echo "Installing Node.js..."
brew install node

# Verify installation
echo ""
echo "Verifying installation..."
node --version
npm --version

echo ""
echo "✅ Node.js installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3000 in your browser"

