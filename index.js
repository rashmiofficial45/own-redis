// TCP server implementation to connect with Redis clients
// Uses Node.js net module to create a server that listens on Redis default port

import net from "net";

// Redis default port is 6379
const port = 6379;

// Create a TCP server that handles incoming connections
const server = net.createServer((connection) => {
  // Log when a new client connects to the server
  console.log("Connection established");

  // Handle incoming data from the client
  connection.on("data", (data) => {
    // Log the received data as a string
    console.log("data:", data.toString());
    // Respond with Redis protocol simple string reply (+OK\r\n)
    connection.write("+OK\r\n");
  });
});

// Start the server and listen on the specified port
server.listen(port, () => console.log(`Server is running on port ${port}`));
