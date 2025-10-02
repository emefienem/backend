const Websocket = require("ws");
const express = require("express");
const app = express();
const PORT = 5000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const wss = new Websocket.Server({ server, path: "/ws" });

// helper function to send the updated players data
const sendPlayersData = (client) => {
  const addressList = [...wss.clients]
    .map((a) => a?.address)
    .filter((b) => !!b);
  client.send(
    JSON.stringify({
      type: "updatedPlayersList",
      addressList,
    })
  );
};

// helper function to send messages to player
const sendMessagesToPlayer = (playerAddress, msg) => {
  [...wss.clients].forEach((client) => {
    if (
      client.readyState === Websocket.OPEN &&
      client.address?.toLowerCase() === playerAddress?.toLowerCase()
    ) {
      client.send(JSON.stringify(msg));
    }
  });
};

// this is the websocket connection handling
wss.on("connection", (ws) => {
  console.log("Client is successfully connected");
  // send the updated player data
  sendPlayersData(ws);

  ws.on("message", (rawMsg) => {
    let data;
    try {
      data = JSON.parse(rawMsg);
    } catch (error) {
      console.error("Invalid message received here:", rawMsg);
      return;
    }

    switch (data.type) {
      case "newPlayer":
        ws.address = data.address;
        [...wss.clients].forEach((client) => {
          if (client.readyState === Websocket.OPEN) {
            sendPlayersData(client);
          }
        });
        break;

      case "newRequest":
        sendMessagesToPlayer(data.playerAddress, {
          type: "newRequest",
          contractAddress: data.contractAddress,
        });
        break;

      case "winner":
        sendMessagesToPlayer(data.playerAddress, {
          type: "winner",
          winner: data.winner,
        });
        break;

      case "solve":
        sendMessagesToPlayer(data.playerAddress, {
          type: "solve",
          contractAddress: data.contractAddress,
        });
        break;

      default:
        console.warn("Unknown message type:", data.type);
        break;
    }
  });

  // CLOSES THE WEBSOCKET CONNECTION
  ws.on("close", () => {
    console.log("Client is successfully closed");
  });
});
