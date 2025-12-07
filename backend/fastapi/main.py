from fastapi import FastAPI, Depends, HTTPException
from httpx import AsyncClient
import os, time
from pydantic import BaseModel
from typing import Optional

# Environment variables
ARTLIST_API = os.getenv("ARTLIST_API_BASE", "https://api.artlist.io")
CID = os.getenv("ARTLIST_CLIENT_ID")
SECRET = os.getenv("ARTLIST_CLIENT_SECRET")

app = FastAPI(title="Music Service")

# Simple in-memory cache for token
token_cache = {"token": None, "exp": 0}

async def get_token():
    # Return valid cached token if available
    if token_cache["token"] and token_cache["exp"] > time.time():
        return token_cache["token"]

    if not CID or not SECRET:
        raise HTTPException(500, "Artlist credentials not configured")

    async with AsyncClient() as client:
        try:
            r = await client.post(
                f"{ARTLIST_API}/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": CID,
                    "client_secret": SECRET,
                },
            )
            if r.status_code != 200:
                print(f"Auth failed: {r.text}")
                raise HTTPException(401, "Auth failed")

            data = r.json()
            token_cache["token"] = data["access_token"]
            token_cache["exp"] = time.time() + data.get("expires_in", 3600) - 30
            return token_cache["token"]
        except Exception as e:
            print(f"Token error: {str(e)}")
            raise HTTPException(500, f"Token generation failed: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/search")
async def search_tracks(q: str, limit: int = 10):
    try:
        token = await get_token()
    except HTTPException:
        # Fallback for now if credentials aren't set
        return {"results": [], "message": "Artlist credentials missing"}

    async with AsyncClient() as client:
        r = await client.get(
            f"{ARTLIST_API}/songs",
            headers={"Authorization": f"Bearer {token}"},
            params={"query": q, "limit": limit},
        )
        if r.status_code != 200:
             raise HTTPException(r.status_code, "Search failed")
        return r.json()


@app.post("/download/{song_id}")
async def download(song_id: str):
    token = await get_token()
    async with AsyncClient() as client:
        r = await client.post(
            f"{ARTLIST_API}/songs/{song_id}/download",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code != 200:
            raise HTTPException(r.status_code, "Download failed")
        return r.json()
