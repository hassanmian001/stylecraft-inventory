#!/usr/bin/env node
"use strict";

// electron-builder ek publisher per artifact chalata hai (exe aur blockmap).
// Agar GitHub release mojood na ho to dono ek saath use banane ki koshish
// karte hain -- ek 422 "Published releases must have a valid tag" de kar
// process maar deta hai, ya do duplicate releases ban jati hain.
// Isliye publish se pehle release yahan bana lete hain.

const https = require("node:https");
const pkg = require("../package.json");

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const publish = Array.isArray(pkg.build.publish) ? pkg.build.publish[0] : pkg.build.publish;
const tag = `v${pkg.version}`;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request(
      {
        method,
        hostname: "api.github.com",
        path,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "user-agent": "stylecraft-release-script",
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function main() {
  if (!token) {
    throw new Error("GH_TOKEN set nahi hai. docs/AUTO_UPDATE.md ka Step 3 dekhein.");
  }
  if (!publish || publish.provider !== "github") {
    throw new Error("package.json build.publish mein github provider nahi mila.");
  }

  const base = `/repos/${publish.owner}/${publish.repo}`;

  const tagRef = await request("GET", `${base}/git/ref/tags/${tag}`);
  if (tagRef.status === 404) {
    throw new Error(
      `Tag ${tag} GitHub par nahi hai. Pehle chalayein: git push && git push --tags`,
    );
  }
  if (tagRef.status !== 200) {
    throw new Error(`Tag check fail hua (${tagRef.status}): ${tagRef.body}`);
  }

  const existing = await request("GET", `${base}/releases/tags/${tag}`);
  if (existing.status === 200) {
    console.log(`GitHub release ${tag} pehle se mojood hai -- publish usi mein assets daalega.`);
    return;
  }
  if (existing.status !== 404) {
    throw new Error(`Release check fail hua (${existing.status}): ${existing.body}`);
  }

  const created = await request("POST", `${base}/releases`, {
    tag_name: tag,
    name: tag,
    draft: false,
    prerelease: false,
  });
  if (created.status !== 201) {
    throw new Error(`Release ban nahi saki (${created.status}): ${created.body}`);
  }

  console.log(`GitHub release ${tag} bana di gayi.`);
}

main().catch((error) => {
  console.error(`ensure-github-release: ${error.message}`);
  process.exit(1);
});
