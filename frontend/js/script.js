// login elements
const login = document.querySelector(".login")
const loginForm = login.querySelector(".login-form")
const loginInput = login.querySelector(".login-input")

// chat elements
const chat = document.querySelector(".chat")
const chatForm = chat.querySelector(".chat-form")
const chatInput = chat.querySelector(".chat-input")
const chatMessages = chat.querySelector(".chat-messages")
const onlineUsersList = document.querySelector(".online-users") // Exibir usuários online
const typingIndicator = document.querySelector(".typing-indicator") // Indicador de "digitando"

const colors = [
  "cadetblue", "darkgoldenrod", "cornflowerblue", "darkkhaki", "hotpink", "gold",
  "brown", "burlywood", "chocolate", "cornsilk", "crimson", "darkcyan",
  "dodgerblue", "fuchsia", "khaki", "lightsalmon", "lightseagreen",
  "mediumorchid", "olive", "palegreen", "peru", "turquoise", "springgreen",
  "tan", "teal", "tomato"
]

const user = { id: "", name: "", color: "" }

let websocket
let typingTimeout
let typingUsers = {}

const playNotificationSound = () => {
  const notification = new Audio('assets/dsnotification.mp3')
  notification.volume = 0.01
  notification.play()
}

const playJoinSound = () => {
  const join = new Audio('assets/dsjoin.mp3')
  join.volume = 0.01
  join.play()
}

// Função para formatar o horário
const formatTime = () => {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const createMessageSelfElement = (content) => {
  const div = document.createElement("div")
  div.classList.add("message-self")
  div.innerHTML = `
    <span class="message-content">${content}</span>
    <span class="message-time">${formatTime()}</span> 
  `
  return div
}

const createMessageOtherElement = (content, sender, senderColor) => {
  const div = document.createElement("div")
  const span = document.createElement("span")
  div.classList.add("message-other")
  span.classList.add("message-sender")
  span.style.color = senderColor
  div.appendChild(span)
  span.innerHTML = sender
  div.innerHTML += `
    <span class="message-content">${content}</span>
    <span class="message-time">${formatTime()}</span> 
  `
  return div
}

const createSystemMessageElement = (content) => {
  const p = document.createElement("p")
  p.classList.add("system-message")
  p.innerHTML = content
  return p
}

const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * colors.length)
  return colors[randomIndex]
}

const scrollScreen = () => {
  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: "smooth"
  })
}

const updateTypingIndicator = () => {
  const typingUserNames = Object.keys(typingUsers)

  if (typingUserNames.length === 0) {
    typingIndicator.innerHTML = "" // Nenhum usuário está digitando
    typingIndicator.classList.remove("typing") // Remove a animação se não houver digitação
  } else if (typingUserNames.length === 1) {
    typingIndicator.innerHTML = `${typingUserNames[0]} está digitando`
    typingIndicator.classList.add("typing") // Adiciona a animação
  } else if (typingUserNames.length > 1) {
    typingIndicator.innerHTML = `${typingUserNames.join(", ")} estão digitando`
    typingIndicator.classList.add("typing") // Adiciona a animação
  }
}

const processMessage = ({ data }) => {
  const { type, userId, userName, userColor, content, messages, users, isTyping } = JSON.parse(data)

  if (type === "chat") {
    const message =
      userId == user.id
        ? createMessageSelfElement(content)
        : createMessageOtherElement(content, userName, userColor)

    chatMessages.appendChild(message)

    // Toca o som de notificação apenas se a mensagem for de outro usuário
    if (userId !== user.id) {
      playNotificationSound()
    }
  }

  if (type === "system-message") {
    const message = createSystemMessageElement(content)
    chatMessages.appendChild(message)
  }

  if (type === "user-update") {
    onlineUsersList.innerHTML = ""
    users.forEach((user, index) => {
      const li = document.createElement("li")
      li.textContent = user.name + (index < users.length - 1 ? "," : "")
      onlineUsersList.appendChild(li)
    })
  }

  if (type === "typing") {
    if (isTyping) {
      typingUsers[userName] = Date.now() // Armazena quem está digitando
    } else {
      delete typingUsers[userName] // Remove quando parar de digitar
    }

    updateTypingIndicator() // Atualiza a interface
  }

  scrollScreen()
}

const handleLogin = (event) => {
  event.preventDefault()

  playJoinSound()

  user.id = crypto.randomUUID()
  user.name = loginInput.value
  user.color = getRandomColor()

  login.style.display = "none"
  chat.style.display = "flex"

  websocket = new WebSocket("wss://chatws-backend.onrender.com")

  websocket.onmessage = processMessage

  websocket.onopen = () => {
    websocket.send(
      JSON.stringify({
        type: "login",
        userId: user.id,
        userName: user.name,
        userColor: user.color,
      })
    )
  }
}

const sendMessage = (event) => {
  event.preventDefault()

  const content = chatInput.value
  const message = {
    type: "chat",
    userId: user.id,
    userName: user.name,
    userColor: user.color,
    content: chatInput.value,
  }

  websocket.send(JSON.stringify(message))
  chatInput.value = ""
}

// Função para detectar quando o usuário está digitando
const handleTyping = () => {
  websocket.send(JSON.stringify({
    type: "typing",
    userName: user.name,
    isTyping: true,
  }))

  clearTimeout(typingTimeout)

  // Envia o sinal de "parar de digitar" após 5 segundos de inatividade
  typingTimeout = setTimeout(() => {
    websocket.send(JSON.stringify({
      type: "typing",
      userName: user.name,
      isTyping: false,
    }))
  }, 2000)
}

// Limpa automaticamente usuários que estão "digitando" após 5 segundos de inatividade
setInterval(() => {
  const now = Date.now()
  Object.keys(typingUsers).forEach((userName) => {
    if (now - typingUsers[userName] > 5000) {
      delete typingUsers[userName] // Remove usuário da lista após timeout
    }
  })

  updateTypingIndicator() // Atualiza a interface
}, 1000) // Verifica a cada segundo

// Adiciona o evento "input" ao campo de entrada do chat para detectar quando o usuário está digitando
chatInput.addEventListener("input", handleTyping)

loginForm.addEventListener("submit", handleLogin)
chatForm.addEventListener("submit", sendMessage)