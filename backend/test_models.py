import os
from dotenv import load_dotenv
import anthropic

def list_models():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(dotenv_path=env_path)
    
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("No API key")
        return
        
    client = anthropic.Anthropic(api_key=api_key)
    try:
        # Assuming the newer SDK has client.models.list()
        models = client.models.list()
        print("Available models:")
        for m in models.data:
            print(f"- {m.id}")
    except Exception as e:
        print('Error listing models:', e)

if __name__ == '__main__':
    list_models()
