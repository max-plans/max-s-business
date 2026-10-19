# Fabrique Plop Lab sur Hugging Face Spaces (offre gratuite « CPU basic », sans carte bancaire).
# Le code est récupéré sur GitHub ; il est remis à jour à chaque redémarrage du Space.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH PYTHONUNBUFFERED=1 PORT=7860 WORKER_NAME=huggingface
WORKDIR /home/user

RUN git clone --depth 1 -b claude/tiktok-video-generator-kod0d7 https://github.com/max-plans/max-s-business.git plop \
    && pip install --no-cache-dir --user -r plop/requirements.txt

EXPOSE 7860
CMD cd plop && (git pull -q --ff-only || true) && exec python -m content_agent.worker
