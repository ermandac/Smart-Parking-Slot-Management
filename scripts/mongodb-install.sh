#!/bin/bash

# MongoDB Installation Script with Multiple Methods

set -e

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    else
        echo "unknown"
    fi
}

# Install Docker method
install_docker_mongodb() {
    echo "Installing MongoDB via Docker..."
    
    # Install Docker
    if ! command_exists docker; then
        echo "Docker not found. Installing Docker..."
        sudo apt-get update
        sudo apt-get install -y docker.io
        sudo systemctl start docker
        sudo systemctl enable docker
    fi

    # Pull and run MongoDB
    sudo docker pull mongo:latest
    sudo docker run -d -p 27017:27017 --name mongodb mongo:latest
    
    echo "MongoDB Docker container installed and running."
}

# Install traditional MongoDB method
install_traditional_mongodb() {
    echo "Installing MongoDB via traditional method..."
    
    # Import MongoDB public GPG key
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    
    # Create list file for MongoDB
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Update package database
    sudo apt-get update
    
    # Install MongoDB packages
    sudo apt-get install -y mongodb-org
    
    # Start and enable MongoDB service
    sudo systemctl start mongod
    sudo systemctl enable mongod
    
    echo "MongoDB installed and running."
}

# Main installation logic
main() {
    local distro
    distro=$(detect_distro)
    
    echo "Detected Linux distribution: $distro"
    
    # Attempt Docker method first
    if command_exists docker; then
        install_docker_mongodb
    else
        # Fallback to traditional method
        install_traditional_mongodb
    fi
    
    # Verify MongoDB connection
    echo "Verifying MongoDB connection..."
    if command_exists mongosh; then
        mongosh --eval "db.runCommand({connectionStatus: 1})"
    else
        echo "MongoDB shell not available. Please verify installation manually."
    fi
}

# Run the main function
main

echo "MongoDB installation completed."
