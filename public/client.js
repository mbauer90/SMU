// DOM elements.
//const roomSelectionContainer = document.getElementById('room-selection-container')
const userInput = document.getElementById('user-input')
const connectButton = document.getElementById('connect-button')
const stopconnectButton = document.getElementById('stopconnect-button')

// Chat box
const inputMessage = document.getElementById('inputmessage')
const sendmessageButton = document.getElementById('sendmessage-button')

// Variables.
const socket = io()

let localStream
let rtcPeerConnection // Connection between the local device and the remote peer.
let roomId = "SMU"
let userId
let isRoomCreator

let loginDetails={roomId, userId, isRoomCreator} 

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => {
  joinRoom(userInput.value)
})

stopconnectButton.addEventListener('click', () => {
  leaveinRoom()
})

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')
  buttonLogin()

  loginDetails.isRoomCreator = true
})

socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')
  buttonLogin()

  loginDetails.isRoomCreator = false

  console.log('Socket send: enter_call')
  socket.emit('enter_call', loginDetails)
})

socket.on('leave_room', async (nisRoomCreator) => {
  console.log('Socket event callback: leave_room')

  if(nisRoomCreator == loginDetails.userId){
    loginDetails.isRoomCreator = true
  }

})

socket.on('ack_bye', async () => {
  console.log('Socket event callback: ack_bye')
  loginDetails.isRoomCreator = false
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')
  alert('Sala cheia, tente outra hora')
})

socket.on('enter_call', async () => {
  console.log('Socket event callback: enter_call')

  if (loginDetails.isRoomCreator) {

      console.log('Socket send: offer')
      socket.emit('offer', {
        type: 'offer',
        loginDetails: loginDetails,
      })
  }

})

socket.on('offer', async (event) => {
  console.log('Socket event callback: offer')

  if (!loginDetails.isRoomCreator) {


    console.log('Socket send: answer')
    socket.emit('answer', {
      type: 'answer',
      loginDetails: loginDetails,
    })
  }

})

socket.on('answer', async (event) => {
  console.log('Socket event callback: answer')
})


// =========================FUNCTIONS =============================================
function joinRoom(user) {
  if (user === '') {
    alert('Informe o nome do usuario')
  } else {
    buttonLogin()
    loginDetails.userId = user + (new Date()).getTime()
    console.log('Enviou Join para o servidor') 
    socket.emit('join', loginDetails)
  }
}

function leaveinRoom() {
    buttonLogout()

    socket.emit('bye', loginDetails)
}

// FUNCOES PARA GERENCIAMENTO DOS BOTÕES 
function buttonLogin(){
  userInput.disabled = true //Desabilita o texto
  connectButton.disabled = true //Desabilita o botão de Entrar
  stopconnectButton.disabled = false  //Habilita o botão de Sair
  inputMessage.disabled = false
  sendmessageButton.disabled = false
}

function buttonLogout(){
  userInput.disabled = false //Habilita o texto
  connectButton.disabled = false //Habilita o botão de Entrar
  stopconnectButton.disabled = true //Desabilita o botão de Sair
  inputMessage.disabled = true
  sendmessageButton.disabled = true
}