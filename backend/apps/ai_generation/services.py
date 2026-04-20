import google.generativeai as genai
import openai
import json
import logging
import re
from django.conf import settings
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

class DeepSeekService:
    def __init__(self):
        self.api_key = getattr(settings, 'DEEPSEEK_API_KEY', None)
        self.model = getattr(settings, 'DEEPSEEK_MODEL', "deepseek-chat")
        
        if not self.api_key:
            logger.error("DeepSeek API key is missing.")
            self.client = None
        else:
            # DeepSeek uses OpenAI-compatible SDK
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://api.deepseek.com"
            )

    def chat(self, prompt: str, history: List[Dict] = None) -> str:
        if not self.client:
            return "DeepSeek xizmati sozlanmagan."
        
        messages = [{"role": "system", "content": "Siz AI Website Builder platformasining yordamchisisiz. Savollarga qisqa va aniq javob bering."}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"DeepSeek Error: {e}")
            return "Kechirasiz, suhbat xizmatida xatolik yuz berdi."

class GeminiService:
    _cached_model_name = None

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if not self.api_key:
             raise ValueError("Gemini API key is missing.")
        genai.configure(api_key=self.api_key)

    def _discover_best_model(self) -> str:
        if GeminiService._cached_model_name:
            return GeminiService._cached_model_name
        try:
            models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            for pref in ["models/gemini-1.5-flash-latest", "models/gemini-1.5-flash", "models/gemini-pro"]:
                if pref in models:
                    GeminiService._cached_model_name = pref
                    return pref
            return models[0] if models else "models/gemini-pro"
        except Exception:
            return "models/gemini-1.5-flash-latest"

    def _call_gemini(self, prompt: str, system_instruction: str = "") -> str:
        model_name = self._discover_best_model()
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(f"{system_instruction}\n\n{prompt}")
        return response.text

    def _clean_json(self, text: str) -> Dict:
        try:
            text = text.replace('```json', '').replace('```', '').strip()
            start, end = text.find('{'), text.rfind('}')
            if start != -1 and end != -1: text = text[start:end+1]
            return json.loads(text)
        except Exception:
            raise ValueError("AI JSON formati xatosi.")

    def generate_full_site(self, prompt: str, language: str = 'uz') -> Dict:
        instr = f"Generate website schema JSON in {language}."
        res = self._call_gemini(prompt, system_instruction=instr)
        return self._clean_json(res)

    def revise_site(self, prompt: str, current_schema: Dict, language: str = 'uz') -> Dict:
        instr = f"Update this JSON schema. Lang: {language}. Schema: {json.dumps(current_schema)}"
        res = self._call_gemini(prompt, system_instruction=instr)
        return self._clean_json(res)

class AIRouterService:
    @staticmethod
    def detect_intent(prompt: str) -> str:
        prompt_lower = prompt.lower().strip()
        gen_keywords = ['sayt', 'yarat', 'qur', 'build', 'create', 'dizayn', 'rang', 'font', 'section', 'tuzat', 'edit']
        
        if any(kw in prompt_lower for kw in gen_keywords):
            return "GEMINI"
        return "DEEPSEEK"
