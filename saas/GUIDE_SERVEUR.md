# Installer la fabrique de vidéos sur le serveur gratuit Oracle Cloud

La fabrique est le programme qui prend les commandes des clients, fabrique les vidéos et les dépose dans
leur espace. Elle tourne 24 h/24 sur un serveur gratuit, sans ton PC.

## 1. Créer le serveur (une seule fois)

1. Crée un compte sur https://signup.cloud.oracle.com/ (ou passe par la page de présentation
   https://www.oracle.com/fr/cloud/free/ puis clique sur « Commencer gratuitement »).
   Copie l'adresse dans ton navigateur si le lien ne s'ouvre pas en cliquant dessus.
   Une carte bancaire est demandée pour vérifier ton identité ; rien n'est prélevé tant que tu restes
   dans l'offre gratuite « Always Free ».
2. Dans la console : **Compute → Instances → Create instance**.
3. **Image** : Ubuntu 22.04 ou 24.04.
4. **Shape** : clique sur « Change shape » → **Ampere** → `VM.Standard.A1.Flex`, avec **4 OCPU** et
   **24 Go** de mémoire (c'est le maximum gratuit).
   S'il est écrit « Out of capacity », réessaie plus tard ou choisis une autre zone (« Availability domain »).
5. **Clés SSH** : choisis « Generate a key pair » et **télécharge la clé privée** (garde-la précieusement).
6. Clique sur **Create**. Note l'**adresse IP publique** du serveur.

## 2. Se connecter au serveur

Sur Windows, ouvre « Terminal » ou « PowerShell » et tape (en remplaçant le chemin et l'adresse) :

```
ssh -i C:\chemin\vers\ta-cle.key ubuntu@ADRESSE_IP
```

## 3. Installer la fabrique (copier-coller ces lignes)

```
sudo apt update && sudo apt install -y git ffmpeg python3-venv python3-pip fonts-dejavu
git clone -b claude/tiktok-video-generator-kod0d7 https://github.com/max-plans/max-s-business.git plop
cd plop
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 4. Donner la clé secrète Supabase à la fabrique

1. Dans Supabase : **Project Settings → API Keys** → copie la clé **secret** (ou « service_role »).
2. Sur le serveur, crée le fichier de réglages (remplace `COLLE_LA_CLE_ICI`) :

```
cat > ~/plop/.env <<'EOF'
SUPABASE_URL=https://atgflcaealaaqoxgdopz.supabase.co
SUPABASE_SERVICE_KEY=COLLE_LA_CLE_ICI
WORKER_NAME=oracle-1
EOF
chmod 600 ~/plop/.env
```

**Important** : cette clé donne tous les droits sur ta base. Elle reste uniquement sur le serveur :
ne la mets jamais dans le site, ne la partage avec personne et ne l'envoie pas dans une conversation.

## 5. Lancer la fabrique en permanence (redémarre toute seule)

```
sudo tee /etc/systemd/system/plop.service > /dev/null <<'EOF'
[Unit]
Description=Fabrique de videos Plop Lab
After=network-online.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/plop
EnvironmentFile=/home/ubuntu/plop/.env
ExecStart=/home/ubuntu/plop/.venv/bin/python -m content_agent.worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now plop
```

Pour voir ce qu'elle fait : `journalctl -u plop -f` (Ctrl+C pour quitter).
Tu dois voir : « Fabrique « oracle-1 » prête : j'attends les commandes… ».

## 6. Mettre à jour la fabrique plus tard

```
cd ~/plop && git pull && .venv/bin/pip install -r requirements.txt && sudo systemctl restart plop
```
