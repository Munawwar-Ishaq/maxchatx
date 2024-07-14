const express = require("express");
const cors = require("cors");
const http = require("http");
const bodyParser = require("body-parser");
const { Routers } = require("./Routes");
require("dotenv").config();
const { DB_CONNECTION } = require("./config");
const app = express();
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  }
});

// Socket.IO code
const SocketEvents = require('./sockets');
SocketEvents(io);

const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get('/', (req, res) => {
  res.send('hello');
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/", Routers);

DB_CONNECTION();

server.listen(port, () => console.log("Server is listening on port " + port));
server.on('error', (err) => {
  console.log('Server Error ' + err);
});
