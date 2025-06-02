from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import QueryInput, SessionInput, UpdateTitleInput
from app.services.rag import run_rag_workflow
from app.services.redis_session import save_message_to_session, list_all_sessions, get_session_messages, delete_session, update_session_title, get_autocomplete_suggestions, get_answer_for_user_query
from app.services.search_engine import run_duckduckgo_workflow
from app.services.intent_detection import run_intent_workflow

router = APIRouter()

@router.post("/response")
async def bot_response(input: QueryInput):
    response = None
    if input.session_id:
        response = get_answer_for_user_query(input.session_id, input.query)

    if response is None:
        # DB hoặc session không có, gọi LLM hoặc các workflow khác
        intent = run_intent_workflow(input.query)
        if intent == "use_rag":
            response = run_rag_workflow(input.query, input.lang)
        elif intent == "use_ddg":
            response = run_duckduckgo_workflow(input.query, input.lang)
        else:
            response = "I cannot fulfill your request!"

    return {"response": response}

@router.post("/sessions")
async def save_session(input: SessionInput):
    save_message_to_session(session_id = input.session_id, messages = input.messages)
    return {"noti:": 'OK'}

@router.get("/sessions")
async def get_all_sessions():
    sessions = list_all_sessions()
    return {"sessions": sessions}

@router.get("/sessions/{session_id}")
async def get_session_detail(session_id: str):
    messages = get_session_messages(session_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found or empty.")
    return {"session_id": session_id, "messages": messages}

@router.delete("/sessions/{session_id}")
async def delete_sessions(session_id: str):
    delete_session(session_id = session_id)
    return {"noti:": 'Delete Success'}

@router.patch("/sessions/{session_id}/title")
async def update_title(session_id: str, input: UpdateTitleInput):
    success = update_session_title(session_id, input.new_title)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"noti": "Title updated successfully."}

@router.get("/sessions/{session_id}/autocomplete")
async def autocomplete(
    session_id: str,
    input_prefix: str = Query(..., min_length=1),
    limit: int = 5
    ):
    completions = get_autocomplete_suggestions(session_id, input_prefix, limit)
    return {"completions": completions}