# Night Credit — Guide d'installation

## Prérequis

Installe **Node.js** (version 18 ou plus) depuis : https://nodejs.org/en/download

---

## Installation (une seule fois)

### 1. Ouvrir un terminal dans le dossier du projet

```
cd C:\Users\PC\night-credit-app
```

### 2. Installer les dépendances du serveur

```
cd server
npm install
```

### 3. Initialiser la base de données

```
npx prisma migrate dev --name init
node prisma/seed.js
```

### 4. Installer les dépendances du frontend

```
cd ..\client
npm install
```

---

## Lancement (chaque fois)

Ouvrir **deux terminaux** :

**Terminal 1 — Serveur :**
```
cd C:\Users\PC\night-credit-app\server
npm run dev
```
→ Serveur disponible sur http://localhost:3001

**Terminal 2 — Frontend :**
```
cd C:\Users\PC\night-credit-app\client
npm run dev
```
→ Application disponible sur http://localhost:5173

---

## Comptes par défaut (créés par le seed)

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@nightcredit.com | admin1234 |
| Comptable | comptable@nightcredit.com | comptable1234 |

**Établissements créés :** Club Étoile, Le Palace, Night Lounge

---

## Import des anciennes données

1. Connecte-toi en tant qu'admin
2. Va dans **Import Excel** dans le menu
3. Télécharge le **template Excel** pour voir le format attendu
4. Remplis le fichier avec tes données (une ligne par consommation ou paiement)
5. Importe le fichier → les clients non existants seront créés avec le PIN **0000**
6. Pense à communiquer leurs nouveaux PIN aux clients

---

## Colonnes du fichier d'import

| Colonne | Description | Exemple |
|---------|-------------|---------|
| date | Date de la transaction (YYYY-MM-DD) | 2024-01-15 |
| prenom | Prénom du client | Jean |
| nom | Nom du client | Dupont |
| telephone | Numéro de téléphone (unique) | 0600000001 |
| etablissement | Nom de l'établissement | Club Étoile |
| ref_ticket | Référence du ticket (optionnel) | T-001 |
| consommation | Montant consommé (laisser vide si paiement) | 150 |
| paiement | Montant payé (laisser vide si consommation) | |
| moyen_paiement | ESPECES / CB / VIREMENT / CHEQUE / MOBILE_MONEY | |
| notes | Notes internes (non visibles du client) | Table VIP |

---

## Installation PWA (optionnel)

Pour installer l'application sur un téléphone Android/iOS :
1. Ouvre http://[IP-du-serveur]:5173 dans Chrome ou Safari
2. Clique sur "Ajouter à l'écran d'accueil" / "Installer l'application"
3. L'app sera accessible comme une application native

---

## Structure du projet

```
night-credit-app/
├── server/          → Backend Node.js + Express + Prisma
│   ├── prisma/      → Schéma BDD + seed
│   ├── src/
│   │   ├── routes/  → API endpoints
│   │   ├── middleware/
│   │   └── services/
│   └── uploads/     → Photos des tickets
└── client/          → Frontend React + Vite + TailwindCSS
    └── src/
        ├── pages/admin/    → Espace comptabilité
        └── pages/client/   → Espace client
```
