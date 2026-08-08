import os
import requests
import json

BASE_URL = "http://localhost:8000"

def test_api_pipeline():
    print("="*80)
    print("TESTING FASTAPI ML ENDPOINTS (/predict-disease & /chatbot-context)")
    print("="*80)

    dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets", "plant village", "PlantVillage", "train"))
    
    # Pick 2 different image samples
    sample_classes = ["Apple___Apple_scab", "Tomato___healthy"]
    test_files = []

    for cls in sample_classes:
        cls_dir = os.path.join(dataset_dir, cls)
        if os.path.exists(cls_dir):
            imgs = [f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            if imgs:
                test_files.append((cls, os.path.join(cls_dir, imgs[0])))

    if not test_files:
        print("Error: Could not locate test images.")
        return

    latest_diag = None

    for cls_name, file_path in test_files:
        print(f"\n[TESTING /predict-disease FOR SAMPLE: {cls_name}]")
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "image/jpeg")}
            res = requests.post(f"{BASE_URL}/predict-disease", files=files)
            
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            latest_diag = data
            print(f"Success: {data.get('success')}")
            print(f"Crop: {data.get('crop')}")
            print(f"Disease: {data.get('disease')}")
            print(f"Confidence: {data.get('confidence')}%")
            print(f"Health Score: {data.get('health_score')}/100 ({data.get('health_rating')})")
            print(f"Severity: {data.get('severity')}")
            print(f"Immediate Precautions: {data.get('precautions')}")
            print(f"Treatment: {data.get('treatment')}")
            print(f"Top Predictions: {data.get('top_predictions')}")
        else:
            print(f"Error Response: {res.text}")

    # Test /chatbot-context with latest_diag
    if latest_diag:
        print("\n" + "="*80)
        print("TESTING /chatbot-context WITH LATEST DIAGNOSIS")
        print("="*80)
        
        chat_queries = [
          "How do I prevent this disease in my field?",
          "What organic pesticide should I spray for this?",
          "What is the chemical treatment for my crop?"
        ]

        for query in chat_queries:
            chat_payload = {
                "query": query,
                "latest_diagnosis": latest_diag
            }
            chat_res = requests.post(f"{BASE_URL}/chatbot-context", json=chat_payload)
            print(f"\nQuery: '{query}'")
            print(f"Status: {chat_res.status_code}")
            if chat_res.status_code == 200:
                print(f"Bot Answer: {chat_res.json().get('answer')}")
            else:
                print(f"Chat Error: {chat_res.text}")

if __name__ == "__main__":
    test_api_pipeline()
