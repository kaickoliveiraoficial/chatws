const { WebSocketServer } = require("ws")
const dotenv = require("dotenv")

dotenv.config()

const wss = new WebSocketServer({ port: process.env.PORT || 8080 })

// Lista de usuários conectados
let users = []

// Função para broadcast (envia mensagem a todos os clientes conectados)
const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(data))
    }
  })
}

wss.on("connection", (ws) => {
  let currentUser

  ws.on("message", (data) => {
    const message = JSON.parse(data)

    // Mensagem de login (ao conectar)
    if (message.type === "login") {
      currentUser = {
        id: message.userId,
        name: message.userName,
        color: message.userColor,
        socket: ws,
      }

      users.push(currentUser)

      // Envia a lista atualizada de usuários para todos
      broadcast({
        type: "user-update",
        users: users.map(({ id, name, color }) => ({ id, name, color })),
      })

      // Notificação de novo usuário
      broadcast({
        type: "system-message",
        content: `${message.userName} entrou na sala`,
      })
    }

    // Mensagem normal de chat
    if (message.type === "chat") {
      broadcast({
        type: "chat",
        userId: message.userId,
        userName: message.userName,
        userColor: message.userColor,
        content: message.content,
      })
    }

    // Mensagem de "digitando"
    if (message.type === "typing") {
      broadcast({
        type: "typing",
        userName: message.userName,
        isTyping: message.isTyping,
      })
    }
  })

  ws.on("close", () => {
    if (currentUser) {
      users = users.filter((user) => user.id !== currentUser.id)

      // Envia a lista atualizada de usuários para todos
      broadcast({
        type: "user-update",
        users: users.map(({ id, name, color }) => ({ id, name, color })),
      })

      // Notificação de saída do usuário
      broadcast({
        type: "system-message",
        content: `${currentUser.name} saiu da sala`,
      })
    }
  })

  ws.on("error", console.error)
})

console.log("WebSocket server running...")