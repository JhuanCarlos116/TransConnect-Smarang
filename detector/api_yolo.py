from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import shutil
import os


PORT = int(os.environ.get("PORT", 8000))

app = FastAPI()

# Allow requests from other websites or clients during development/testing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use your trained model file here.
# Make sure this file exists in the same folder as this script.
model = YOLO(os.path.join(os.path.dirname(__file__), "best (1).pt"))


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    file_path = f"temp_{file.filename}"

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        results = model(file_path)

        detections = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                detections.append(
                    {
                        "class": model.names[class_id],
                        "confidence": round(confidence, 4),
                    }
                )

        return {
            "success": True,
            "detections": detections,
        }
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.get("/")
def root():
    return {"message": "YOLO API is running. Use POST /detect with an image file."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_yolo:app", host="0.0.0.0", port=PORT)
