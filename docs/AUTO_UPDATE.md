# Auto-Update Setup (GitHub Releases)

Har PC par lagi hui app khud GitHub Releases check karti hai, naya version
background mein download karti hai, aur restart par install kar deti hai.
Kisi ko manually exe bhejne ki zaroorat nahi.

## Kaise chalta hai

- App launch hote hi aur uske baad har 1 ghante baad check hoti hai.
- Naya version mile to chup-chaap download hota hai (sirf badle hue hisse,
  poora 86 MB nahi -- blockmap ki wajah se).
- Download poora hone par dialog aata hai: **"Abhi restart karein" / "Baad mein"**.
  - Abhi restart = turant install + app dobara khul jati hai.
  - Baad mein = jab user app band karega tab khud install ho jayega.
- Install per-user hai (`perMachine: false`), isliye admin password nahi maangta.
- Code: [electron/updater.ts](../electron/updater.ts), main process mein
  [electron/main.ts](../electron/main.ts) se call hota hai.
- Dev mode (`npm run dev`) mein updater band rehta hai -- sirf packaged app mein chalta hai.

## Ek dafa ka setup

### 1. GitHub par public repo banayein

Naam: `stylecraft-inventory` (owner: `hassanmian001`).
Ye naam `package.json` ke `build.publish` mein set hai -- badla to wahan bhi badalna hoga.

### 2. Repo ko push karein

```bash
git remote add origin https://github.com/hassanmian001/stylecraft-inventory.git
git push -u origin main
```

### 3. GitHub token banayein

GitHub > Settings > Developer settings > Personal access tokens >
**Tokens (classic)** > Generate new token, scope: **`repo`**.

Token ko environment variable mein rakhein (PowerShell, permanent):

```powershell
setx GH_TOKEN "ghp_xxxxxxxxxxxxxxxxxxxx"
```

Iske baad terminal band kar ke naya kholein.

> Token sirf aap ke PC par rehta hai. Ye app ke andar bundle nahi hota,
> isliye installer se koi nikal nahi sakta.

## Har naye update par (yahi routine hai)

```bash
# 1. version barhayein (0.1.3 -> 0.1.4)
npm version patch --no-git-tag-version

# 2. build + publish
npm run release

# 3. commit + push
git add -A
git commit -m "Release v0.1.4"
git push
```

`npm run release` khud hi:
- renderer + electron build karta hai,
- `better-sqlite3` ko Electron ke liye rebuild karta hai,
- NSIS installer banata hai,
- installer + `latest.yml` + `.blockmap` GitHub Release par upload karta hai,
- packaged sqlite verify karta hai, phir native module wapas Node ke liye rebuild kar deta hai.

Bas. Jitne PCs par app lagi hai, wo agle 1 ghante ke andar khud update ho jayenge.

## Pehli dafa PCs par kya karna hai

Auto-update sirf **0.1.4 aur uske baad** ke versions ke liye kaam karega, kyunki
purane 0.1.3 installer mein updater code nahi tha. Isliye:

1. `npm run release` se **0.1.4** publish karein.
2. Us 0.1.4 ka installer ek dafa manually har PC par chala dein.
3. Uske baad sab automatic.

## Troubleshooting

- **Update nahi aa raha:** GitHub Release **published** honi chahiye, draft nahi.
  Release ke assets mein `latest.yml` hona zaroori hai.
- **Version wahi rehta hai:** `package.json` ka `version` barhana bhool gaye.
  electron-updater sirf zyada version par update karta hai.
- **Errors dekhne hain:** installed app ko command prompt se
  `"StyleCraft Inventory.exe" --enable-logging` chala kar dekhein --
  updater ki errors console par `[updater]` prefix ke saath aati hain.
  (Alag log file nahi banti; chahen to `electron-log` add kiya ja sakta hai.)
