import sqlite3

conn = sqlite3.connect('deepscan.db')
cursor = conn.cursor()

# Get database page size and page count
cursor.execute("PRAGMA page_size")
page_size = cursor.fetchone()[0]
cursor.execute("PRAGMA page_count")
page_count = cursor.fetchone()[0]
print(f"Database size: {page_size * page_count / (1024*1024):.2f} MB")
print(f"Page size: {page_size} bytes")
print(f"Page count: {page_count}\n")

# Analyze each table's data size
print("Analyzing data size per table:")
for table_name in ['forgery_reports', 'audit_results', 'records', 'staging', 'history']:
    cursor.execute(f"SELECT COUNT(*) FROM sqlite_master WHERE name='{table_name}' AND type='table'")
    if cursor.fetchone()[0] > 0:
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row_count = cursor.fetchone()[0]
        
        if row_count > 0:
            # Get the size of JSON/text columns
            if table_name == 'forgery_reports':
                cursor.execute("SELECT LENGTH(results_json) FROM forgery_reports WHERE results_json IS NOT NULL")
                sizes = cursor.fetchall()
                total_size = sum(s[0] for s in sizes)
                avg_size = total_size / len(sizes) if sizes else 0
                print(f"  {table_name}: {row_count} rows")
                print(f"    results_json total: {total_size / (1024*1024):.2f} MB, avg: {avg_size / 1024:.2f} KB per row")
            
            elif table_name == 'audit_results':
                cursor.execute("SELECT LENGTH(extracted_json), LENGTH(forgery_details_json) FROM audit_results")
                sizes = cursor.fetchall()
                extracted_total = sum(s[0] for s in sizes if s[0])
                forgery_total = sum(s[1] for s in sizes if s[1])
                print(f"  {table_name}: {row_count} rows")
                print(f"    extracted_json total: {extracted_total / (1024*1024):.2f} MB")
                print(f"    forgery_details_json total: {forgery_total / (1024*1024):.2f} MB")
            
            elif table_name == 'records':
                cursor.execute("SELECT LENGTH(raw_ocr_text) FROM records WHERE raw_ocr_text IS NOT NULL")
                sizes = cursor.fetchall()
                total_size = sum(s[0] for s in sizes)
                avg_size = total_size / len(sizes) if sizes else 0
                print(f"  {table_name}: {row_count} rows")
                print(f"    raw_ocr_text total: {total_size / 1024:.2f} KB, avg: {avg_size / 1024:.2f} KB per row")
            
            elif table_name == 'staging':
                cursor.execute("SELECT LENGTH(raw_ocr_text), LENGTH(verify_diff_json) FROM staging")
                sizes = cursor.fetchall()
                ocr_total = sum(s[0] for s in sizes if s[0])
                diff_total = sum(s[1] for s in sizes if s[1])
                print(f"  {table_name}: {row_count} rows")
                print(f"    raw_ocr_text total: {ocr_total / 1024:.2f} KB")
                print(f"    verify_diff_json total: {diff_total / 1024:.2f} KB")

conn.close()
