function dedent(str) {
  str = str.replace(/^\n/, "");
  let match = str.match(/^\s+/);
  return match ? str.replace(new RegExp("^" + match[0], "gm"), "") : str;
}

addEventListener("scheduled", (event) => {
  event.waitUntil(handleSchedule(event.scheduledTime));
});

async function handleSchedule(scheduledDate) {
  await notifyReminder();
}

async function notifyReminder() {
  const text = dedent(`
    Hi <users/all>,

    You participated to a Random Engineer Chat and it's time to sign up again!
  `);
  const msg = {
    text,
    cards: [
      {
        sections: [
          {
            widgets: [
              {
                buttons: [
                  {
                    textButton: {
                      text: "register",
                      onClick: {
                        openLink: {
                          url: globalThis.URL,
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
