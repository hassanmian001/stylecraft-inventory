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
# 1. version barhayein -- ye khud commit aur git tag (v0.1.5) bhi bana deta hai
npm version patch -m "Release v%s"

# 2. commit + tag GitHub par bhejein
#    TAG PEHLE JANA ZAROORI HAI, warna publish is error par fail ho jata hai:
#    "Published releases must have a valid tag"
git push && git push --tags

# 3. build + publish
npm run release
```

`npm version` chalane se pehle working tree clean hona chahiye (sab kuch commit ho).

`npm run release` khud hi:
- renderer + electron build karta hai,
- `better-sqlite3` ko Electron ke liye rebuild karta hai,
- GitHub par release pehle se bana deta hai (`scripts/ensure-github-release.cjs`) --
  ye zaroori hai kyunki electron-builder exe aur blockmap ke liye alag-alag
  publisher chalata hai, aur dono ek saath release banane ki koshish karein to
  ya to 422 error aata hai ya do duplicate releases ban jati hain,
- NSIS installer banata hai,
- installer + `latest.yml` + `.blockmap` GitHub Release par upload karta hai,
- packaged sqlite verify karta hai, phir native module wapas Node ke liye rebuild kar deta hai.

Bas. Jitne PCs par app lagi hai, wo agle 1 ghante ke andar khud update ho jayenge.

## Pehli dafa PCs par kya karna hai

Auto-update sirf **0.1.4 aur uske baad** ke versions ke liye kaam karega, kyunki
purane 0.1.3 installer mein updater code nahi tha. Isliye:

1. 0.1.4 publish ho chuki hai:
   <https://github.com/hassanmian001/stylecraft-inventory/releases/latest>
2. Wahan se `StyleCraft-Inventory-Setup-0.1.4.exe` download kar ke har PC par
   ek dafa manually chala dein (purani 0.1.3 ke upar hi install ho jayegi,
   data safe rehta hai).
3. Uske baad sab automatic.

## Troubleshooting

- **Update nahi aa raha:** GitHub Release **published** honi chahiye, draft nahi.
  Release ke assets mein `latest.yml` hona zaroori hai.
- **Version wahi rehta hai:** `package.json` ka `version` barhana bhool gaye.
  electron-updater sirf zyada version par update karta hai.
- **Ek hi tag par do releases ban gayin:** purani wali (jis mein `latest.yml` nahi)
  GitHub par delete kar dein. `scripts/ensure-github-release.cjs` ab ye hone se rokta hai.
- **Errors dekhne hain:** installed app ko command prompt se
  `"StyleCraft Inventory.exe" --enable-logging` chala kar dekhein --
  updater ki errors console par `[updater]` prefix ke saath aati hain.
  (Alag log file nahi banti; chahen to `electron-log` add kiya ja sakta hai.)
