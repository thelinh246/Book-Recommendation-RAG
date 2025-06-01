import redis
import json
import uuid
from dotenv import load_dotenv
import os
from app.models.schemas import Message

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True
)

def save_message_to_session(session_id: str, messages: list[Message]):
    title = next((msg.content for msg in messages if msg.role == "user"), "Untitled Session")
    session_data = {
        "title": title,
        "messages": [msg.model_dump() for msg in messages]
    }
    redis_client.set(session_id, json.dumps(session_data))
    redis_client.zadd("session_order", {session_id: int(uuid.uuid4().int % 1e9)})

def get_session_messages(session_id: str):
    data = redis_client.get(session_id)
    if data:
        redis_client.zadd("session_order", {session_id: int(uuid.uuid4().int % 1e9)})
        return json.loads(data)["messages"]
    return []

def list_all_sessions():
    session_ids = redis_client.zrevrange("session_order", 0, -1)
    return [{"id": sid, "title": json.loads(redis_client.get(sid)).get("title", "Untitled Session")} for sid in session_ids]

def delete_session(session_id: str):
    redis_client.delete(session_id)
    redis_client.zrem("session_order", session_id)

def update_session_title(session_id: str, new_title: str):
    data = redis_client.get(session_id)
    if data:
        session_data = json.loads(data)
        session_data["title"] = new_title
        redis_client.set(session_id, json.dumps(session_data))
        return True
    return False
