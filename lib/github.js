// GitHub Contents API দিয়ে রিপোর ফাইল পড়া/লেখা।
// Vercel-এ লাগবে: GITHUB_TOKEN, GITHUB_REPO (যেমন "username/sangbad-probaho"), ঐচ্ছিক GITHUB_BRANCH

const API = "https://api.github.com";

function env() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) throw new Error("Vercel-এ GITHUB_TOKEN ও GITHUB_REPO সেট করা নেই");
  return { token, repo, branch };
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sangbad-probaho-admin",
  };
}

export async function readFile(path) {
  const { token, repo, branch } = env();
  const res = await fetch(`${API}/repos/${repo}/contents/${path}?ref=${branch}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (res.status === 404) return { text: null, sha: null };
  if (!res.ok) throw new Error(`GitHub read ${path}: ${res.status}`);
  const data = await res.json();
  let text;
  if (data.content) {
    text = Buffer.from(data.content, "base64").toString("utf8");
  } else {
    // ১ MB-এর বড় ফাইল: raw হিসেবে আনো
    const raw = await fetch(`${API}/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: { ...headers(token), Accept: "application/vnd.github.raw" },
      cache: "no-store",
    });
    text = await raw.text();
  }
  return { text, sha: data.sha };
}

export async function readJSON(path, fallback) {
  const { text, sha } = await readFile(path);
  if (text == null) return { data: fallback, sha: null };
  try {
    return { data: JSON.parse(text), sha };
  } catch {
    return { data: fallback, sha };
  }
}

export async function writeFile(path, base64Content, message, sha) {
  const { token, repo, branch } = env();
  const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: base64Content, branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub write ${path}: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

/** JSON ফাইল পড়ে, বদলে, আবার লেখে। কেউ মাঝখানে বদলালে (409) একবার আবার চেষ্টা করে। */
export async function updateJSON(path, fallback, mutate, message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, sha } = await readJSON(path, fallback);
    const next = await mutate(structuredClone(data));
    const body = Buffer.from(JSON.stringify(next, null, 1), "utf8").toString("base64");
    try {
      await writeFile(path, body, message, sha);
      return next;
    } catch (e) {
      if (!/409|422/.test(String(e.message)) || attempt === 2) throw e;
    }
  }
}
