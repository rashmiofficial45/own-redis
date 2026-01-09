import net from "net"
const port = 6379

const server = net.createServer(connection => {
    console.log("Connection established")
    connection.on("data", data => {
        console.log("data:",data.toString())
    })
})

server.listen(port, () => console.log(`Server is running on port ${port}`))