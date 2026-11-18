# KidNova Telegram bot for Railway (or any Docker host). Standard library only, no pip install.
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 DATA_DIR=/data ARRIVAL_ENABLED=0
WORKDIR /app
COPY . .
# Secrets come from Railway Variables, never from files in the image (.dockerignore drops .env).
CMD ["python", "-u", "bot.py"]
