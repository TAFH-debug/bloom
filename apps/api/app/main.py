from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import activity, auth, garden, habits, preferences, status
from app.ws import websocket_endpoint

app = FastAPI(title="Bloom API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(habits.router)
app.include_router(garden.router)
app.include_router(status.router)
app.include_router(preferences.router)
app.include_router(activity.router)

app.websocket("/ws")(websocket_endpoint)


@app.get("/")
def root():
    return {"app": "bloom-api", "version": "0.1.0"}
