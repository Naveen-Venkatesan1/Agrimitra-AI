import os
import sys
import asyncio
import numpy as np
from PIL import Image
import io

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from api.main import (
    load_resources,
    recommend_crop, CropInput,
    predict_soil, SoilInput,
    predict_fertilizer, FertilizerInput,
    predict_yield, YieldInput,
    predict_disease,
    chatbot_context, ChatbotContextInput
)
from fastapi import UploadFile

async def run_tests():
    print("--- INFERENCE TESTS ---")
    await load_resources()
    
    # 1. Crop Test
    try:
        data = CropInput(N=90, P=42, K=43, Temperature=20.8, Humidity=82.0, pH=6.5, Rainfall=202.9)
        res = await recommend_crop(data)
        print(f"Crop: PASS - {res['prediction']}")
    except Exception as e:
        print(f"Crop: FAIL - {e}")
        
    # 2. Soil Test
    try:
        data = SoilInput(pH=6.5, EC=0.2, OC=0.5, N=150, P=25, K=180)
        res = await predict_soil(data)
        print(f"Soil: PASS - {res['prediction']}")
    except Exception as e:
        print(f"Soil: FAIL - {e}")
        
    # 3. Fertilizer Test
    try:
        data = FertilizerInput(Temparature=26.0, Humidity=52.0, Moisture=38.0, Nitrogen=37.0, Potassium=0.0, Phosphorous=0.0)
        res = await predict_fertilizer(data)
        print(f"Fertilizer: PASS - {res['prediction']}")
    except Exception as e:
        print(f"Fertilizer: FAIL - {e}")
        
    # 4. Yield Test
    try:
        data = YieldInput(Item="Rice, paddy", average_rain_fall_mm_per_year=1200, pesticides_tonnes=500, avg_temp=25.5)
        res = await predict_yield(data)
        print(f"Yield: PASS - {res['prediction']}")
    except Exception as e:
        print(f"Yield: FAIL - {e}")
        
    # 5. Disease Test
    try:
        img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)
        upload_file = UploadFile(filename="dummy.jpg", file=img_byte_arr)
        res = await predict_disease(upload_file)
        print(f"Disease: PASS - {res['status']}")
    except Exception as e:
        print(f"Disease: FAIL - {e}")
        
    # 6. Recommendation Test
    try:
        data = ChatbotContextInput(
            query="What is the best treatment?",
            latest_diagnosis={
                "cropName": "Tomato",
                "diseaseName": "Tomato___Bacterial_spot",
                "confidence": 95,
                "healthScore": 45,
                "chemicalTreatment": "Copper fungicide",
                "organicSolution": "Neem oil"
            }
        )
        res = await chatbot_context(data)
        print(f"Recommendation: PASS - {res['status']}")
    except Exception as e:
        print(f"Recommendation: FAIL - {e}")

if __name__ == '__main__':
    asyncio.run(run_tests())
