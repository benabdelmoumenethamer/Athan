# Correctifs appliqués

## v1.2.0 — Écran allumé, Adhan complet, reprogrammation automatique

### Erreur de build corrigée
- `android/app/src/main/res/layout/activity_main.xml` était **vide (0 octet)** → `SAXParseException: Premature end of file`. Fichier recréé (layout Capacitor standard).

### 1. Écran qui s'allume à l'heure de l'Adhan
- Nouvelle activité native `AdhanAlertActivity` : s'affiche par-dessus l'écran de verrouillage, allume l'écran, gros bouton « Arrêter l'Adhan » + « Ouvrir l'application » (FR/AR, RTL).
- Réveil de l'écran garanti par un wake-lock à l'écran même si l'autorisation « plein écran » est refusée.
- Android 14+ : la bannière propose « Autoriser l'écran à s'allumer (plein écran) ».

### 2. Adhan complet et fiable
- Nouveau service au premier plan `AdhanService` : joue l'Adhan en entier, application fermée, avec notification et bouton « Arrêter ».
- Alarmes via `AlarmManager.setAlarmClock` (exempté du mode Doze, sans permission spéciale).
- Respecte le mode sonnerie / vibreur / silencieux du téléphone ; reprise audio propre (focus audio).
- Prières avec Adhan désactivé : simple notification sonore.
- Bouton « Tester l'alerte » : vraie alerte native dans 10 s (pour verrouiller l'écran et vérifier).

### 3. Reprogrammation automatique
- 30 jours d'alarmes programmés en avance (145 Adhans + 145 rappels), conservés en mémoire native.
- `AlarmRestoreReceiver` réarme tout après redémarrage, mise à jour de l'app, changement d'heure ou de fuseau.
- Si moins de ~2 jours d'alarmes restent, une notification (1 fois/jour) invite à rouvrir l'app.
- L'app reprogramme aussi à chaque ouverture / changement de réglages.

### Fichiers natifs ajoutés
`AdhanAlarms.java`, `AdhanAlarmReceiver.java`, `AdhanService.java`, `AdhanAlertActivity.java`, `AlarmRestoreReceiver.java`, `res/drawable/ic_stat_adhan.xml` ; `AdhanAudioPlugin.java` et `AndroidManifest.xml` étendus.
Tout le code Java a été compilé contre `android.jar` (API 34) avant livraison.

---

# v1.1.0

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
- Exemption batterie : détection et bouton dans la bannière (nouvelles méthodes `isIgnoringBatteryOptimizations` / `openBatterySettings` dans le plugin natif).
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
