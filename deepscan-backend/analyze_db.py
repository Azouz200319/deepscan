import sqlite3

conn = sqlite3.connect('deepscan.db')
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables in database:")
for table in tables:
    print(f"  - {table[0]}")

print("\nRow counts per table:")
for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    count = cursor.fetchone()[0]
    print(f"  {table_name}: {count:,} rows")

print("\nTable sizes (approximate):")
for table in tables:
    table_name = table[0]
    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
    row_count = cursor.fetchone()[0]
    
    # Get page count for this table
    cursor.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE name='{table_name}' AND type='table'")
    if cursor.fetchone()[0] > 0:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        print(f"  {table_name}: {row_count:,} rows, {len(columns)} columns")

# Check for large text columns that might be taking space
print("\nChecking for large data in key tables:")
for table_name in ['records', 'staging', 'history', 'forgery_reports', 'audit_results']:
    cursor.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE name='{table_name}' AND type='table'")
    if cursor.fetchone()[0] > 0:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        text_columns = [col[1] for col in columns if 'TEXT' in col[2]]
        if text_columns:
            print(f"  {table_name} has TEXT columns: {text_columns}")

conn.close()
