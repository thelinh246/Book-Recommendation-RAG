from fastapi import FastAPI
from app.api.endpoints import router as api_router
from app.core.logger import setup_logging
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
setup_logging()

app = FastAPI(title="Book Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH"],
    allow_headers=["Content-Type"],
)

app.include_router(api_router)