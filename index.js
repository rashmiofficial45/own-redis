/**
 * TCP server implementation to connect with Redis clients.
 * This server mimics Redis behavior by:
 * - Listening on Redis default port (6379)
 * - Parsing Redis protocol commands
 * - Storing key-value pairs in memory
 * - Responding with Redis protocol formatted replies
 * Uses Node.js net module to create a TCP server that handles incoming connections.
 */

import net from "net";
import Parser from "redis-parser";

/**
 * Configuration constants:
 * - port: Redis default port number (6379)
 * - store: In-memory key-value store to simulate Redis data storage
 */
const port = 6379;
const store = {};

/**
 * Create a TCP server that handles incoming client connections.
 * Each connection represents a client session and maintains its own state.
 */
const server = net.createServer((connection) => {
  /**
   * Handle incoming data from the client.
   * Data is received as a Buffer containing Redis protocol formatted commands.
   * The Redis parser is used to decode the protocol and extract commands.
   */
  connection.on("data", (data) => {
    /**
     * Initialize a Redis protocol parser for this data stream.
     * The parser decodes Redis protocol messages and calls appropriate handlers:
     * - returnReply: Called when a valid command is parsed
     * - returnError: Called when parsing errors occur
     */
    const parser = new Parser({
      /**
       * Handle successfully parsed Redis commands.
       * The reply array contains:
       * - reply[0]: Command name (e.g., "SET", "GET")
       * - reply[1], reply[2], etc.: Command arguments
       */
      returnReply: (reply) => {
        const command = reply[0];

        /**
         * Process different Redis commands based on the command type.
         * Currently supports:
         * - SET: Store a key-value pair in memory
         * - GET: Retrieve a value by key from memory
         */
        switch (command) {
          /**
           * SET command implementation:
           * Stores a key-value pair in the in-memory store.
           * Responds with "+OK\r\n" (Redis protocol simple string reply) on success.
           */
          case "set": {
            const key = reply[1];
            const value = reply[2];
            store[key] = value;
            // Redis protocol simple string reply format
            connection.write("+Ok\r\n");
            break;
          }

          /**
           * GET command implementation:
           * Retrieves a value by key from the in-memory store.
           * Responds with:
           * - "$-1\r\n" (null bulk string) if key doesn't exist
           * - "+{value}\r\n" (simple string) if key exists
           */
          case "get": {
            const key = reply[1];
            const value = store[key];
            // Redis protocol null bulk string reply for non-existent keys
            if (!value) connection.write("$-1\r\n");
            // Redis protocol simple string reply with the value
            connection.write(`+${value}\r\n`);
            break;
          }
          // ---------------- PING ----------------
          case "ping": {
            connection.write("+PONG\r\n");
            break;
          }

          // ---------------- DEL ----------------
          case "del": {
            const key = reply[1];

            if (store[key] !== undefined) {
              delete store[key];
              connection.write(":1\r\n"); // integer reply (1 = deleted)
            } else {
              connection.write(":0\r\n"); // not found
            }
            break;
          }

          // ---------------- EXISTS ----------------
          case "exists": {
            const key = reply[1];
            const exists = store[key] !== undefined ? 1 : 0;
            connection.write(`:${exists}\r\n`);
            break;
          }

          // ---------------- INCR ----------------
          case "incr": {
            const key = reply[1];

            if (store[key] === undefined) {
              store[key] = 1;
            } else {
              const num = Number(store[key]);
              if (isNaN(num)) {
                connection.write("-ERR value is not an integer\r\n");
                return;
              }
              store[key] = num + 1;
            }
            connection.write(`:${store[key]}\r\n`);
            break;
          }
          // 1. EXPIRE
          case "expire": {
            const key = reply[1];
            const seconds = Number(reply[2]);
            if (store[key] === undefined) return connection.write(":0\r\n");
            expiry[key] = Date.now() + seconds * 1000;
            connection.write(":1\r\n");
            break;
          }
          // 2. TTL
          case "ttl": {
            const key = reply[1];
            if (store[key] === undefined) return connection.write(":-2\r\n");
            if (!expiry[key]) return connection.write(":-1\r\n");
            const ttl = Math.ceil((expiry[key] - Date.now()) / 1000);
            connection.write(`:${ttl}\r\n`);
            break;
          }
          // 3. DECR
          case "decr": {
            const key = reply[1];
            if (store[key] === undefined) store[key] = 0;
            const num = Number(store[key]);
            if (isNaN(num))
              return connection.write("-ERR value is not an integer\r\n");
            store[key] = num - 1;
            connection.write(`:${store[key]}\r\n`);
            break;
          }
          // 4. MSET
          case "mset": {
            for (let i = 1; i < reply.length; i += 2) {
              store[reply[i]] = reply[i + 1];
            }
            connection.write("+OK\r\n");
            break;
          }
          // ---------------- FALLBACK ----------------
          default:
            connection.write("-ERR unknown command\r\n");
        }
      },

      /**
       * Handle parsing errors.
       * Logs any errors that occur during Redis protocol parsing.
       */
      returnError: (err) => {
        console.log("error => ", err);
      },
    });

    /**
     * Execute the parser on the received data buffer.
     * This will trigger either returnReply or returnError callbacks
     * depending on whether the data is valid Redis protocol.
     */
    parser.execute(data);
  });
});

/**
 * Start the server and begin listening for incoming connections on the configured port.
 * Once the server is ready, a confirmation message is logged to the console.
 */
server.listen(port, () => console.log(`Server is running on port ${port}`));
