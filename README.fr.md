# @ac-codeprod/n8n-nodes-alexa-remote

[![n8n community node](https://img.shields.io/badge/n8n-community%20node-orange?logo=n8n)](https://docs.n8n.io/integrations/community-nodes/installation/)
[![npm version](https://img.shields.io/npm/v/@ac-codeprod/n8n-nodes-alexa-remote)](https://www.npmjs.com/package/@ac-codeprod/n8n-nodes-alexa-remote)
[![npm downloads](https://img.shields.io/npm/dm/@ac-codeprod/n8n-nodes-alexa-remote)](https://www.npmjs.com/package/@ac-codeprod/n8n-nodes-alexa-remote)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Ce package de nœuds communautaires n8n vous permet d'interagir avec l'API Amazon Alexa dans vos workflows n8n. Il fournit deux nœuds :

- **Alexa Remote** — nœud d'action pour contrôler des appareils, exécuter des routines, gérer des listes, des notifications, et bien plus.
- **Alexa Remote Trigger** — nœud déclencheur qui démarre un workflow lorsqu'un événement push WebSocket Alexa se produit.

Alexa Remote offre un accès programmatique pour contrôler les appareils Echo, exécuter des routines, gérer les appareils domotiques, et bien plus encore — sans avoir à dire « Alexa » !

[n8n](https://n8n.io/) est une plateforme d'automatisation de workflows sous [licence fair-code](https://docs.n8n.io/sustainable-use-license/).

## Table des matières

- [Installation](#installation)
- [Nœuds](#nœuds)
- [Opérations](#opérations)
- [Événements déclencheurs](#événements-déclencheurs)
- [Identifiants](#identifiants)
- [Compatibilité](#compatibilité)
- [Utilisation](#utilisation)
- [Dépannage](#dépannage)
- [Ressources](#ressources)

## Installation

Suivez le [guide d'installation](https://docs.n8n.io/integrations/community-nodes/installation/) dans la documentation des nœuds communautaires n8n.

### Installation rapide

```bash
npm install @ac-codeprod/n8n-nodes-alexa-remote
```

## Nœuds

### Alexa Remote

Un nœud d'action pour interagir avec l'API Alexa. Prend en charge 10 ressources et peut également être utilisé comme outil IA.

### Alexa Remote Trigger

Un nœud déclencheur qui écoute les événements push WebSocket Alexa en temps réel et démarre votre workflow lorsqu'ils se produisent.

## Opérations

### Account (Compte)
- **Get Accounts** — Obtenir les informations du compte
- **Get Contacts** — Récupérer vos contacts Alexa
- **Get Music Providers** — Lister les services de streaming musical disponibles
- **Get Routines** — Obtenir toutes les routines d'automatisation

### Auth (Authentification)
- **Authenticate** — Démarrer le proxy et attendre la connexion Amazon. Ouvrez votre navigateur sur `http://[IP Proxy]:[Port Proxy]` lorsque le workflow est en cours d'exécution. Le paramètre **Login Timeout (Minutes)** contrôle le délai d'attente (défaut : 5 min).

### Bluetooth ⚠️ Non testé

> **Avertissement** : Les opérations Bluetooth n'ont pas encore été testées. Elles sont disponibles dans le code mais leur fonctionnement n'est pas garanti.

- **Get State** — Obtenir les appareils Bluetooth appairés et l'état de connexion
- **Connect** — Se connecter à un appareil Bluetooth appairé (requiert l'adresse MAC)
- **Disconnect** — Déconnecter l'appareil Bluetooth actuel
- **Unpair** — Désappairer un appareil Bluetooth (requiert l'adresse MAC)

### Conversation
- **Get Conversations** — Obtenir les conversations Alexa (filtre optionnel : non lues seulement)
- **Send Message** — Envoyer un message texte dans une conversation

### Device (Appareil Echo)
- **Get Devices** — Lister tous vos appareils Echo
- **Get Device Info** — Obtenir les informations détaillées d'un appareil spécifique
- **Get Player Info** — Obtenir les informations du lecteur en cours (piste, état, volume…)
- **Get Player Queue** — Obtenir la file de lecture en cours
- **Send Command** — Envoyer une commande média à un appareil : `play`, `pause`, `next`, `previous`, `forward`, `rewind`, `repeat`, `shuffle`
- **Set Do Not Disturb** — Activer ou désactiver le mode Ne pas déranger

### Interaction
- **Speak** — Faire parler Alexa (texte normal, SSML ou annonce)
- **Speak All (Multi-Device)** — Faire parler plusieurs appareils Echo en parallèle
- **Speak At Volume** — Faire parler Alexa à un volume spécifique
- **Text Command** — Envoyer une commande textuelle à Alexa (comme lui poser une question)
- **Stop** — Arrêter la lecture sur un appareil
- **Set Volume** — Modifier le volume d'un appareil (0–100)
- **Play Music** — Lire de la musique depuis un fournisseur (Amazon Music, Spotify, TuneIn, Cloud Player)
- **Builtin** — Lancer une action intégrée Alexa : Météo, Trafic, Flash Info, Bonjour, Fun Fact, Blague, Clean Up, Chanter une chanson, Raconter une histoire, Calendrier (Aujourd'hui / Demain / Prochain)
- **Sound** — Jouer un effet sonore par identifiant (ex. : `amzn1.ask.1p.sound/nature/crickets_01`)
- **Wait** — Attendre un nombre de secondes donné (utile dans les workflows séquentiels)

### List (Liste)
- **Get Lists** — Obtenir toutes les listes Alexa (courses, tâches, personnalisées)
- **Add Item** — Ajouter un élément à une liste
- **Remove Item** — Supprimer un élément d'une liste
- **Create List** — Créer une nouvelle liste personnalisée
- **Delete List** — Supprimer une liste

### Notification
- **Get Notifications** — Lister toutes les notifications (alarmes, rappels, minuteries)
- **Create Notification** — Créer une alarme, un rappel ou une minuterie
- **Delete Notification** — Supprimer une notification par ID

### Routine
- **Execute Routine** — Exécuter une routine Alexa existante (sélectionnée dans une liste déroulante)

### Smarthome (Domotique)
- **Get Devices** — Lister tous les appareils domotiques connectés
- **Control Device** — Contrôler un appareil domotique : Allumer, Éteindre, Définir la luminosité, Définir la couleur, Définir la température

## Événements déclencheurs

Le nœud **Alexa Remote Trigger** écoute les événements push WebSocket suivants :

| Événement | Description |
|---|---|
| **All Messages** | Se déclenche sur chaque événement WebSocket reçu d'Alexa |
| **All Unknown Messages** | Se déclenche sur chaque message WebSocket non reconnu |
| **Audio Player State Change** | Se déclenche quand l'état de lecture change sur un appareil Echo |
| **Bluetooth State Change** | Se déclenche quand l'état d'une connexion Bluetooth change |
| **Device Activity** | Se déclenche quand un appareil Echo enregistre une activité (commande vocale, etc.) |
| **Device Connection Change** | Se déclenche quand un appareil Echo passe en ligne ou hors ligne |
| **Media Change** | Se déclenche quand le média en cours de lecture change |
| **Notification Change** | Se déclenche quand une notification Alexa (alarme, rappel) change |
| **Todo / List Change** | Se déclenche quand une liste de courses ou de tâches Alexa change |
| **Volume Change** | Se déclenche quand le volume d'un appareil Echo change |

Chaque déclencheur émet un payload JSON avec les champs `event`, `payload` et `timestamp`.

## Identifiants

Pour utiliser ce nœud, vous devez configurer des identifiants **Alexa Remote API**.

### Prérequis

1. Un compte Amazon avec des appareils Alexa enregistrés
2. Accès à l'adresse IP de votre serveur n8n (pour l'authentification par proxy)

### Configuration

1. Dans n8n, créez de nouveaux identifiants « Alexa Remote API »
2. Configurez les paramètres suivants :
   - **Proxy IP** : L'adresse IP de votre serveur n8n (ex. : `192.168.1.100`)
   - **Proxy Port** : Port pour l'authentification (par défaut : `3456`)
   - **Cookie File Path** : Chemin pour sauvegarder le cookie (par défaut : `$N8N_USER_FOLDER/.alexa-cookie.json`)
   - **Amazon Service Host** : Sélectionnez votre région (ex. : `pitangui.amazon.com` pour les USA)
   - **Amazon Page** : Sélectionnez votre domaine Amazon (ex. : `amazon.fr`)
   - **Language** : Sélectionnez votre langue (ex. : `en-US`)
3. Sauvegardez les identifiants et ajoutez un nœud **Alexa Remote** avec **Resource** : `Auth`, **Operation** : `Authenticate`
4. Lancez le workflow — le proxy démarre et affiche une URL de connexion dans les logs
5. Ouvrez l'URL dans votre navigateur et connectez-vous avec votre compte Amazon
6. Une fois connecté, le cookie est sauvegardé et les identifiants sont prêts

Le cookie sera automatiquement renouvelé selon le paramètre **Refresh Interval**.

### Tous les champs des identifiants

| Champ | Description | Défaut |
|---|---|---|
| **Proxy IP** | IP de votre serveur n8n | `localhost` |
| **Proxy Port** | Port du proxy | `3456` |
| **Cookie File Path** | Chemin pour sauvegarder/lire le fichier cookie JSON | `$N8N_USER_FOLDER/.alexa-cookie.json` |
| **Amazon Service Host** | Endpoint du service Alexa pour votre région | `pitangui.amazon.com` |
| **Amazon Page** | Domaine Amazon pour votre région | `amazon.com` |
| **Language** | Valeur du header Accept-Language | `en-US` |
| **Refresh Interval (Days)** | Intervalle de renouvellement automatique du cookie | `3` |

### Régions supportées

| Région | Amazon Service Host | Amazon Page |
|---|---|---|
| USA | `pitangui.amazon.com` | `amazon.com` |
| UK | `alexa.amazon.co.uk` | `amazon.co.uk` |
| Allemagne | `layla.amazon.de` | `amazon.de` |
| France | `layla.amazon.de` | `amazon.fr` |
| Italie | `alexa.amazon.it` | `amazon.it` |
| Espagne | `alexa.amazon.es` | `amazon.es` |
| Australie | `alexa.amazon.com.au` | `amazon.com.au` |
| Brésil | `alexa.amazon.com.br` | `amazon.com.br` |

## Compatibilité

- Version minimale de n8n : 1.0.0
- Testé avec n8n : 2.13.1
- Nécessite Node.js : ≥18.0.0

## Utilisation

### Exemple 1 : Première authentification

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Auth`, **Operation** : `Authenticate`
3. Définissez **Login Timeout** (minutes) — défaut : 5
4. Lancez le workflow et ouvrez l'URL affichée dans les logs
5. Connectez-vous avec votre compte Amazon
6. Le cookie est sauvegardé — vous n'aurez pas besoin de recommencer sauf si la session expire

### Exemple 2 : Faire parler Alexa

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Interaction`, **Operation** : `Speak`
3. Sélectionnez votre appareil dans la liste déroulante
4. Entrez le texte : `Bonjour depuis n8n !`
5. Exécutez le workflow

### Exemple 3 : Faire parler plusieurs appareils simultanément

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Interaction`, **Operation** : `Speak All (Multi-Device)`
3. Sélectionnez plusieurs appareils dans la liste déroulante
4. Entrez le texte et le type de parole
5. Exécutez

### Exemple 4 : Lire de la musique

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Interaction`, **Operation** : `Play Music`
3. Sélectionnez votre appareil
4. Sélectionnez **Music Provider** : `Amazon Music`
5. Entrez **Search Query** : `jazz relaxant`
6. Exécutez

### Exemple 5 : Contrôler un appareil domotique

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Smarthome`, **Operation** : `Control Device`
3. Sélectionnez l'entité dans la liste déroulante (ex. : `Lampe Salon`)
4. Sélectionnez **Action** : `Set Brightness`
5. Entrez **Value** : `75`
6. Exécutez

### Exemple 6 : Créer un rappel

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Notification`, **Operation** : `Create Notification`
3. Sélectionnez votre appareil
4. Sélectionnez **Type** : `Reminder`
5. Entrez **Label** : `Sortir les poubelles`
6. Entrez **Time** : `2026-03-20T18:00:00.000` (format ISO 8601)
7. Exécutez

### Exemple 7 : Déclencher sur une activité vocale

1. Ajoutez un nœud **Alexa Remote Trigger**
2. Sélectionnez **Event** : `Device Activity`
3. Activez le workflow
4. Chaque fois qu'une commande vocale est enregistrée sur un appareil Echo, le workflow se lance

### Exemple 8 : Exécuter une routine existante

1. Ajoutez un nœud **Alexa Remote**
2. Sélectionnez **Resource** : `Routine`, **Operation** : `Execute Routine`
3. Sélectionnez votre routine dans la liste déroulante
4. Exécutez

## Dépannage

### Problèmes d'authentification

- **Fichier cookie introuvable** : Exécutez d'abord l'opération `Auth → Authenticate` pour compléter la connexion Amazon
- **Le fichier cookie n'est pas un JSON valide** : Le fichier cookie est corrompu — relancez l'authentification
- **Erreur "no csrf"** : La session a expiré, relancez `Auth → Authenticate`
- **"401 Unauthorized"** : Cookie invalide ou expiré
- **Le proxy ne démarre pas** : Vérifiez que le port configuré n'est pas déjà utilisé

### Appareil introuvable

- Les appareils sont chargés dynamiquement depuis votre compte — exécutez d'abord `Auth → Authenticate`
- Utilisez le numéro de série directement via une expression n8n si la liste déroulante est vide
- Obtenez les numéros de série via l'opération `Device → Get Devices`

### Les commandes ne fonctionnent pas

- Vérifiez que l'appareil est en ligne et connecté
- Certaines commandes (ex. : `next`, `previous`) nécessitent que l'appareil soit en cours de lecture
- Vérifiez que votre compte Amazon a accès à l'appareil

### Le déclencheur ne se lance pas

- Vérifiez que la connexion WebSocket est établie (consultez les logs n8n)
- L'événement `All Messages` peut être utilisé pour déboguer — il se déclenche sur chaque événement entrant

## Ressources

- [Documentation des nœuds communautaires n8n](https://docs.n8n.io/integrations/#community-nodes)
- [Bibliothèque Alexa Remote 2](https://www.npmjs.com/package/alexa-remote2)
- [Implémentation Node-RED originale](https://github.com/bbindreiter/node-red-contrib-alexa-remote2-applestrudel)

## Crédits

Ce projet est inspiré de l'excellent projet [node-red-contrib-alexa-remote2-applestrudel](https://github.com/bbindreiter/node-red-contrib-alexa-remote2-applestrudel) de bbindreiter, qui utilise la bibliothèque [alexa-remote2](https://www.npmjs.com/package/alexa-remote2).

## Licence

[MIT](LICENSE)

## Auteur

**Développé avec ❤️ par [AC-CodeProd](https://github.com/AC-CodeProd)**
