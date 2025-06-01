from pydantic import BaseModel
from typing import List
from typing import TypedDict, Literal

class QueryInput(BaseModel):
    query: str
    lang: str = "vi"

class BookRecord:
    def __init__(self, text: str):
        self.text = text

class RAGState(TypedDict):
    query: str
    lang: str
    translated_query: str
    records: List[BookRecord]
    response: str

class Message(BaseModel):
    role: str
    content: str

class SessionInput(BaseModel):
    session_id: str
    messages: List[Message]

class UpdateTitleInput(BaseModel):
    new_title: str
    
class SearchState(TypedDict):
    query: str
    lang: str
    translated_query: str
    search_results: str
    response: str

class IntentState(TypedDict):
    query: str
    intent: Literal["use_rag", "use_ddg", "none"]