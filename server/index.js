import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

dotenv.config();
const port = process.env.PORT ?? 3000;

const app = express();
app.use(logger("dev"));
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

const db = createClient({
  url: "libsql://decent-shamrock-carlosducros.turso.io",
  authToken: process.env.DB_TOKEN,
});

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    content TEXT
    )
    `);

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("an user has disconnected");
  });

  socket.on("chat message", async (msg) => {
    let result;
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content) VALUES (:msg)`,
        args: { msg },
      });
    } catch (error) {
      console.error(error);
      return;
    }
    io.emit("chat message", msg, result.lastInsertRowid.toString());
  });
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
