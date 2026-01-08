import { WebSocketServer } from "ws";
import http from "http";
import { setupWSConnection } from "@y/websocket-server/utils";

const wss = new WebSocketServer({ noServer: true });
const host = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "1234");

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

wss.on("connection", setupWSConnection);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, host, () => {
  console.log(`Yjs WebSocket server running on ws://${host}:${port}`);
});
