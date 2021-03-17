import { Router } from "./router.js";
import { v4 as uuidv4 } from "uuid";

import homepage from "raw-loader!../public/index.html";
import publicjs from "raw-loader!../public/index.js";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function getUser(token) {
  const res = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + token
  );
  const info = await res.json();

  if ("error" in info) {
    throw new Error(info.error + ": " + info.error_description);
  }
  // check the hosted G Suite domain of the user
  if (info.hd !== "cloudflare.com") {
    throw new Error("user not allowed");
  }

  return info;
}

async function handlePostRegister(request) {
  try {
    const { userToken } = await request.json();
    const user = await getUser(userToken);
    if (!user) {
      return new Response("no user info; please login.", { status: 500 });
    }

    const data = {
      name: user.name,
      picture: user.picture,
      email: user.email,
      id: user.sub,
    };
    const key = "register:" + btoa(user.email);
    await DB.put(key, JSON.stringify(data));

    return new Response(key);
  } catch (e) {
    return new Response(e.stack, { status: 500 });
  }
}

async function handleListRegister(request) {
  const userToken = new URL(request.url).searchParams.get("token");
  const user = await getUser(userToken);
  if (!user) {
    return new Response("no user info; please login.", { status: 500 });
  }

  const list = await DB.list({ prefix: "register:" });
  if (!list.list_complete) {
    throw new Error("unimplemented");
  }

  let out = {};
  for (let i = 0, len = list.keys.length; i < len; i++) {
    const key = list.keys[i].name;
    const data = await DB.get(key, "json");
    out[key] = data;
  }

  return new Response(JSON.stringify(out));
}

async function handleRequest(request) {
  try {
    const r = new Router();
    r.get(
      "/public/index.js",
      () =>
        new Response(publicjs, {
          headers: {
            "content-type": "application/javascript",
          },
        })
    );

    r.get("/list-registered", handleListRegister);
    r.post("/register", handlePostRegister);

    r.get(
      "/",
      () =>
        new Response(homepage, {
          headers: {
            "content-type": "text/html",
          },
        })
    );

    r.get("/.*", () => new Response("404", { status: 404 }));

    return await r.route(request);
  } catch (e) {
    return new Response(e.stack, { status: 500 });
  }
}
