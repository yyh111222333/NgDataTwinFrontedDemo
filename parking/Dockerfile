FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai

WORKDIR /app

ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple

COPY requirements.txt ./
RUN pip install --no-cache-dir --index-url "$PIP_INDEX_URL" -r requirements.txt

COPY app ./app
COPY tests ./tests

RUN python -m unittest discover -s tests -v

RUN mkdir -p /data/images

EXPOSE 19080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "19080"]
