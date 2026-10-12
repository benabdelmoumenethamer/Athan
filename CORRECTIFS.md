# Correctifs appliqués (v1.1.0)

## Bloquants
- `src/components/ActivePrayerAlertModal.tsx` était vide → composant écrit (le build `vite build` échouait).
- `MainActivity.java` était vide → `BridgeActivity` + `registerPlugin(AdhanAudioPlugin.class)`.
- `HeroNextPrayer` : image référencée par `/src/...` (absente de l'APK) → import Vite.

## Alarmes (notificationService.ts / App.tsx)
- Replanification en boucle chaque seconde → supprimée (dépend de la position et des réglages uniquement, appels sérialisés, ignorés si rien n'a changé).
- Seule la journée en cours était programmée → 10 jours programmés (Fajr du lendemain inclus), reprogrammation au retour au premier plan.
- Mode silencieux : annule maintenant les alarmes déjà programmées.
- Muezzin ignoré en arrière-plan → un canal de notification par muezzin (`adhan_<id>_v5`), canal distinct et discret pour les rappels.
- Les canaux ne sont plus supprimés/recréés à chaque lancement.
- Doublons (notification + audio + alerte) quand l'app est ouverte → sur Android seul le canal joue le son ; l'app affiche l'alerte visuelle.
- Alarmes exactes + exemption batterie : détection et boutons dans la bannière (nouvelles méthodes `isIgnoringBatteryOptimizations` / `openBatterySettings` dans le plugin natif).
- `RECEIVE_BOOT_COMPLETED` ajouté au manifeste.

## Données / calculs
- 11 nouvelles wilayas (59 à 69) ajoutées avec leur chef-lieu (coordonnées approximatives, à affiner).
- Détection GPS : distance en km (haversine), commune la plus proche réelle, hors Algérie → position GPS.
- Boussole Qibla : utilise `deviceorientationabsolute` (nord magnétique sur Android).
- Date hégirienne : repli calculé au lieu d'une date codée en dur.
- Règle des hautes latitudes cohérente pour le Fajr du lendemain.

## Hors ligne / nettoyage
- Polices (Cairo, Plus Jakarta Sans, Amiri) embarquées via @fontsource : plus de Google Fonts.
- Dépendances inutiles retirées (`@google/genai`, `express`, `dotenv`, `motion`, `tsx`, `@types/express`), `@capacitor/cli` en devDependency.
- Guide Flutter (711 lignes) et ses boutons retirés de l'interface.
- Workflow : `npm ci`, vérification `tsc`, cache npm, copie forcée des mp3.
- `.gitignore` : fichiers générés exclus. README réécrit.

## À SUPPRIMER de ton dépôt GitHub existant (après avoir copié le zip dessus)
- `src/components/FlutterAndroidGuideModal.tsx`
- `src/assets/images/` : tout sauf `mosque_dusk_islamic_1791747655722.jpg` (et éventuellement `adhan_app_icon_*.jpg`)
- `public/manifest.json`, `bun.lock`, dossier `dev-dist/`
- `android/app/src/main/assets/` et `android/app/src/main/res/raw/` (régénérés par le workflow)
