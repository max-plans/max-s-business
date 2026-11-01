# Prompt maître — Nounou

> À coller **mot pour mot** dans chaque génération, avec au moins 2 images de référence de ce dossier
> (`nounou_vue_face.png` + `nounou_planche_rotation.png`). Ne jamais paraphraser : la répétition exacte garantit la cohérence.

## Verrou du personnage
```
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
```

## Prompt complet — portrait officiel
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs.
Full body, front view, standing, joyful open smile, waving hello with one paw, plain soft pastel background, centered composition, no text.
```

## Prompt complet — planche de personnage (character sheet)
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Character turnaround sheet of NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs.
Three views side by side on pure white background: front view, side view facing right, back view. Same scale, same height, neutral pose, soft smile, consistent design across views, no text.
```

## Prompt complet — expressions
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Expression sheet of NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs.
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
