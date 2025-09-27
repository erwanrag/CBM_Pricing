# 📋 Mémo CBM Pricing : Lancer Redis sous Windows Server

## ✅ Pré-requis : Avoir téléchargé Redis Windows Port

* Lien : [https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)
* Fichier conseillé : `redis-x64-3.2.100.zip`
* Dézipper dans `C:\redis`

Contenu attendu :

```
C:\redis\redis-server.exe
C:\redis\redis-cli.exe
C:\redis\redis.windows.conf
```

---

## 🎯 Lancer Redis (à chaque redémarrage serveur)

1️⃣ Ouvrir une console `cmd` :

```bash
cd C:\redis
redis-server.exe redis.windows.conf
```

➡️ Laisser cette console OUVERTE pendant toute la session.

---

## 🎯 Vérifier que Redis est actif

Ouvrir une deuxième console `cmd` :

```bash
cd C:\redis
redis-cli.exe
ping
```

Si Redis est actif :

```
PONG
```

---

## 🛡️ Si problème : débloquer firewall temporairement (test uniquement)

```bash
netsh advfirewall set allprofiles state off
```

➡️ Relancer `redis-server.exe`
➡️ Tester avec `redis-cli.exe → ping`

Rétablir firewall ensuite :

```bash
netsh advfirewall set allprofiles state on
```

---

## ✅ Résultat attendu dans CBM Pricing API

Lorsque Redis fonctionne :

```
✅ Redis connecté
```

➡️ Cache actif → SQL Server soulagé → Performances optimales.

---

## 🚨 Important

* **Ne jamais fermer la console où tourne `redis-server.exe`**
* Redis Windows Port est une version "standalone" → pas un service.
* En production : prévoir soit Redis sous WSL, soit Redis sur VM Linux séparée.

---

CBM Pricing - Mémo interne | Dernière mise à jour : mai 2025
