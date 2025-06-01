from langgraph.graph import StateGraph
from langsmith import traceable

from langchain_community.tools import DuckDuckGoSearchRun
from app.utils.translator import translate_vi_to_en
from app.core.config import configure_gemini
from app.models.schemas import SearchState

SYSTEM_PROMPT = """
You are a helpful assistant designed to answer search queries based on DuckDuckGo results.
Here are the search results:
{DATA}
Your task:
- Your response should be in the user's language and based on the data provided
- Provide full relevant information in a clear and useful answer.
- If the data is irrelevant or unclear, respond appropriately.
"""

# --- Translate node ---
@traceable(name="Translate")
def translate_node(state: SearchState) -> SearchState:
    query = state["query"]
    lang = state.get("lang", "vi")

    if lang == "vi":
        translated = translate_vi_to_en(query)
        state["translated_query"] = translated
    else:
        state["translated_query"] = query
    return state


# --- Search node ---
search_tool = DuckDuckGoSearchRun()

@traceable(name="Search")
def duckduckgo_node(state: SearchState) -> SearchState:
    query = state["translated_query"]
    result = search_tool.run(query)
    state["search_results"] = result
    return state


# --- Prompt node ---
@traceable(name="Prompt")
def prompt_node(state: SearchState) -> SearchState:
    search_data = state["search_results"]
    prompt = f"{SYSTEM_PROMPT.format(DATA=search_data)}\n\nUser: {state['query']}\nAssistant:"
    
    gemini = configure_gemini()
    response = gemini.generate_content(prompt)
    state["response"] = response.text.strip()
    return state


# --- Run search workflow ---
def run_duckduckgo_workflow(query: str, lang: str = "vi") -> str:
    graph = StateGraph(SearchState)

    graph.add_node("translate", translate_node)
    graph.add_node("search", duckduckgo_node)
    graph.add_node("prompt", prompt_node)

    graph.set_entry_point("translate")
    graph.add_edge("translate", "search")
    graph.add_edge("search", "prompt")
    graph.set_finish_point("prompt")

    flow = graph.compile()
    output = flow.invoke({"query": query, "lang": lang})
    return output["response"]
