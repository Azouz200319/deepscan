import sqlite3
import hashlib

def sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()

# Common passwords to try
common_passwords = [
    "password", "password123", "123456", "1234567890",
    "admin", "admin123", "test", "test123",
    "azzouz", "azouzmohamed", "mohamed", "1902",
    "azzouz1902", "deepscan", "deepscan123",
    "qwerty", "abc123", "letmein", "welcome",
    "azouzmohamed1902", "moahmed", "azzouz123",
    "123", "12345", "000000"
]

conn = sqlite3.connect("deepscan.db")
conn.row_factory = sqlite3.Row

users = conn.execute("SELECT email, password_hash FROM users").fetchall()
conn.close()

print("=" * 70)
print("  PASSWORD LOOKUP")
print("=" * 70)

for u in users:
    print(f"\n  Email : {u['email']}")
    print(f"  Hash  : {u['password_hash']}")
    found = False
    for pw in common_passwords:
        if sha256(pw) == u['password_hash']:
            print(f"  ✅ Password FOUND : '{pw}'")
            found = True
            break
    if not found:
        print(f"  ⚠️  Password not in common list (custom password)")

print("\nDone.")
