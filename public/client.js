// Free public STUN servers provided by Google.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

// DOM elements.
//const roomSelectionContainer = document.getElementById('room-selection-container')
const userInput = document.getElementById('user-input')
const connectButton = document.getElementById('connect-button')
const stopconnectButton = document.getElementById('stopconnect-button')
const displayGame = document.getElementById('game')

// Chat box
const chat = document.getElementById('chat')
const localText = document.getElementById('localText')
const buttonsendText = document.getElementById('buttonsendText')

// Variables.
const socket = io()

let roomId = "SMU"
let userName
let isRoomCreator
let idSocket
let numberOfClients
let posClient

let device = null;
let sendTransport = null;
let consumerTransport = null;
let clientId = null;
let messageDataProducer = null;

let messageConsumers = {};

let loginDetails={roomId, userName, isRoomCreator, idSocket, numberOfClients, posClient} 

// BUTTON LISTENER ============================================================
connectButton.addEventListener('click', () => { joinRoom(userInput.value) })
stopconnectButton.addEventListener('click', () => { leaveinRoom() })
buttonsendText.addEventListener('click', () => { sendMessage() })

// SOCKET EVENT CALLBACKS =====================================================
socket.on('room_created', async (rcklogiDetails) => {
  console.log('Socket event callback: room_created')
  buttonLogin()
  loginDetails.isRoomCreator = true
  loginDetails.numberOfClients = rcklogiDetails.numberOfClients
  loginDetails.posClient = rcklogiDetails.posClient
  createProdutor();
})

socket.on('room_joined', async (rcklogiDetails) => {
  console.log('Socket event callback: room_joined')
  buttonLogin()
  loginDetails.isRoomCreator = false
  loginDetails.numberOfClients = rcklogiDetails.numberOfClients
  loginDetails.posClient = rcklogiDetails.posClient
  socket.emit('enter_call', loginDetails)
  createProdutor();
})

socket.on('enter_call', async (numberOfClients) => {
  console.log('Socket event callback: enter_call')
  loginDetails.numberOfClients = numberOfClients;
})

socket.on('leave_room', async (nisRoomCreator) => {
  console.log('Socket event callback: leave_room')

  if(nisRoomCreator == loginDetails.userName){
    loginDetails.isRoomCreator = true
  }

  //stopChatBox()
  stopGame()
  socket.emit('ack_leave', loginDetails)

})

socket.on('ack_bye', async () => {
  console.log('Socket event callback: ack_bye')
  loginDetails.isRoomCreator = false
})

socket.on('full_room', () => {
  console.log('Socket event callback: full_room')
  alert('Sala cheia, tente outra hora')
})

socket.on('begin_game', () => {
  console.log('Socket event callback: begin_game')
  sendBeginGame()
})

//========================================================================================================//
// ==================================== OFERTA SDP E CHANNEL =============================================//
// =======================================================================================================//


//======================================= SFU ============================================================//
//========================================================================================================//

socket.on('newProducer', function (message) {
  console.log('socket.io newProducer:', message);
  const remoteId = message.socketId;
  const prdId = message.producerId;
  const label = message.label;
  if (label === 'chat') {
    console.log('--try consumeAdd remoteId=' + remoteId + ', prdId=' + prdId + ', label=' + label);
    consumeAdd(consumerTransport, remoteId, prdId, label);
  }
})

socket.on('dataproducerclose', function (message) {
  console.log('socket.io dataproducerclose:', message);
  const localId = message.localId;
  const remoteId = message.remoteId;
  const label = message.label;
  console.log('--- try removeConsumer remoteId=%s, localId=%s, track=%s', remoteId, localId, label);
  removeConsumer(remoteId, label);
})

//========================================================================================================//
// ========================================= FUNCTIONS ===================================================//
//========================================================================================================//

function joinRoom(user) {
  if (user === '') {
    alert('Informe o nome do usuario')
  } else {
    loginDetails.userName = user + (new Date()).getTime()
    //loginDetails.userName = user 
    console.log('Enviou Join para o servidor com id: ', socket.id) 
    socket.emit('join', loginDetails)
  }
}

function leaveinRoom() {
    buttonLogout()
    socket.emit('bye', loginDetails)
}
//========================================================================================================//
//====================== GERENCIAMENTO DOS BOTÕES E INPUTS ===============================================//
//========================================================================================================//
function buttonLogin(){
  userInput.disabled = true //Desabilita o texto
  connectButton.disabled = true //Desabilita o botão de Entrar
  stopconnectButton.disabled = false  //Habilita o botão de Sair
}

function buttonLogout() {
  // Close the RTCDataChannels if they're open.

  if (sendTransport) {
    sendTransport.close(); // localStream will stop
    sendTransport = null;
  }

  if (consumerTransport) {
    consumerTransport.close(); // localStream will stop
    consumerTransport = null;
  }

  // Update user interface elements
  userInput.disabled = false //Habilita o texto
  connectButton.disabled = false
  stopconnectButton.disabled = true

  stopChatBox()
  stopGame()
}

