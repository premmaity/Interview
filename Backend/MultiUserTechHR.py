import os
import hashlib
from datetime import datetime, timedelta

from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Header, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Use python-jose for JWT operations
from jose import jwt, JWTError

# Import your TTS and Groq modules (ensure these are in your PYTHONPATH)
from groq import Groq
from RealtimeTTS import TextToAudioStream, EdgeEngine

# Load environment variables from the .env file
from dotenv import load_dotenv
load_dotenv()

# -----------------------
# Configuration
# -----------------------
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))

app = FastAPI()

# Allow all CORS (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directory for audio files
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize the Groq clients using API keys from environment variables.
TECH_GROQ_API_KEY = os.getenv("TECH_GROQ_API_KEY")
groq_client = Groq(api_key=TECH_GROQ_API_KEY)

HR_GROQ_API_KEY = os.getenv("HR_GROQ_API_KEY")
hr_groq_client = Groq(api_key=HR_GROQ_API_KEY)

# -----------------------
# In-Memory "Database"
# -----------------------
users = {}
user_conversations = {}  # username -> {"technical": [...], "hr": [...]}
user_streams = {}        # username -> TTS stream instance

# System prompts for the interviews
technical_prompt = """
You are an interviewer at a software company.
Ask the candidate 5 short, unique technical questions about topics like OOPs, DBMS, and DSA.
After each question, wait for the candidate's answer before asking the next question.
Keep each question and response very brief, crisp, and to the point.
At the end, evaluate the candidate's answers and give clear, constructive feedback.
Keep your language plain and natural, without bullet points, asterisks, or any special characters.
Speak as naturally as possible so that the converted speech sounds human.
Avoid repeating the same questions in different sessions. Always vary the questions.
"""

hr_prompt = """
You are an HR interviewer at a company.
Ask the candidate 5 short behavioral questions focusing on interpersonal skills, teamwork, and cultural fit.
After each question, wait for the candidate's response before asking the next question.
Keep your tone friendly, empathetic, and professional.
At the end, provide concise feedback on the candidate's soft skills and overall fit.
Avoid bullet points, asterisks, or special formatting.
"""

# -----------------------
# Utility Functions
# -----------------------
def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(authorization: str = Header(None), token: str = Query(None)):
    auth_token = token
    if not auth_token and authorization and authorization.startswith("Bearer "):
        auth_token = authorization[7:]
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token is invalid")
    user = users.get(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# -----------------------
# Pydantic Models
# -----------------------
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class QueryRequest(BaseModel):
    text: str
    round: str = "technical"  # can be "technical" or "hr"
    stop_audio: bool = False

# -----------------------
# Endpoints
# -----------------------

@app.post("/register")
async def register(user: UserRegister):
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already registered")
    for u in users.values():
        if u.get("email") == user.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    users[user.username] = {
        "username": user.username,
        "email": user.email,
        "hashed_password": hashed_password,
    }
    return {"msg": "User registered successfully"}

from fastapi.security import OAuth2PasswordRequestForm
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["username"]}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "username": user["username"]}

def stop_audio_for_user(username: str):
    if username in user_streams:
        user_streams[username].stop()
        del user_streams[username]

@app.get("/stop_audio")
async def stop_audio(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    stop_audio_for_user(username)
    return {"status": f"Audio stopped for user {username}"}

def generate_speech_async(text: str, username: str):
    if username not in user_streams:
        tts_engine = EdgeEngine()
        tts_engine.set_voice("en-GB-RyanNeural")
        tts_engine.rate = 10
        tts_engine.pitch = -26
        user_streams[username] = TextToAudioStream(tts_engine)
    stream = user_streams[username]
    stream.feed(text)
    audio_data = stream.play()
    audio_file_path = os.path.join("static", f"{username}_response.mp3")
    with open(audio_file_path, "wb") as f:
        f.write(audio_data)

@app.post("/query")
async def query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    username = current_user["username"]
    if username not in user_conversations:
        user_conversations[username] = {
            "technical": [{"role": "system", "content": technical_prompt}],
            "hr": [{"role": "system", "content": hr_prompt}],
        }
    round_type = request.round if request.round in ["technical", "hr"] else "technical"
    conversation_history = user_conversations[username][round_type]
    conversation_history.append({"role": "user", "content": request.text})
    try:
        if round_type == "technical":
            chat_completion = groq_client.chat.completions.create(
                messages=conversation_history,
                model="llama-3.3-70b-versatile",
            )
        else:
            chat_completion = hr_groq_client.chat.completions.create(
                messages=conversation_history,
                model="llama-3.3-70b-versatile",
            )
        response_text = chat_completion.choices[0].message.content.strip()
        conversation_history.append({"role": "assistant", "content": response_text})
        background_tasks.add_task(generate_speech_async, response_text, username)
        return {"response": response_text}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

@app.get("/response.mp3")
async def get_audio(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    audio_file_path = os.path.join("static", f"{username}_response.mp3")
    if os.path.exists(audio_file_path):
        return FileResponse(audio_file_path, media_type="audio/mpeg")
    else:
        raise HTTPException(status_code=404, detail="Audio file not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
