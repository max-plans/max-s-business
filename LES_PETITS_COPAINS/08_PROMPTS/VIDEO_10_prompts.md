# Prompts de génération — Vidéo 10 : Tous ensemble, on danse !

> Méthode : 1) générer l'image fixe de chaque scène en joignant les **planches officielles** des personnages présents (`02_PERSONNAGES/<NOM>/<nom>_vue_face.png` + `_planche_rotation.png`) comme images de référence ; 2) animer l'image validée avec le prompt d'animation (image → vidéo). Les verrous des personnages sont en anglais (meilleure fidélité) ; la ligne « Story beat » est en français (acceptée par la plupart des outils récents — traduisez-la pour Midjourney).

**Style commun (à garder identique sur toute la chaîne) :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9
```

**Prompt négatif commun :**
```
text, letters, subtitles, logo, watermark, signature, extra limbs, extra fingers, deformed face, asymmetrical eyes, scary, horror, sharp teeth, realistic animal, weapons, clutter, different character design, color change, clothing change, added accessories, human characters
```

---
## Scène 1 — 0:00 · Intro (≈ 8 s)
**Personnages :** Milo · **Décor :** scene · **Caméra :** Plan moyen, projecteur
**Références à joindre :** 02_PERSONNAGES/MILO/milo_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: MILO in the center, waving hello with one paw raised high, joyful open-mouth smile.
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
Story beat (FR): Rideau qui s'ouvre sur la scène de Tralalune ; Milo au centre : « Tout le monde est prêt ? »
Camera: Plan moyen, projecteur. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 8 s par plan) :**
```
Animate this exact image. MILO: waves the raised paw side to side, happy little bounce. Story beat (FR): Rideau qui s'ouvre sur la scène de Tralalune ; Milo au centre : « Tout le monde est prêt ? ». Camera: Plan moyen, projecteur.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 2 — 0:08 · Refrain (≈ 16 s)
**Personnages :** Luna, Bibou, Milo, Pipo, Nounou · **Décor :** scene · **Caméra :** Plan large frontal (plan signature)
**Références à joindre :** 02_PERSONNAGES/LUNA/luna_vue_face.png, 02_PERSONNAGES/BIBOU/bibou_vue_face.png, 02_PERSONNAGES/MILO/milo_vue_face.png, 02_PERSONNAGES/PIPO/pipo_vue_face.png, 02_PERSONNAGES/NOUNOU/nounou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: LUNA on the left, dancing, leaning to the side with one arm up, joyful open-mouth smile; BIBOU in the center, dancing, leaning to the side with one arm up, joyful open-mouth smile; MILO in the center, dancing, leaning to the side with one arm up, joyful open-mouth smile; PIPO in the center, dancing, leaning to the side with one arm up, joyful open-mouth smile; NOUNOU on the right, dancing, leaning to the side with one arm up, joyful open-mouth smile.
LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded limbs, short thick rounded tail, no clothes
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
Story beat (FR): Les 5 copains entrent dans la ronde, main dans la main
Camera: Plan large frontal (plan signature). Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan, enchaîner plusieurs plans) :**
```
Animate this exact image. LUNA: bouncy dance, sways left and right on the beat, arms swinging; BIBOU: bouncy dance, sways left and right on the beat, arms swinging; MILO: bouncy dance, sways left and right on the beat, arms swinging; PIPO: bouncy dance, sways left and right on the beat, arms swinging; NOUNOU: bouncy dance, sways left and right on the beat, arms swinging. Story beat (FR): Les 5 copains entrent dans la ronde, main dans la main. Camera: Plan large frontal (plan signature).
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 3 — 0:24 · Couplet Milo & Luna (≈ 8 s)
**Personnages :** Milo · **Décor :** scene · **Caméra :** Plan entier frontal, ralenti au sommet du saut
**Références à joindre :** 02_PERSONNAGES/MILO/milo_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: MILO in the center, jumping joyfully with both arms up, laughing with happy closed eyes.
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
Story beat (FR): LE SAUT DU LION : Milo s'accroupit, « grrr », et saute bras en l'air
Camera: Plan entier frontal, ralenti au sommet du saut. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 8 s par plan) :**
```
Animate this exact image. MILO: crouches then jumps up joyfully, soft squash-and-stretch landing. Story beat (FR): LE SAUT DU LION : Milo s'accroupit, « grrr », et saute bras en l'air. Camera: Plan entier frontal, ralenti au sommet du saut.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 4 — 0:32 · Couplet Milo & Luna (≈ 24 s)
**Personnages :** Luna · **Décor :** scene · **Caméra :** Plan entier, caméra fixe
**Références à joindre :** 02_PERSONNAGES/LUNA/luna_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: LUNA in the center, dancing, leaning to the side with one arm up, joyful open-mouth smile.
LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes
Story beat (FR): LA PIROUETTE MAGIQUE : Luna tourne sur elle-même, traînée d'étincelles
Camera: Plan entier, caméra fixe. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan, enchaîner plusieurs plans) :**
```
Animate this exact image. LUNA: bouncy dance, sways left and right on the beat, arms swinging. Story beat (FR): LA PIROUETTE MAGIQUE : Luna tourne sur elle-même, traînée d'étincelles. Camera: Plan entier, caméra fixe.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 5 — 0:56 · Couplet Bibou & Pipo (≈ 8 s)
**Personnages :** Bibou · **Décor :** scene · **Caméra :** Plan entier
**Références à joindre :** 02_PERSONNAGES/BIBOU/bibou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: BIBOU in the center, hugging herself/himself tenderly, laughing with happy closed eyes.
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
Story beat (FR): LE DANDIN DU NOUNOURS : Bibou fait tourner son ventre, mains sur les hanches
Camera: Plan entier. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 8 s par plan) :**
```
Animate this exact image. BIBOU: slow gentle sway while hugging self, calm breathing. Story beat (FR): LE DANDIN DU NOUNOURS : Bibou fait tourner son ventre, mains sur les hanches. Camera: Plan entier.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 6 — 1:04 · Couplet Bibou & Pipo (≈ 8 s)
**Personnages :** Pipo · **Décor :** scene · **Caméra :** Légère contre-plongée
**Références à joindre :** 02_PERSONNAGES/PIPO/pipo_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: PIPO in the center, jumping joyfully with both arms up, joyful open-mouth smile.
PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded limbs, short thick rounded tail, no clothes
Story beat (FR): LE BOUM DU DINO : Pipo tape des pieds, petites ondes au sol
Camera: Légère contre-plongée. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 8 s par plan) :**
```
Animate this exact image. PIPO: crouches then jumps up joyfully, soft squash-and-stretch landing. Story beat (FR): LE BOUM DU DINO : Pipo tape des pieds, petites ondes au sol. Camera: Légère contre-plongée.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 7 — 1:12 · Couplet Nounou (≈ 12 s)
**Personnages :** Nounou · **Décor :** scene · **Caméra :** Plan entier
**Références à joindre :** 02_PERSONNAGES/NOUNOU/nounou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: NOUNOU in the center, jumping joyfully with both arms up, joyful open-mouth smile.
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
Story beat (FR): LES OREILLES QUI VOLENT : Nounou bat des bras, ses oreilles se soulèvent
Camera: Plan entier. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan, enchaîner plusieurs plans) :**
```
Animate this exact image. NOUNOU: crouches then jumps up joyfully, soft squash-and-stretch landing. Story beat (FR): LES OREILLES QUI VOLENT : Nounou bat des bras, ses oreilles se soulèvent. Camera: Plan entier.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 8 — 1:24 · Pont : l'enchaînement (≈ 26 s)
**Personnages :** Luna, Bibou, Milo, Pipo, Nounou · **Décor :** scene · **Caméra :** Plan large, coupes rythmées
**Références à joindre :** 02_PERSONNAGES/LUNA/luna_vue_face.png, 02_PERSONNAGES/BIBOU/bibou_vue_face.png, 02_PERSONNAGES/MILO/milo_vue_face.png, 02_PERSONNAGES/PIPO/pipo_vue_face.png, 02_PERSONNAGES/NOUNOU/nounou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: LUNA on the left, jumping joyfully with both arms up, laughing with happy closed eyes; BIBOU in the center, dancing, leaning to the side with one arm up, laughing with happy closed eyes; MILO in the center, jumping joyfully with both arms up, laughing with happy closed eyes; PIPO in the center, jumping joyfully with both arms up, laughing with happy closed eyes; NOUNOU on the right, dancing, leaning to the side with one arm up, laughing with happy closed eyes.
LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded limbs, short thick rounded tail, no clothes
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
Story beat (FR): Enchaînement des 5 pas, chaque copain s'illumine à son tour ; pictogrammes des pas à l'écran
Camera: Plan large, coupes rythmées. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan, enchaîner plusieurs plans) :**
```
Animate this exact image. LUNA: crouches then jumps up joyfully, soft squash-and-stretch landing; BIBOU: bouncy dance, sways left and right on the beat, arms swinging; MILO: crouches then jumps up joyfully, soft squash-and-stretch landing; PIPO: crouches then jumps up joyfully, soft squash-and-stretch landing; NOUNOU: bouncy dance, sways left and right on the beat, arms swinging. Story beat (FR): Enchaînement des 5 pas, chaque copain s'illumine à son tour ; pictogrammes des pas à l'écran. Camera: Plan large, coupes rythmées.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 9 — 1:50 · Refrain final (≈ 60 s)
**Personnages :** Luna, Bibou, Milo, Pipo, Nounou · **Décor :** scene · **Caméra :** Grue qui recule
**Références à joindre :** 02_PERSONNAGES/LUNA/luna_vue_face.png, 02_PERSONNAGES/BIBOU/bibou_vue_face.png, 02_PERSONNAGES/MILO/milo_vue_face.png, 02_PERSONNAGES/PIPO/pipo_vue_face.png, 02_PERSONNAGES/NOUNOU/nounou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: LUNA on the left, jumping joyfully with both arms up, laughing with happy closed eyes; BIBOU in the center, jumping joyfully with both arms up, laughing with happy closed eyes; MILO in the center, jumping joyfully with both arms up, laughing with happy closed eyes; PIPO in the center, jumping joyfully with both arms up, laughing with happy closed eyes; NOUNOU on the right, jumping joyfully with both arms up, laughing with happy closed eyes.
LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded limbs, short thick rounded tail, no clothes
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
Story beat (FR): Final : confettis, feux d'artifice doux (sans flash)
Camera: Grue qui recule. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan, enchaîner plusieurs plans) :**
```
Animate this exact image. LUNA: crouches then jumps up joyfully, soft squash-and-stretch landing; BIBOU: crouches then jumps up joyfully, soft squash-and-stretch landing; MILO: crouches then jumps up joyfully, soft squash-and-stretch landing; PIPO: crouches then jumps up joyfully, soft squash-and-stretch landing; NOUNOU: crouches then jumps up joyfully, soft squash-and-stretch landing. Story beat (FR): Final : confettis, feux d'artifice doux (sans flash). Camera: Grue qui recule.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```

---
## Scène 10 — 2:50 · Outro (≈ 10 s)
**Personnages :** Luna, Bibou, Milo, Pipo, Nounou · **Décor :** scene · **Caméra :** Plan large
**Références à joindre :** 02_PERSONNAGES/LUNA/luna_vue_face.png, 02_PERSONNAGES/BIBOU/bibou_vue_face.png, 02_PERSONNAGES/MILO/milo_vue_face.png, 02_PERSONNAGES/PIPO/pipo_vue_face.png, 02_PERSONNAGES/NOUNOU/nounou_vue_face.png

**Prompt image :**
```
High-end 3D animated children's cartoon, feature-film quality render, soft rounded shapes, plush-like fur with subtle subsurface scattering, big glossy expressive eyes with two white catchlights, warm soft global illumination, gentle rim light, vivid yet harmonious pastel palette, shallow depth of field, clean uncluttered background, cozy magical atmosphere, original character design, 16:9.
Setting: colorful little theater stage: pink-violet backdrop, three soft spotlights, music notes and confetti in the air.
Characters: LUNA on the left, waving hello with one paw raised high, joyful open-mouth smile; BIBOU in the center, waving hello with one paw raised high, joyful open-mouth smile; MILO in the center, waving hello with one paw raised high, joyful open-mouth smile; PIPO in the center, waving hello with one paw raised high, joyful open-mouth smile; NOUNOU on the right, waving hello with one paw raised high, joyful open-mouth smile.
LUNA: chibi baby unicorn standing upright, big round head (55% of height), pure white fur with soft lavender shading, mane and tail in three distinct pastel locks pink (#FF86C3), violet (#A66BFF) and turquoise (#3DD6CF), small golden spiral horn (#FFC83D), pointed white ears with pink inner, big glossy violet eyes (#8B50E8), pale pink rounded muzzle with two small nostrils, rosy cheeks, small glowing cream-white feathered wings on her back, pink hooves, no clothes
BIBOU: chibi baby bear cub, big round head (55% of height), light caramel-brown fur (#C98C58), large perfectly round ears with cream inner, round chubby cheeks, cream muzzle and big cream round belly (#F8E6C9), small oval dark-brown nose, big glossy dark-chocolate eyes, rosy cheeks, short rounded limbs with cream paw pads, tiny round tail, no clothes
MILO: chibi baby lion cub, big round head (about 55% of total height), golden-orange fur (#FFB23E) with soft yellow highlights, very large round fluffy scalloped mane in bright orange (#F2771A) framing the whole face, two small round ears inside the mane, small orange tuft on top of the head, big glossy warm-brown eyes, small rounded dark-brown nose, cream muzzle (#FFF1D2) and cream oval belly, rosy cheeks, short rounded arms and legs with cream paw pads, thin tail ending in an orange tuft, no clothes
PIPO: chibi baby dinosaur, big wide slightly oval head (55% of height), apple-green skin (#6DCB5E) with lighter green highlights, small rounded spikes on the head, back and tail alternating turquoise (#2EC4C8) and yellow (#FFD23F), light-green belly and lower face (#D6F6B4), big glossy deep-teal eyes, two tiny nostrils, rosy cheeks, short rounded limbs, short thick rounded tail, no clothes
NOUNOU: chibi baby bunny, big round head (55% of height), white and cream fur, very long floppy lop ears hanging down beside the face with soft pink inner, big glossy blue eyes (#3E6FB8), small pink triangle nose, cream two-lobed muzzle, rosy pink cheeks, light-blue overalls (#4A8FE7) with a front bib and two round yellow buttons (#FFD23F), cotton-ball tail, short rounded limbs
Story beat (FR): Salut final de la troupe. Plan de fin
Camera: Plan large. Characters fully visible, clear readable silhouettes, eye-level child perspective, no text.
```
**Prompt animation (image → vidéo, 10 s par plan) :**
```
Animate this exact image. LUNA: waves the raised paw side to side, happy little bounce; BIBOU: waves the raised paw side to side, happy little bounce; MILO: waves the raised paw side to side, happy little bounce; PIPO: waves the raised paw side to side, happy little bounce; NOUNOU: waves the raised paw side to side, happy little bounce. Story beat (FR): Salut final de la troupe. Plan de fin. Camera: Plan large.
Smooth 24 fps cartoon animation with soft squash and stretch, mouths moving gently in sync with a 124 BPM children's song,
keep every character's design, colors, proportions and outfit EXACTLY identical to the reference, no morphing,
no new characters, no text, no flicker, no flashing lights.
```
