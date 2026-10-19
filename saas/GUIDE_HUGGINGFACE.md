# Installer la fabrique de vidéos sur Hugging Face (gratuit, sans carte bancaire)

La fabrique est le programme qui prend les commandes des clients, fabrique les vidéos et les dépose dans
leur espace. Ici, elle tourne gratuitement sur un serveur de Hugging Face, sans ton PC.

## 1. Créer ton compte

1. Va sur https://huggingface.co/join et crée un compte (adresse e-mail et mot de passe).
2. Confirme ton adresse e-mail avec le lien reçu.

## 2. Créer le « Space » (ton serveur)

1. Va sur https://huggingface.co/new-space
2. **Space name** : `plop-fabrique`
3. **Select the Space SDK** : choisis **Docker**, puis le modèle **Blank**.
4. **Space hardware** : laisse **CPU basic · 2 vCPU · 16 GB · FREE**.
5. **Visibility** : **Public**. Ne t'inquiète pas : le public voit seulement une page « en marche ».
   Ta clé secrète, elle, reste cachée (étape 3). Le mode « Public » est nécessaire pour que Supabase
   puisse réveiller le serveur toutes les heures.
6. Clique sur **Create Space**.

## 3. Donner l'adresse et la clé secrète Supabase

1. Dans Supabase : **Project Settings → API Keys** → copie la clé **secret** (elle commence par `sb_secret_`).
2. Dans ton Space : onglet **Settings** → descends jusqu'à **Variables and secrets**.
3. Clique sur **New secret** :
   - Name : `SUPABASE_SERVICE_KEY`
   - Value : colle la clé secrète
   - clique sur **Save**.
4. Clique sur **New variable** :
   - Name : `SUPABASE_URL`
   - Value : `https://atgflcaealaaqoxgdopz.supabase.co`
   - clique sur **Save**.

**Important** : cette clé donne tous les droits sur ta base. Mets-la uniquement dans « New secret » :
jamais dans un fichier, jamais dans le site, et ne l'envoie à personne, même pas dans une conversation.

## 4. Ajouter le fichier d'installation

1. Dans ton Space : onglet **Files** → **+ Add file** → **Create a new file**.
2. Nom du fichier : `Dockerfile` (avec un D majuscule, sans extension).
3. Colle exactement ce contenu :

```
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
```

4. En bas, clique sur **Commit new file to main**.

## 5. Vérifier que ça marche

- L'installation prend 5 à 10 minutes (« Building » en haut de la page).
- Quand c'est fini, l'onglet **App** affiche : « Fabrique Plop Lab « huggingface » : en marche. »
- Le bouton **Logs** (en haut) doit afficher : « Fabrique « huggingface » prête : j'attends les commandes… »
- Commande une vidéo sur ton site : elle passe de « En attente… » à la barre de progression.

## 6. L'empêcher de s'endormir

Un Space gratuit s'endort après 48 h sans visite. Envoie-moi l'adresse de ton Space (elle ressemble à
`https://ton-pseudo-plop-fabrique.hf.space`) : je règle Supabase pour qu'il le visite toutes les heures.

## 7. Mettre à jour la fabrique plus tard

Onglet **Settings** → **Restart this Space** : la fabrique récupère automatiquement la dernière version.
Si je te dis qu'un nouveau module a été ajouté, utilise plutôt **Factory rebuild**.
