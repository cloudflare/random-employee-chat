let userToken = "";

function onSignIn(googleUser) {
  userToken = googleUser.getAuthResponse().id_token;

  document.getElementById("register-btn").style = "display:block";
  displayList();
}

function register() {
  const data = { userToken };

  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log("Success:", data);

      displayList();
      success("You successfully registered. <br />Since KV has cached the particpant list in the colo it can take up to 60s to show up.");
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function success(msg) {
  const element = document.getElementById("ok-notif");
  element.style = "display:block";
  element.innerHTML = "Success: " + msg;
}

async function displayList() {
  const list = await (
    await fetch("/list-registered?token=" + userToken)
  ).json();
  const element = document.getElementById("list");

  element.innerHTML = "";

  if (Object.entries(list).length === 0) {
    element.innerHTML += "No one registered yet.";
    return;
  }

  for (let [key, value] of Object.entries(list)) {
    element.innerHTML += `
      <div class="user">
        <img src="${value.picture}" alt="avatar" />
        <p>${value.name}</p>
        <p>${value.email}</p>
      </div>
    `;
  }
}
