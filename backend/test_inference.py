import os
import random
import time
import hashlib
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

def compute_image_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        hasher.update(f.read())
    return hasher.hexdigest()

def compute_plant_health_score(disease_name: str, confidence: float, severity: str):
    is_healthy = "healthy" in disease_name.lower()
    if is_healthy:
        score = max(85, min(100, int(98 - (1.0 - confidence) * 10)))
        rating = "Healthy"
    else:
        sev = severity.lower()
        if sev in ["high", "critical", "severe"]:
            score = max(15, min(45, int(45 - confidence * 20)))
        elif sev in ["moderate", "medium"]:
            score = max(40, min(65, int(65 - confidence * 15)))
        else:
            score = max(60, min(79, int(78 - confidence * 12)))
        rating = "Moderate" if score >= 60 else ("Poor" if score >= 40 else "Critical")
    return score, rating

def test_inference():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "models", "disease_model_v1.keras")
    classes_path = os.path.join(base_dir, "models", "disease_classes.txt")
    dataset_dir = os.path.join(base_dir, "..", "datasets", "plant village", "PlantVillage", "train")
    rice_dir = os.path.join(base_dir, "..", "datasets", "rice leaf", "rice_leaf_diseases")

    print("=" * 80)
    print("AGRIMITRA AI - MODEL INFERENCE & QUALITY BENCHMARK TEST")
    print("=" * 80)

    if not os.path.exists(model_path):
        print(f"Error: Trained model file not found at {model_path}")
        return

    print("Loading MobileNetV2 Disease Model...")
    model = load_model(model_path)

    with open(classes_path, "r", encoding="utf-8") as f:
        classes = [line.strip() for line in f.readlines() if line.strip()]

    print(f"Loaded model successfully with {len(classes)} classes.")

    all_images = []
    for root, dirs, files in os.walk(dataset_dir):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                all_images.append(os.path.join(root, file))
                
    if os.path.exists(rice_dir):
        for root, dirs, files in os.walk(rice_dir):
            for file in files:
                if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    all_images.append(os.path.join(root, file))

    if not all_images:
        print("No test images found in datasets directory.")
        return

    print(f"Found {len(all_images)} total dataset images. Selecting 10 sample images randomly...")
    test_images = random.sample(all_images, min(10, len(all_images)))

    results = []
    latencies = []

    print("\nStarting batch inference testing...")
    print("-" * 80)

    for idx, img_path in enumerate(test_images, 1):
        img_hash = compute_image_hash(img_path)
        
        # Preprocessing MUST match training exactly (MobileNetV2 preprocess_input)
        img = image.load_img(img_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0) # 1 x 224 x 224 x 3
        x = preprocess_input(x)

        start_time = time.time()
        preds = model.predict(x, verbose=0)[0]
        end_time = time.time()
        latency = end_time - start_time
        latencies.append(latency)

        class_idx = int(np.argmax(preds))
        pred_class = classes[class_idx]
        confidence = float(preds[class_idx])

        top3_idx = np.argsort(preds)[-3:][::-1]
        top3 = [(classes[i], float(preds[i])) for i in top3_idx]

        is_healthy = "healthy" in pred_class.lower()
        severity = "Low" if is_healthy else ("High" if confidence > 0.85 else "Moderate")
        health_score, rating = compute_plant_health_score(pred_class, confidence, severity)

        results.append(pred_class)

        print(f"\n[SAMPLE #{idx}] File: {os.path.basename(img_path)}")
        print(f"  MD5 Hash:      {img_hash}")
        print(f"  Prediction:    {pred_class}")
        print(f"  Confidence:    {confidence * 100:.2f}%")
        print(f"  Health Score:  {health_score}/100 ({rating})")
        print(f"  Severity:      {severity}")
        print(f"  Latency:       {latency:.4f} seconds")
        print(f"  Top-3 Predictions:")
        for rank, (c, p) in enumerate(top3, 1):
            print(f"    {rank}. {c[:35]:<35} ({p*100:.2f}%)")

    unique_preds = set(results)
    avg_latency = sum(latencies) / len(latencies)

    print("\n" + "=" * 80)
    print(f"BENCHMARK RESULTS: Tested {len(test_images)} images.")
    print(f"• Unique predictions count: {len(unique_preds)}")
    print(f"• Average inference latency: {avg_latency:.4f} seconds.")

    if avg_latency > 3.0:
        print("[FAIL] WARNING: Inference time exceeds 3.0s threshold!")
    else:
        print("[OK] SUCCESS: Latency is within target (< 3 seconds).")

    if len(unique_preds) <= 1:
        print("[FAIL] ERROR: Model produced zero-variance predictions across different images!")
    else:
        print("[OK] SUCCESS: Model produces dynamic, image-specific predictions.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    test_inference()
