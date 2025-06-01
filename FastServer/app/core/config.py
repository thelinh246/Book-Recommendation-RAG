import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def configure_gemini():
    genai.configure(api_key=GOOGLE_API_KEY)
    return genai.GenerativeModel('models/gemini-2.0-flash-lite-001')