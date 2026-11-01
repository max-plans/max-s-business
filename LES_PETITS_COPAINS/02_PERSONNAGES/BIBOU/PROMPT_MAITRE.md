# Prompt maître — Bibou

> À coller **mot pour mot** dans chaque génération, avec au moins 2 images de référence de ce dossier
> (`bibou_vue_face.png` + `bibou_planche_rotation.png`). Ne jamais paraphraser : la répétition exacte garantit la cohérence.

## Verrou du personnage
```
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
```

## Prompt complet — portrait officiel
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes.
Full body, front view, standing, joyful open smile, waving hello with one paw, plain soft pastel background, centered composition, no text.
```

## Prompt complet — planche de personnage (character sheet)
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Character turnaround sheet of BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes.
Three views side by side on pure white background: front view, side view facing right, back view. Same scale, same height, neutral pose, soft smile, consistent design across views, no text.
```

## Prompt complet — expressions
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Expression sheet of BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes.
Grid of 8 head close-ups on white background: gentle smile, joyful open smile, laughing with closed eyes, wink, surprised, sad with a small tear, asleep, mildly grumpy pout. Same design in every cell, no text.
```

## Prompt négatif
```
text, letters, subtitles, logo, watermark, signature, extra limbs, extra fingers, deformed face, asymmetrical eyes, scary, horror, sharp teeth, realistic animal, weapons, clutter, different character design, color change, clothing change, added accessories, human characters
```

## Astuces de cohérence par outil
- **Gemini (Nano Banana) / GPT Image** : joindre les références et écrire « Garde exactement le même personnage que sur les images jointes ».
- **Midjourney** : utiliser les références de personnage (`--cref` / *Omni Reference* selon la version) + ce prompt ; poids de référence élevé.
- **Kling / Runway / Veo (image → vidéo)** : toujours partir d'une image fixe validée de la scène, jamais d'un texte seul.
- **Flux / Stable Diffusion** : entraîner un petit modèle LoRA sur les 20+ images officielles (vues + poses + expressions).
