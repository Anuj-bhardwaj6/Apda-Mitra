import uvicorn
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("Starting Apda-Mitra Backend API on http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
