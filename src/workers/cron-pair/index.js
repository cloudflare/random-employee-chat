import moment from "moment";
import blossom from "edmonds-blossom";

const TEST_MODE = false;

addEventListener("scheduled", (event) => {
  event.waitUntil(handleSchedule(event.scheduledTime));
});

function dedent(str) {
  str = str.replace(/^\n/, "");
  let match = str.match(/^\s+/);
  return match ? str.replace(new RegExp("^" + match[0], "gm"), "") : str;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function DBdelete(key) {
  if (TEST_MODE) {
    console.log("delete", key);
    return;
  }
  return DB.delete(key);
}

async function handleSchedule(scheduledDate) {
  const startOfWeek = moment().startOf("isoWeek").format("YYYY-MM-DD");

  const list = await getlist();
  let keys = shuffle(Object.keys(list));

  // for odd number of participants either remove david or remove a random person.
  if (keys.length % 2 !== 0) {
    const davidKey = "register:" + btoa("dwragg@cloudflare.com");
    let removedKey;

    if (keys.includes(davidKey)) {
      removedKey = davidKey;
      keys = keys.filter((x) => x !== davidKey);
    } else {
      removedKey = keys.pop();
    }

    const user = list[removedKey];

    await Promise.all([notifySorry(startOfWeek, user), DBdelete(removedKey)]);
  }

  async function createWeightedPairs() {
    const pairs = [];
    for (let i = 0; i < keys.length - 1; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const key = await getPairKey(list[keys[i]], list[keys[j]]);
        const count = await countTimesPaired(key);
        pairs.push([i, j, -1 * count]);
      }
    }
    return pairs;
  }

  const data = await createWeightedPairs();
  const results = blossom(data, true);

  const alreadyMatched = new Set();
  const matches = [];

  results.forEach((index, idx) => {
    if (index === -1) {
      const user = list[keys[idx]];
      console.warn("could not match", user);
      return;
    }

    const left = list[keys[index]];
    const right = list[keys[idx]];

    if (!alreadyMatched.has(left) && !alreadyMatched.has(right)) {
      matches.push([left, right, keys[index], keys[idx]]);
      alreadyMatched.add(left);
      alreadyMatched.add(right);
    }
  });

  for (let i = 0, len = matches.length; i < len; i++) {
    const [left, right, leftK, rightK] = matches[i];

    await Promise.all([
      notifyPaired(startOfWeek, left, right),
      recordPaired(left, right),
      DBdelete(leftK),
      DBdelete(rightK),
    ]);
  }
}

async function countTimesPaired(key) {
  const v = await DB.get(key, "json");
  if (v !== null && v.count) {
    return v.count;
  }
  return 0;
}

function getPairKey(left, right) {
  if (left.email > right.email) {
    return `paired:${btoa(left.email)}/${btoa(right.email)}`;
  } else {
    return `paired:${btoa(right.email)}/${btoa(left.email)}`;
  }
}

async function recordPaired(left, right) {
  const key = getPairKey(left, right);
  const count = await countTimesPaired(key);
  const data = {
    emails: [left.email, right.email],
    count: count + 1,
  };

  if (!TEST_MODE) {
    await DB.put(key, JSON.stringify(data));
  } else {
    console.log("PUT", key, data);
  }
}

// TODO: share with server list endpoint
async function getlist() {
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

  return out;
}

async function notifyPaired(startOfWeek, left, right) {
  const details = dedent(`
    You signed up for a Random Engineer Chat for the week starting ${startOfWeek}, and the two of you have been paired!

    The idea is simple:

    Schedule a 30-minute hangout sometime this week at a mutually convenient time (make sure you have your "Working Hours" set in Google Calendar to make this easier).

    Then just talk about whatever comes up!  By talking to someone on another team, you might learn a bit about their work and their team, but also get a new perspective on your own work. There's no fixed agenda, and nothing to prepare.

    Once you are done, please complete the very short feedback form at ${globalThis.FEEDBACK_FORM} to help determine whether this is worthwhile.
  `);

  const link =
    `https://www.google.com/calendar/render?action=TEMPLATE&text=Random+Engineer+Chat&add=${left.email}&add=${right.email}&details=` +
    details;

  const msg = {
    text: `Random Engineer Chat week starting ${startOfWeek} - you have paired <users/${left.id}> <users/${right.id}>!`,
    cards: [
      {
        sections: [
          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: "schedule",
                      onClick: {
                        openLink: {
                          url: link,
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return await fetch(GCHAT_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(msg),
  });
}

async function notifySorry(startOfWeek, user) {
  const text = dedent(`
    Hi <users/${user.id}>,

    You signed up for a Random Engineer Chat for the week starting ${startOfWeek}, unfortunately we weren't able to pair you with another person due to an odd number of participant.

    Please register on ${globalThis.URL} again for the next session.
  `);
  const msg = { text };

  return await fetch(GCHAT_WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(msg),
  });
}
