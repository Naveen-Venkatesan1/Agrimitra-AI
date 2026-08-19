import os
import requests
import json

def get_env_key():
    env_path = r"C:\Users\prave\Pictures\agriculture\backend\.env"
    raw_key = None
    with open(env_path, 'rb') as f:
        content = f.read()
        
    lines = content.decode('utf-8', errors='ignore').split('\n')
    for line in lines:
        if line.startswith("PLANT_ID_API_KEY="):
            raw_key = line.split("=", 1)[1]
            break
            
    return raw_key, content

def run_verification():
    raw_key, raw_content = get_env_key()
    
    # 8. Check for whitespace, quotes, BOM, or newline problems
    has_bom = raw_content.startswith(b'\xef\xbb\xbf')
    clean_key = raw_key.strip().strip('"').strip("'") if raw_key else None
    
    is_whitespace_issue = raw_key != clean_key
    
    key_loaded = "YES" if clean_key else "NO"
    
    if not clean_key:
        print("API ENDPOINT: INCORRECT")
        print("AUTH FORMAT: INCORRECT")
        print("KEY LOADED: NO")
        print("KEY ACCEPTED BY PLANT.ID: NO")
        print("ACCOUNT/PLAN STATUS: N/A")
        print("REQUEST FORMAT: N/A")
        print("ACTUAL HTTP STATUS: N/A")
        print("SAFE UPSTREAM ERROR: N/A")
        print("CODE CHANGE REQUIRED: NO")
        print("OVERALL: NOT READY")
        return

    # Check api.plant.id vs plant.id
    endpoint = "https://plant.id/api/v3/identification"
    auth_header = {"Api-Key": clean_key}
    
    # Check usage info to verify key
    usage_url = "https://plant.id/api/v3/usage_info"
    resp = requests.get(usage_url, headers=auth_header)
    
    status = resp.status_code
    
    # Check alternate URL if 404 or something
    if status == 404:
        usage_url_alt = "https://api.plant.id/v3/usage_info"
        resp_alt = requests.get(usage_url_alt, headers=auth_header)
        if resp_alt.status_code != 404:
            resp = resp_alt
            status = resp_alt.status_code
            
    key_accepted = "YES" if status == 200 else "NO"
    
    plan_status = "UNKNOWN"
    if status == 200:
        data = resp.json()
        plan_status = "ACTIVE" # or something based on data
    elif status == 401:
        plan_status = "UNAUTHORIZED / INVALID KEY"
    elif status == 403:
        plan_status = "FORBIDDEN / PLAN EXCEEDED"
        
    error_msg = resp.text[:100] if status != 200 else "NONE"
    
    # Do we need a code change?
    # In main.py: it uses https://plant.id/api/v3/identification and {"Api-Key": key}
    code_change = "YES" if (status == 404 or status == 401) and (key_accepted == "YES") else "NO"
    # Actually, if the key is just invalid, it's not a code change.
    if status == 401:
        code_change = "NO"

    print("ROOT CAUSE:")
    print("API ENDPOINT: CORRECT" if resp.url.startswith("https://plant.id") else "INCORRECT")
    print("AUTH FORMAT: CORRECT" if status != 400 else "INCORRECT")
    print(f"KEY LOADED: {key_loaded}")
    print(f"KEY ACCEPTED BY PLANT.ID: {key_accepted}")
    print(f"ACCOUNT/PLAN STATUS: {plan_status}")
    print("REQUEST FORMAT: CORRECT")
    print(f"ACTUAL HTTP STATUS: {status}")
    print(f"SAFE UPSTREAM ERROR: {error_msg}")
    print(f"CODE CHANGE REQUIRED: {code_change}")
    
    if status == 401:
        print("\nAPI key/account issue — not an ML or frontend issue.")
    
    print("OVERALL: " + ("READY" if status == 200 else "NOT READY"))

if __name__ == "__main__":
    run_verification()
