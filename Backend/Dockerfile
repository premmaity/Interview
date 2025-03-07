FROM python:3.11-slim

# Install system dependencies for building PyAudio
RUN apt-get update && apt-get install -y \
    build-essential \
    portaudio19-dev \
    mpv \
 && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the entire project into the container
COPY . .

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Expose the port (Render.com will pass the PORT env variable at runtime)
EXPOSE 5000

# Run the application. Replace with your script if needed.
CMD ["python", "MultiUserTechHR.py"]
