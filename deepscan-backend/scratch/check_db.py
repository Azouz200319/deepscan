import sqlite3
import os

DB_PATH = "deepscan.db"

def check_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM forgery_reports").fetchall()
        print(f"Found {len(rows)} forgery reports.")
        for row in rows:
            print(f"ID: {row['id']}, Filename: {row['filename']}, Verdict: {row['verdict']}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_db()
