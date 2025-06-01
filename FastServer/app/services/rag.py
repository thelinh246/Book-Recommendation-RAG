from app.core.config import configure_gemini
from app.services.retriever import BookRetrieval
from app.models.schemas import RAGState
from langgraph.graph import StateGraph
from langsmith import traceable
from app.utils.translator import translate_vi_to_en


SYSTEM_PROMPT = """
You are a helpful assistant designed to recommend books based on the user's interests.

Here are some book details you can use to make recommendations:
{DATA}
Your response should be in the user's language and based on the data provided. The suggestion should have the following fields: Title, Author, Summary. If the data provided does not contain the book requested by the user, then the user should be given a reasonable response. Here is a sample format:
Based on your request, here are some of my suggestions:
    1. (book title) written by (author's name) about (summary description)
    2. as above
Hopefully, the above books can meet your current requirements. Enjoy reading.
"""

@traceable(name="Translate")
def translate_node(state: RAGState) -> RAGState:
    query = state["query"]
    lang = state.get("lang", "vi")
    if lang == "vi":
        state["translated_query"] = translate_vi_to_en(query)
    else:
        state["translated_query"] = query
    return state


@traceable(name="Retrieve")
def retrieve_node(state: RAGState) -> RAGState:
    retriever = BookRetrieval("chromadb_data")
    records = retriever.search(state["translated_query"], top_k=3, lang="en")
    state["records"] = records
    return state


@traceable(name="Generate")
def prompt_node(state: RAGState) -> RAGState:
    data = "\n".join([r.text for r in state["records"]])
    prompt = f"{SYSTEM_PROMPT.format(DATA=data)}\n\nUser: {state['query']}\nAssistant: "
    gemini_model = configure_gemini()
    response = gemini_model.generate_content(prompt)
    state["response"] = response.text.strip()
    return state


def run_rag_workflow(query: str, lang: str = "vi") -> str:
    graph = StateGraph(RAGState)
    graph.add_node("translate", translate_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", prompt_node)
    graph.set_entry_point("translate")
    graph.add_edge("translate", "retrieve")
    graph.add_edge("retrieve", "generate")
    graph.set_finish_point("generate")
    flow = graph.compile()
    output = flow.invoke({"query": query, "lang": lang})
    return output["response"]