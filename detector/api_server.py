"""TransConnect infrastructure detector API."""

import os
import time

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from models.common import DetectMultiBackend
from utils.augmentations import letterbox
from utils.general import non_max_suppression, scale_boxes

DEVICE = torch.device("cpu")
WEIGHTS = os.environ.get("MODEL_PATH", "/app/best (1).pt")
IMGSZ = int(os.environ.get("IMGSZ", "640"))
CONF_THRES = 0.25
IOU_THRES = 0.45

model = DetectMultiBackend(WEIGHTS, device=DEVICE, fuse=True)
stride = model.stride
names = model.names
model.eval()
print(f"[api] Model loaded: {WEIGHTS} | {len(names)} classes | stride {stride}", flush=True)
print(f"[api] Classes: {names}", flush=True)

app = FastAPI(title="TransConnect YOLOv5 Detection API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def run_inference(img_bgr, conf_thres=CONF_THRES, iou_thres=IOU_THRES):
    t0 = time.perf_counter()
    img = letterbox(img_bgr, (IMGSZ, IMGSZ), stride=stride, auto=True)[0]
    img = img.transpose((2, 0, 1))[::-1]
    img = np.ascontiguousarray(img)
    tensor = torch.from_numpy(img).to(DEVICE)
    tensor = tensor.float() / 255.0
    if tensor.ndim == 3:
        tensor = tensor[None]
    pred = model(tensor)
    det = non_max_suppression(pred, conf_thres, iou_thres, max_det=1000)[0]
    if det is not None and len(det):
        det[:, :4] = scale_boxes(tensor.shape[2:], det[:, :4], img_bgr.shape).round()
    results = []
    if det is not None and len(det):
        for *xyxy, conf, cls in reversed(det):
            x1, y1, x2, y2 = (int(v) for v in xyxy)
            results.append({
                "class": names[int(cls)],
                "class_id": int(cls),
                "confidence": round(float(conf), 4),
                "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            })
    return results, (time.perf_counter() - t0) * 1000


def draw_boxes(img_bgr, detections):
    annotated = img_bgr.copy()
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255), (128, 0, 128), (0, 128, 128), (128, 128, 0)]
    for d in detections:
        b = d["bbox"]
        color = colors[d["class_id"] % len(colors)]
        cv2.rectangle(annotated, (b["x1"], b["y1"]), (b["x2"], b["y2"]), color, 2)
        label = f"{d['class']} {d['confidence']:.2f}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (b["x1"], b["y1"] - th - 6), (b["x1"] + tw + 6, b["y1"]), color, -1)
        cv2.putText(annotated, label, (b["x1"] + 3, b["y1"] - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    return annotated


def read_image(file):
    data = file.file.read()
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Send JPG/PNG/WebP bytes.")
    return img


@app.get("/")
def root():
    return {
        "service": "TransConnect YOLOv5 Detection API",
        "model": WEIGHTS,
        "classes": names,
        "endpoints": {
            "detect": "POST /detect (multipart file) -> JSON",
            "annotated": "POST /detect/annotated -> JPEG with boxes",
            "health": "GET /health",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "model": WEIGHTS, "classes": names, "device": str(DEVICE), "classes_count": len(names)}


@app.post("/detect")
async def detect(file: UploadFile = File(...), conf: float = CONF_THRES):
    try:
        img = read_image(file)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    detections, elapsed_ms = run_inference(img, conf_thres=conf)
    return {
        "success": True,
        "filename": file.filename,
        "image_size": {"width": img.shape[1], "height": img.shape[0]},
        "inference_ms": round(elapsed_ms, 1),
        "count": len(detections),
        "detections": detections,
    }


@app.post("/detect/annotated")
async def detect_annotated(file: UploadFile = File(...), conf: float = CONF_THRES):
    try:
        img = read_image(file)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    detections, elapsed_ms = run_inference(img, conf_thres=conf)
    ok, jpg = cv2.imencode(".jpg", draw_boxes(img, detections), [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        return JSONResponse(status_code=500, content={"success": False, "error": "JPEG encode failed"})
    return Response(
        content=jpg.tobytes(),
        media_type="image/jpeg",
        headers={"X-Detection-Count": str(len(detections)), "X-Inference-Ms": str(round(elapsed_ms, 1))},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
