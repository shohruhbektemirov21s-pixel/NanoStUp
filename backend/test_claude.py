import os
import sys
from dotenv import load_dotenv
import anthropic

def test_models():
    # Construct the path to .env file relative to the script location
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(dotenv_path=env_path)
    
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("Error: No ANTHROPIC_API_KEY found in .env")
        sys.exit(1)
        
    client = anthropic.Anthropic(api_key=api_key)
    
    models_to_test = [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229',
        'claude-3-5-sonnet-latest'
    ]
    
    working_model = None

    print("Testing Anthropic models...")
    for model in models_to_test:
        try:
            print(f"Testing {model}...")
            response = client.messages.create(
                model=model,
                max_tokens=10,
                messages=[{'role': 'user', 'content': 'Hi'}]
            )
            print(f"✅ SUCCESS: {model}")
            if not working_model:
                working_model = model
            break  # Stop at first working model
        except Exception as e:
            print(f"❌ ERROR with {model}: {e}")
            
    if working_model:
        print(f"\nFound working model: {working_model}")
        return working_model
    else:
        print("\nFailed to find any working model.")
        return None

if __name__ == "__main__":
    test_models()
