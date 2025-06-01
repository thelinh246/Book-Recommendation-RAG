import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from app.utils.translator import translate_vi_to_en
import logging

class BookRetrieval:
    def __init__(self, persist_dir, collection_name="books"):
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device="cpu")
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_function
        )

    def search(self, query, top_k=3, lang='vi'):
        query_en = translate_vi_to_en(query) if lang == 'vi' else query
        logging.info(f"Translated query: {query_en}")

        query_emb = self.embedding_model.encode(query_en).tolist()
        results = self.collection.query(query_embeddings=[query_emb], n_results=top_k * 2)

        documents = [doc for doc in self.collection.get()['documents']]
        tokenized_docs = [doc.split() for doc in documents]
        bm25 = BM25Okapi(tokenized_docs)
        tokenized_query = query_en.split()
        bm25_scores = bm25.get_scores(tokenized_query)

        combined_results = []
        for idx, (doc_id, distance, metadata) in enumerate(zip(
            results['ids'][0], results['distances'][0], results['metadatas'][0])):
            bm25_score = bm25_scores[idx] if idx < len(bm25_scores) else 0
            combined_score = 0.7 * (1 - distance) + 0.3 * bm25_score
            combined_results.append({
                'id': doc_id,
                'metadata': metadata,
                'score': combined_score
            })

        combined_results.sort(key=lambda x: x['score'], reverse=True)
        book_ids = set()
        final_results = []

        for result in combined_results:
            book_id = result['metadata']['book_id']
            if book_id not in book_ids:
                book_ids.add(book_id)
                final_results.append(result)
            if len(final_results) >= top_k:
                break

        class Record:
            def __init__(self, text):
                self.text = text

        records = []
        for result in final_results:
            m = result['metadata']
            text = (
                f"Title: {m['title']}\n"
                f"Author: {m['author']}\n"
                f"Genres: {m['genres']}\n"
                f"Rating: {m['rating']}\n"
                f"Description: {m['description']}"
            )
            records.append(Record(text))

        logging.info(f"Query '{query}' returned {len(records)} books")
        return records