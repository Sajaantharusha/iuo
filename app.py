import asyncio
import os
import shutil
import uuid
from typing import Dict, Optional
from fastapi import FastAPI, File, Form, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import ascii_video

app = FastAPI(title="Nightmare Terminal - ASCII Horror Application")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Conversion job registry
jobs: Dict[str, dict] = {}


@app.get("/api/videos")
def list_videos():
    """List available horror videos in workspace and outputs."""
    available = []
    
    # Check root workspace videos
    for fname in os.listdir(BASE_DIR):
        if fname.lower().endswith((".mp4", ".mov", ".avi", ".webm")):
            fpath = os.path.join(BASE_DIR, fname)
            size = os.path.getsize(fpath)
            available.append({
                "id": fname,
                "name": fname,
                "path": f"/media/workspace/{fname}",
                "size_mb": round(size / (1024 * 1024), 2),
                "type": "workspace",
            })

    # Check outputs
    for fname in os.listdir(OUTPUTS_DIR):
        if fname.lower().endswith((".mp4", ".mov", ".avi", ".webm")):
            fpath = os.path.join(OUTPUTS_DIR, fname)
            size = os.path.getsize(fpath)
            available.append({
                "id": fname,
                "name": f"Generated: {fname}",
                "path": f"/media/outputs/{fname}",
                "size_mb": round(size / (1024 * 1024), 2),
                "type": "output",
            })

    return {"videos": available}


@app.get("/media/workspace/{filename}")
def get_workspace_video(filename: str):
    fpath = os.path.join(BASE_DIR, filename)
    if os.path.isfile(fpath):
        return FileResponse(fpath, media_type="video/mp4")
    return JSONResponse(status_code=404, content={"error": "File not found"})


@app.get("/media/outputs/{filename}")
def get_output_video(filename: str):
    fpath = os.path.join(OUTPUTS_DIR, filename)
    if os.path.isfile(fpath):
        return FileResponse(fpath, media_type="video/mp4")
    return JSONResponse(status_code=404, content={"error": "File not found"})


def run_conversion_task(job_id: str, input_path: str, output_path: str, width: int, glow: float, font_size: int, theme: str):
    try:
        jobs[job_id]["status"] = "processing"
        
        def progress(processed: int, total: int, pct: float):
            jobs[job_id]["processed"] = processed
            jobs[job_id]["total"] = total
            jobs[job_id]["progress"] = round(pct, 1)

        ascii_video.convert_video(
            input_path=input_path,
            output_path=output_path,
            width=width,
            font_size=font_size,
            glow=glow,
            theme=theme,
            progress_callback=progress,
        )
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100.0
        jobs[job_id]["output_url"] = f"/media/outputs/{os.path.basename(output_path)}"
    except Exception as exc:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(exc)


@app.post("/api/convert")
async def start_conversion(
    background_tasks: BackgroundTasks,
    video_source: str = Form("preset"), # "preset" or "upload"
    preset_filename: Optional[str] = Form(None),
    upload_file: Optional[UploadFile] = File(None),
    width: int = Form(120),
    glow: float = Form(1.3),
    font_size: int = Form(12),
    theme: str = Form("red"),
):
    job_id = str(uuid.uuid4())[:8]

    if video_source == "upload" and upload_file:
        input_filename = f"{job_id}_{upload_file.filename}"
        input_path = os.path.join(UPLOADS_DIR, input_filename)
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    elif preset_filename:
        # Check workspace or outputs
        candidate = os.path.join(BASE_DIR, preset_filename)
        if not os.path.isfile(candidate):
            candidate = os.path.join(OUTPUTS_DIR, preset_filename)
        if not os.path.isfile(candidate):
            return JSONResponse(status_code=400, content={"error": f"Preset video {preset_filename} not found"})
        input_path = candidate
    else:
        return JSONResponse(status_code=400, content={"error": "No input video provided"})

    output_filename = f"horror_ascii_{theme}_{job_id}.mp4"
    output_path = os.path.join(OUTPUTS_DIR, output_filename)

    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "progress": 0.0,
        "processed": 0,
        "total": 0,
        "output_url": None,
        "error": None,
        "theme": theme,
    }

    background_tasks.add_task(
        run_conversion_task,
        job_id,
        input_path,
        output_path,
        width,
        glow,
        font_size,
        theme,
    )

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/job/{job_id}")
def get_job_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    return job


# Mount static files at root
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import webbrowser
    import threading

    def open_browser():
        import time
        time.sleep(1.2)
        webbrowser.open("http://127.0.0.1:8000")

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)

