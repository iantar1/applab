import speech_recognition as sr
from elevenlabs.client import ElevenLabs
from elevenlabs import play
import requests
import json

# Initialize ElevenLabs client
client = ElevenLabs(
    api_key="sk_a3b1e0eedfda847fd7dd2ec98f9a7ab299471555dbdfff37"
)

# OpenRouter API configuration
OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# System prompt for medical assistant
SYSTEM_PROMPT = """You are a helpful medical AI assistant for AppLab, a healthcare appointment booking platform in Morocco.
Keep your responses concise (2-3 sentences) since they will be spoken aloud.
You can help with:
- General health questions and symptom guidance
- Information about medical tests and services
- Booking appointments
- Insurance questions (Wafa Assurance, AXA, Sanlam, etc.)
Always recommend consulting a real doctor for serious concerns. Be warm and professional.
For emergencies, tell users to call 15 (SAMU in Morocco) immediately."""

# Initialize speech recognizer
recognizer = sr.Recognizer()

# Conversation history for context
conversation_history = []

def listen_to_microphone():
    """Listen to microphone and return transcribed text"""
    print("🎤 Listening...")
    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source, duration=0.5)
        audio_data = recognizer.listen(source, timeout=10, phrase_time_limit=15)
        try:
            text = recognizer.recognize_google(audio_data)
            print(f"You said: {text}")
            return text
        except sr.UnknownValueError:
            return None
        except sr.RequestError:
            return None
        except sr.WaitTimeoutError:
            return None

def get_ai_response(user_input):
    """Get response from OpenRouter AI - Dynamic agent responses"""
    global conversation_history
    
    # Add user message to history
    conversation_history.append({"role": "user", "content": user_input})
    
    # Keep only last 10 messages for context
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + conversation_history[-10:]
    
    try:
        print("🤖 Thinking...")
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AppLab Medical Assistant"
            },
            json={
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": messages,
                "max_tokens": 200,
                "temperature": 0.7
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            ai_reply = data["choices"][0]["message"]["content"]
            # Add assistant response to history
            conversation_history.append({"role": "assistant", "content": ai_reply})
            return ai_reply
        else:
            print(f"⚠️ API error: {response.status_code}")
            return "I'm having trouble connecting right now. Please try again in a moment."
            
    except requests.exceptions.Timeout:
        print("⚠️ Request timed out")
        return "The request took too long. Please try again."
    except Exception as e:
        print(f"⚠️ Error: {e}")
        return "Sorry, I encountered an error. Please try again."

def speak_text(text):
    """Convert text to speech using ElevenLabs and play it"""
    print(f"🔊 AI: {text}")
    try:
        audio = client.text_to_speech.convert(
            text=text,
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        play(audio)
    except Exception as e:
        print(f"ElevenLabs error: {e}")
        print("(Voice output unavailable)")

def main():
    """Main voice assistant loop"""
    print("\n" + "="*50)
    print("🏥 AppLab Medical Voice Assistant")
    print("="*50)
    print("Say 'exit' or 'quit' to stop")
    print("="*50 + "\n")
    
    speak_text("Medical voice assistant is ready. Ask me any health-related question.")
    
    while True:
        # Listen to user
        user_text = listen_to_microphone()
        
        if user_text is None:
            print("(No speech detected, try again)")
            continue
        
        if "exit" in user_text.lower() or "quit" in user_text.lower():
            speak_text("Take care of your health! Goodbye!")
            break
        
        # Get AI response
        response_text = get_ai_response(user_text)
        
        # Speak response
        speak_text(response_text)

if __name__ == "__main__":
    main()