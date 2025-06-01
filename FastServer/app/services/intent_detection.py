from app.core.config import configure_gemini
from app.models.schemas import IntentState
from langgraph.graph import StateGraph
from langsmith import traceable

INTENT_PROMPT = """
You are an intent classifier for a book assistant system.

Your task:
- Classify the user's query **only if it is related to books**.
- If the query is about books and:
    - asking for find book → respond `use_rag`
    - asking for facts about authors → respond `use_ddg`
- If the query is **not related to books**, respond `none`.

Respond with ONLY ONE of these three labels: `use_rag`, `use_ddg`, or `none`.

Query: "{query}"
Intent:
"""

@traceable(name="Intent Classification")
def intent_node(state: IntentState) -> IntentState:
    gemini = configure_gemini()
    prompt = INTENT_PROMPT.format(query=state["query"])
    response = gemini.generate_content(prompt)
    label = response.text.strip().lower()

    state["intent"] = label if label in {"use_rag", "use_ddg", "none"} else "none"
    return state

# --- Build workflow graph ---
def build_intent_graph():
    graph = StateGraph(IntentState)

    graph.add_node("classify_intent", intent_node)

    graph.set_entry_point("classify_intent")
    graph.set_finish_point("classify_intent")

    return graph.compile()

# --- Run intent workflow ---
def run_intent_workflow(query: str) -> str:
    graph = build_intent_graph()
    output = graph.invoke({"query": query})
    return output["intent"]