FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5100

CMD ["gunicorn", "--bind", "0.0.0.0:5100", "--workers", "1", "--threads", "2", "app:app"]
