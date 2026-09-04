import uvicorn
import os
import sys

# Ensure the parent directory is in the path so 'backend.api' works
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    print("Starting AgriMitra AI Backend Engine...")
    # Run the FastAPI app
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
