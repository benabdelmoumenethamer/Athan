# آذان – Adhan (Algérie)

Application Android de rappel des cinq prières : React 19 + Vite + Tailwind 4, empaquetée avec Capacitor 7.

## Fonctionnalités
- Horaires calculés hors ligne (bibliothèque `adhan`, méthode MWL 18°/17°, décalages manuels par prière)
- 69 wilayas d'Algérie (choix manuel) ou position GPS
- Alarmes natives (AlarmManager) programmées 30 jours à l'avance, réarmées après redémarrage
- L'écran s'allume à l'heure de l'Adhan (même verrouillé), l'Adhan complet est joué par un service au premier plan
- Rappel 5/10/15 min avant la prière
- 4 adhans au choix, un canal de notification par muezzin
- Mode silencieux, réglage par prière, date hégirienne (+ ajustement), Qibla, tasbih, calendrier mensuel
- Français / arabe (RTL), polices embarquées (fonctionne hors ligne)

## Compiler l'APK (depuis un smartphone, via GitHub)
1. Pousser ce dossier sur un dépôt GitHub (branche `main`).
2. Onglet **Actions** → workflow **Build Android APK** (se lance à chaque push, ou « Run workflow »).
3. Télécharger l'artefact **Adhan-Algeria-APK** (APK debug installable).

## Développement local
```bash
npm ci --legacy-peer-deps
npm run dev          # navigateur
npm run build && npx cap sync android
```

## Fiabilité des alarmes sur Android
Au premier lancement, accepter les notifications, puis dans la bannière :
**Autoriser l'écran à s'allumer (plein écran)** (Android 14+) et **Désactiver l'optimisation batterie**.
Utiliser « Tester l'alerte » puis verrouiller l'écran : l'alerte arrive 10 s plus tard.
Sur Xiaomi / Huawei / Samsung, autoriser aussi le « démarrage automatique » de l'app.
