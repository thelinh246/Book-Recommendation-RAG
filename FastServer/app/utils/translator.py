from deep_translator import GoogleTranslator

def translate_vi_to_en(text: str) -> str:
    return GoogleTranslator(source='vi', target='en').translate(text)