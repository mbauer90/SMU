// DOM elements.
//const roomSelectionContainer = document.getElementById('room-selection-container')
const userInput = document.getElementById('user-input')
const roomName = document.getElementById('user-room')
const connectButton = document.getElementById('connect-button')
const stopconnectButton = document.getElementById('stopconnect-button')
const displayGame = document.getElementById('game')
const buttonNovaPartida = document.getElementById('buttonNovaPartida')

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
connectButton.addEventListener('click', () => { joinRoom(userInput.value,roomName.value) })
stopconnectButton.addEventListener('click', () => { leaveinRoom() })
buttonsendText.addEventListener('click', () => { sendMessage() })
buttonNovaPartida.addEventListener('click', () => { sendBeginGame() })

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

socket.on('leave_room', async (atualizaDetails) => {
  console.log('Socket event callback: leave_room')

  if(atualizaDetails.nisRoomCreator == loginDetails.userName){
    loginDetails.isRoomCreator = true
  }

  loginDetails.numberOfClients = atualizaDetails.numberOfClients //atualiza o numero de peers
  //pega todos na sala do atual cliente/socket  
  let ClientsinRoom = atualizaDetails.listaClientes.filter(item => item.roomId === loginDetails.roomId);

  loginDetails.posClient = ClientsinRoom.findIndex(item => item.userName == loginDetails.userName)+1

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

function joinRoom(user,room) {
  if ((user === '') || (room === '')) {
    alert('Informe o usuario e a sala')
  } else {
    loginDetails.userName = user + (new Date()).getTime()
    loginDetails.roomId = room
    //loginDetails.userName = user 
    console.log('Enviou Join para o servidor com id: ', socket.id) 
    socket.emit('join', loginDetails)
  }
}

function leaveinRoom() {
    loginDetails.numberOfClients--;
    buttonLogout()
    socket.emit('bye', loginDetails)
}
//========================================================================================================//
//====================== GERENCIAMENTO DOS BOTÕES E INPUTS ===============================================//
//========================================================================================================//
function buttonLogin(){
  userInput.disabled = true //Desabilita o texto
  roomName.disabled = true
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
  roomName.disabled = false
  connectButton.disabled = false
  stopconnectButton.disabled = true

  stopChatBox()
  stopGame(1)
}

