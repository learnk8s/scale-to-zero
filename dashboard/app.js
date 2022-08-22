const app = App();
const jsConfetti = new JSConfetti();
let lastResourceVersion;

fetch("/api/v1/pods")
  .then((response) => response.json())
  .then((response) => {
    const pods = response.items;
    lastResourceVersion = response.metadata.resourceVersion;
    pods.forEach((pod) => {
      const podId = `${pod.metadata.namespace}-${pod.metadata.name}`;
      app.upsert(podId, pod);
    });
  })
  .then(() => streamUpdates());

function streamUpdates() {
  fetch(`/api/v1/pods?watch=1&resourceVersion=${lastResourceVersion}`)
    .then((response) => {
      const stream = response.body.getReader();
      const utf8Decoder = new TextDecoder("utf-8");
      let buffer = "";

      return stream.read().then(function processText({ done, value }) {
        if (done) {
          console.log("Request terminated");
          return;
        }
        buffer += utf8Decoder.decode(value);
        buffer = onNewLine(buffer, (chunk) => {
          if (chunk.trim().length === 0) {
            return;
          }
          try {
            const event = JSON.parse(chunk);
            const pod = event.object;
            console.log("PROCESSING EVENT: ", event, pod);
            const podId = `${pod.metadata.namespace}-${pod.metadata.name}`;
            switch (event.type) {
              case "ADDED": {
                if (pod.status.phase === "Running") {
                  app.upsert(podId, pod);
                }
                break;
              }
              case "DELETED": {
                app.remove(podId);
                break;
              }
              case "MODIFIED": {
                if (pod.status.phase === "Running") {
                  app.upsert(podId, pod);
                }
                break;
              }
              default:
                break;
            }
            lastResourceVersion = event.object.metadata.resourceVersion;
          } catch (error) {
            console.log("Error while parsing", chunk, "\n", error);
          }
        });
        return stream.read().then(processText);
      });
    })
    .catch(() => {
      console.log("Error! Retrying in 5 seconds...");
      setTimeout(() => streamUpdates(), 5000);
    });

  function onNewLine(buffer, fn) {
    const newLineIndex = buffer.indexOf("\n");
    if (newLineIndex === -1) {
      return buffer;
    }
    const chunk = buffer.slice(0, buffer.indexOf("\n"));
    const newBuffer = buffer.slice(buffer.indexOf("\n") + 1);
    fn(chunk);
    return onNewLine(newBuffer, fn);
  }
}

function App() {
  let queueSize = 0;
  const allPods = new Map();
  const content = document.querySelector("#content");
  const queue = document.querySelector("#size");

  function render() {
    const pods = Array.from(allPods.values()).filter((it) =>
      /podinfo|keda|nginx/.test(it.name)
    );
    if (pods.length === 0) {
      return;
    }
    const podsByNode = groupBy(pods, (it) => it.nodeName);
    const nodeTemplates = Object.keys(podsByNode).map((nodeName) => {
      const pods = podsByNode[nodeName].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return [
        '<li class="">',
        "<div>",
        `<div class="bg-dark-pink ba bw2 b--pink w5 h5 center">${renderNode(
          pods
        )}</div>`,
        "</div>",
        "</li>",
      ].join("");
    });

    content.innerHTML = `<ul class="list pl0 flex flex-wrap center">${nodeTemplates.join(
      ""
    )}</ul>`;
    queue.innerHTML = `${queueSize}`;

    function renderNode(pods) {
      const n = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-35.5 26 32 32"><path d="M-33.442 42.023v-7.637a.68.68 0 0 1 .385-.651l13.173-7.608c.237-.148.503-.178.74-.03l13.232 7.637a.71.71 0 0 1 .355.651V49.63a.71.71 0 0 1-.355.651l-11.367 6.57a56.27 56.27 0 0 1-1.806 1.036.776.776 0 0 1-.8 0l-13.202-7.608c-.237-.148-.355-.326-.355-.622V42.02z" fill="#009438"/><path d="M-24.118 39.18v8.9c0 1.006-.8 1.894-1.865 1.865-.65-.03-1.154-.296-1.5-.858-.178-.266-.237-.562-.237-.888V35.836c0-.83.503-1.42 1.154-1.687s1.302-.207 1.954 0c.622.178 1.095.562 1.5 1.036l7.874 9.443c.03.03.06.09.118.148v-9c0-.947.65-1.687 1.57-1.776 1.154-.148 1.924.68 2.042 1.54v12.6c0 .7-.326 1.214-.918 1.54-.444.237-.918.296-1.42.266a3.23 3.23 0 0 1-1.954-.829c-.296-.266-.503-.592-.77-.888l-7.49-8.97c0-.03-.03-.06-.06-.09z" fill="#fefefe"/></svg>`;
      const octopus = `<svg viewBox="0 0 242 242" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M120.503 168.966c25.456-7.335 25.864.252 49.936-23.368 24.072-23.62 37.219-62.15 37.219-62.15l-9.661-32.15-91.078 40.433-5.93 73.877s-5.943 10.692 19.514 3.358Z" fill="#65337B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.988 182.515c0 1.282 1.836 16.427 13.91 28.607 12.075 12.18 31.008 16.701 31.008 16.701l-11.42-48.847s-33.498 2.258-33.498 3.539Z" fill="#A476B4" stroke="#65337B" stroke-width="2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M35.934 178.976s5.203 29.944 12.724 42.254c7.52 12.311 15.711 15.215 23.592 17.192 7.88 1.976 15.254-4.314 16.855-7.046 1.6-2.733-5.474-6.602-8.277-7.6-2.804-.999-5.012 4.059-6.323 2.4-1.312-1.66-5.766-7.036-6.666-17.477-.9-10.441 1.482-21.433 1.482-21.433l-33.387-8.29Z" fill="#A476B4" stroke="#65337B" stroke-width="2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M56.105 187.779c2.978 2.025 6.68 12.531 12.212 17.704 5.533 5.172 10.156 6.915 15.388 8.099 5.233 1.184 19.473-3.498 18.94-6.606-.533-3.108-6.49-5.277-8.94-6.296-2.45-1.018-4.47 1.69-6.2 0-1.729-1.689-8.6-18.164-8.6-18.164s-25.778 3.238-22.8 5.263Z" fill="#A476B4" stroke="#65337B" stroke-width="2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M50.835 194.241c22.07-1.665 62.082-21.545 69.669-25.275 7.587-3.731 3.461.842 9.028-13.418 5.568-14.26-1.649-22.611 7.785-29.642 9.434-7.03 15.576 12.672 31.99 0 16.415-12.671 12.994-32.909 20.985-40.897 5.902-5.898 16.207-5.754 21.194-5.275 4.987.48 12.203-6.749 12.462-9.677.259-2.928-3.844 0-6.424-5.376-2.581-5.375 18.252-23.366 19.379-26.452 1.126-3.087-4.53-3.087-8.398-3.634-3.868-.547-8.562-23.468-10.981-26.95-2.419-3.483-6.189-6.853-9.667-2.782-3.477 4.072-.375 8.364-1.2 15.504-.824 7.14-2.234 14.228-2.234 14.228S157.478 5.36 120.504 6.22c-36.973.861-46.75 12.437-70.84 32.009C25.574 57.8 19.223 91.413 19.223 91.413s9.542 104.492 31.612 102.828Z" fill="#A476B4" stroke="#65337B" stroke-width="2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M27.541 82.185C13.126 79.035 7.176 92.41 7.176 105.121s20.365 27.081 20.365 27.081" fill="#A476B4"/><path d="M27.541 82.185C13.126 79.035 7.176 92.41 7.176 105.121s20.365 27.081 20.365 27.081" stroke="#65337B" stroke-width="2"/><circle cx="60.906" cy="97.376" r="21.4" fill="#fff" stroke="#65337B" stroke-width="2.8"/><circle cx="56.105" cy="95.777" r="16.8" fill="#65337B"/><path d="M18.538 116.73c-2.708 0-5.243-1.451-7.139-3.961-1.895-2.509-3.1-6.027-3.1-9.959 0-3.933 1.205-7.45 3.1-9.96 1.896-2.51 4.43-3.96 7.14-3.96 2.708 0 5.243 1.45 7.138 3.96 1.896 2.51 3.101 6.027 3.101 9.96 0 3.932-1.205 7.45-3.1 9.959-1.896 2.51-4.43 3.961-7.14 3.961Z" fill="#fff" stroke="#65337B" stroke-width="2.24"/><ellipse cx="19.223" cy="99.844" rx="11.04" ry="8.32" transform="rotate(90 19.223 99.844)" fill="#65337B"/><path fill-rule="evenodd" clip-rule="evenodd" d="M25.47 122.35c3.067.407 11.113 11.332 12.634 21.882 1.52 10.55 2.156 10.104 1.2 22.341-.957 12.237-1.888 21.404-4.799 23.703-2.91 2.3-13.396.533-19.98-3.7-6.584-4.234-12.875-8.011-9.657-26.254 3.217-18.244 19.269-28.244 19.269-28.244l-4.915 19.298s7.136-5.196 8.32-8.853c1.184-3.657-2.072-10.445-2.072-10.445s-3.067-10.136 0-9.728Z" fill="#A476B4" stroke="#65337B" stroke-width="2"/><path fill-rule="evenodd" clip-rule="evenodd" d="M79.229 146.714s-16.072 12.893-19.564 13.308c-3.492.416-3.866-5.587-3.56-10.557.307-4.97 4.8-9.569 4.8-9.569s14.56-9.921 12-12.12c-2.56-2.2-13.893.991-20.956 4.426-7.062 3.435-12.191 11.697-12.191 11.697s1.92 38.946 3.913 45.206c1.994 6.26 12.126 5.161 12.126 5.161l40.078-13.69" fill="#A476B4"/><path d="M79.229 146.714s-16.072 12.893-19.564 13.308c-3.492.416-3.866-5.587-3.56-10.557.307-4.97 4.8-9.569 4.8-9.569s14.56-9.921 12-12.12c-2.56-2.2-13.893.991-20.956 4.426-7.062 3.435-12.191 11.697-12.191 11.697s1.92 38.946 3.913 45.206c1.994 6.26 12.126 5.161 12.126 5.161l40.078-13.69" stroke="#65337B" stroke-width="2"/></svg>`;
      return [
        '<ul class="list pt1 pl1 flex flex-wrap">',
        pods
          .map((pod) => {
            if (pod.name.includes("nginx")) {
              return [
                '<li class="relative">',
                `<div class="ma2 w3 h3" data-tooltip="${pod.name}">${n}</div>`,
                "</li>",
              ].join("");
            }
            if (pod.name.includes("podinfo")) {
              return [
                '<li class="relative">',
                `<div class="ma2 w3 h3" data-tooltip="${pod.name}">${octopus}</div>`,
                "</li>",
              ].join("");
            }
            return [
              '<li class="relative">',
              `<div class="ma2 w3 h3 bg-green" data-tooltip="${pod.name}"></div>`,
              "</li>",
            ].join("");
          })
          .join(""),
        "</ul>",
      ].join("");
    }
  }

  return {
    upsert(podId, pod) {
      if (!pod.spec.nodeName) {
        return;
      }
      allPods.set(podId, {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        nodeName: pod.spec.nodeName,
      });
      render();
    },
    updateQueueSize(size) {
      queueSize = size;
      render();
    },
    remove(podId) {
      allPods.delete(podId);
      render();
    },
  };
}

function groupBy(arr, groupByKeyFn) {
  return arr.reduce((acc, c) => {
    const key = groupByKeyFn(c);
    if (!(key in acc)) {
      acc[key] = [];
    }
    acc[key].push(c);
    return acc;
  }, {});
}

setInterval(() => {
  fetch(
    "/api/v1/namespaces/default/services/keda-add-ons-http-interceptor-admin:9090/proxy/queue"
  )
    .then((response) => response.json())
    .then((response) => {
      app.updateQueueSize(response["example.com"]);
    });
}, 300);

document.querySelector("#go")?.addEventListener("click", (e) => {
  jsConfetti.addConfetti({
    emojis: ["🌈", "⚡️", "💥", "✨", "💫", "🌸"],
    emojiSize: 200,
    confettiNumber: 20,
  });
  const url = start.querySelector("input").value;
  fetch(
    url.startsWith("http://")
      ? `${url}?${Date.now()}`
      : `http://${url}?${Date.now()}`,
    {
      mode: "no-cors",
      cache: "no-cache",
    }
  );
});

document.querySelector("#reset")?.addEventListener("click", (e) => {
  fetch("/apis/apps/v1/namespaces/default/deployments/podinfo", {
    method: "PATCH",
    body: JSON.stringify({ spec: { replicas: 0 } }),
    headers: {
      "Content-Type": "application/strategic-merge-patch+json",
    },
  }).then((response) => response.json());
});

start.querySelector("#start button")?.addEventListener(
  "click",
  () => {
    start.classList.add("dn");
    root.classList.remove("dn");
  },
  { once: true }
);
