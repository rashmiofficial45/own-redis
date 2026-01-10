// TCP server implementation to connect with Redis clients
// Uses Node.js net module to create a server that listens on Redis default port

import net from "net";
import Parser from "redis-parser";
// Redis default port is 6379
const port = 6379;
const store = {};
// Create a TCP server that handles incoming connections
const server = net.createServer((connection) => {
  // Handle incoming data from the client
  connection.on("data", (data) => {
    const parser = new Parser({
      returnReply: (reply) => {
        const command = reply[0];
        switch (command) {
          case "set":
            {
              const key = reply[1];
              const value = reply[2];
              store[key] = value;
              connection.write("+Ok\r\n");
            }
            break;
          case "get":
            {
              const key = reply[1];
              const value = store[key];
              if (!value) connection.write("$-1\r\n");
              connection.write(`+${value}\r\n`);
            }
            break;
        }
      },
      returnError: (err) => {
        console.log("error => ", err);
      },
    });
    parser.execute(data);

    // Respond with Redis protocol simple string reply (+OK\r\n)
  });
});

// Start the server and listen on the specified port
server.listen(port, () => console.log(`Server is running on port ${port}`));
