#!/usr/bin/env python3
"""Assemble les comparaisons « maquette | capture réelle » (docs/mockups/comparaison/)."""
import os
from PIL import Image, ImageDraw

PAIRS = [
    ('01-accueil', '31-accueil-favoris'), ('02-creation-joueurs', '02-creation-joueurs'),
    ('03-composition-des-roles', '03-creation-composition-auto'), ('04-liste-des-joueurs-tableau-de-bord', '15-tableau-de-bord-jour'),
    ('05-deroulement-de-la-nuit', '10-nuit-voyante-resultat'), ('06-resolution-des-actions', '13-nuit-recapitulatif'),
    ('07-election-du-maire', '17-maire-scrutin'), ('08-vote-d-elimination', '19-vote-compteurs'),
    ('09-resume-de-l-aube', '14-aube-bilan'), ('10-fiche-detaillee-d-un-joueur', '21-fiche-joueur'),
    ('11-catalogue-des-roles', '33-catalogue-roles'), ('12-parametres-audio-et-themes', '28-parametres'),
]
root = os.path.join(os.path.dirname(__file__), '..', 'docs')
os.makedirs(f'{root}/mockups/comparaison', exist_ok=True)
W, H = 390, 844
for m, r in PAIRS:
    a = Image.open(f'{root}/mockups/screens/{m}.png').convert('RGB').resize((W, H))
    b = Image.open(f'{root}/screenshots/web/{r}.png').convert('RGB').resize((W, H))
    out = Image.new('RGB', (W * 2 + 60, H + 50), (12, 14, 22))
    d = ImageDraw.Draw(out)
    out.paste(a, (20, 40))
    out.paste(b, (W + 40, 40))
    d.text((20, 12), 'MAQUETTE (HTML statique)', fill=(231, 198, 136))
    d.text((W + 40, 12), 'APPLICATION REELLE (export web, Chromium)', fill=(122, 211, 160))
    out.save(f'{root}/mockups/comparaison/{m}.png')
print(f'{len(PAIRS)} comparaisons')
