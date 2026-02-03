import datetime
import json
import uuid
import sys
from typing import Iterable

import asyncio
from fastapi import FastAPI, Request
from sse_starlette.sse import EventSourceResponse
from starlette.responses import FileResponse

app = FastAPI()

async def event_generator(request: Request):
    while True:
        if await request.is_disconnected():
            break
        yield sys.stdin.readline()


@app.get("/stream")
async def message_stream(request: Request):
    return EventSourceResponse(event_generator(request))
