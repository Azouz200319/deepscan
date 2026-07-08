#!/bin/bash

# Quick Start Script for DeepScan Multi-University System
# This script helps you set up and test the multi-university implementation

set -e

echo "🚀 DeepScan Multi-University Quick Start"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Backend Setup
echo -e "${BLUE}Step 1: Setting up Backend...${NC}"
cd deepscan-backend

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate
echo "Installing dependencies..."
poetry install --no-root

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Step 2: Frontend Setup
echo -e "${BLUE}Step 2: Setting up Frontend...${NC}"
cd ../deepscan-frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Step 3: Instructions
echo -e "${BLUE}Step 3: Start the servers${NC}"
echo ""
echo "In Terminal 1 (Backend):"
echo "  cd deepscan-backend"
echo "  source .venv/bin/activate"
echo "  poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "In Terminal 2 (Frontend):"
echo "  cd deepscan-frontend"
echo "  npm run dev"
echo ""

# Step 4: Test URLs
echo -e "${BLUE}Step 4: Test the application${NC}"
echo ""
echo "Once both servers are running:"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""

# Step 5: Create Test Data
echo -e "${BLUE}Step 5: Create Test Data (Optional)${NC}"
echo ""
echo "Run these commands to set up test data:"
echo ""
cat << 'EOF'
# Using Python to insert test data:

import sqlite3
import uuid
from datetime import datetime

db_path = "/tmp/deepscan.db"  # or "/data/app.db" if using Docker
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create University
univ1_id = str(uuid.uuid4())
cursor.execute("""
  INSERT INTO universities (id, name, country, city)
  VALUES (?, ?, ?, ?)
""", (univ1_id, "University of Algiers 1", "Algeria", "Algiers"))

# Create Domain
domain1_id = str(uuid.uuid4())
cursor.execute("""
  INSERT INTO domains (id, university_id, name)
  VALUES (?, ?, ?)
""", (domain1_id, univ1_id, "Engineering"))

# Create Filiere
filiere1_id = str(uuid.uuid4())
cursor.execute("""
  INSERT INTO filieres (id, domain_id, name)
  VALUES (?, ?, ?)
""", (filiere1_id, domain1_id, "Computer Science"))

# Create Student
student1_id = str(uuid.uuid4())
cursor.execute("""
  INSERT INTO students (id, filiere_id, nom_prenom, email, student_id)
  VALUES (?, ?, ?, ?, ?)
""", (student1_id, filiere1_id, "Ahmed Ali", "ahmed@example.com", "STU-001"))

# Create User
user1_id = str(uuid.uuid4())
# Simple SHA-256 hash of "password123"
pwd_hash = "5e884898da28047151d0e56f8dc629286f8d6c518640f52ce3570585ceaaff33"
cursor.execute("""
  INSERT INTO users (id, email, password_hash, university_id, full_name)
  VALUES (?, ?, ?, ?, ?)
""", (user1_id, "user@example.com", pwd_hash, univ1_id, "Test User"))

conn.commit()
conn.close()

print("✓ Test data created successfully!")
print(f"  User ID: {user1_id}")
print(f"  Email: user@example.com")
print(f"  Password: password123")
EOF

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the backend server"
echo "  2. Start the frontend server"
echo "  3. Navigate to http://localhost:5173"
echo "  4. Register or login with test credentials"
echo ""
echo "For detailed documentation, see: IMPLEMENTATION.md"
echo ""
