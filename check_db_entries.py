import sqlite3
import pandas as pd

conn = sqlite3.connect('backend/auditiq.db')

print('--- Tally Entries (Perfios) ---')
df_tally = pd.read_sql_query("SELECT id, voucher_date, party_name, amount, payment_mode FROM tally_entries WHERE party_name LIKE '%PERFIOS%' LIMIT 5", conn)
print(df_tally)

print('\n--- Bank Entries (Perfios) ---')
df_bank = pd.read_sql_query("SELECT id, transaction_date, description, debit, credit FROM bank_entries WHERE description LIKE '%PERFIOS%' LIMIT 5", conn)
print(df_bank)

print('\n--- Tally Entries (Sundery) ---')
df_tally = pd.read_sql_query("SELECT id, voucher_date, party_name, amount, payment_mode FROM tally_entries WHERE party_name LIKE '%Sundery%' LIMIT 5", conn)
print(df_tally)

print('\n--- Bank Entries (Sundery matching amounts) ---')
df_bank = pd.read_sql_query("SELECT id, transaction_date, description, debit, credit FROM bank_entries WHERE credit IN (365, 9000) LIMIT 5", conn)
print(df_bank)

conn.close()
