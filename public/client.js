// DOM elements.
//const roomSelectionContainer = document.getElementById('room-selection-container')
const userInput = document.getElementById('user-input')
const connectButton = document.getElementById('connect-button')
const stopconnectButton = document.getElementById('stopconnect-button')

// Chat box
const chat = document.getElementById('chat')
const localText = document.getElementById('localText')
const buttonsendText = document.getElementById('buttonsendText')

// Variables.
const socket = io()

let localStream
let localConnection = null;   // RTCPeerConnection for our "local" connection
let remoteConnection = null;  // RTCPeerConnection for the "remote"
let sendChannel = null;       // RTCDataChannel for the local (sender)
let receiveChannel = null;    // RTCDataChannel for the remote (receiver)
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

// ============================= OFERTA SDP E CHANNEL ======================================//
// =========================================================================================//

socket.on('enter_call', async () => {
  console.log('Socket event callback: enter_call')

  if (loginDetails.isRoomCreator) {
    localConnection = new RTCPeerConnection()
    
    sendChannel = localConnection.createDataChannel("sendChannel")
    sendChannel.onopen = handleSendChannelStatusChange()
    sendChannel.onclose = handleSendChannelStatusChange()

    localConnection.ondatachannel = sendChannel //cuidado

      let sessionDescription
      try {
        sessionDescription = await localConnection.createOffer()
        localConnection.setLocalDescription(sessionDescription)
      } catch (error) {
        console.error(error)
      }

      console.log('Socket send: offer')
      socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        loginDetails: loginDetails,
      })
  }

})

socket.on('offer', async (event) => {
  console.log('Socket event callback: offer')

  if (!loginDetails.isRoomCreator) {
    localConnection = new RTCPeerConnection()
    localConnection.setRemoteDescription(new RTCSessionDescription(event))

    console.log(event)
    localConnection.ondatachannel = receiveChannelCallback(event)

    let sessionDescription
    try {
      //localConnection.setRemoteDescription(event) //PEGA OS DADOS DO SDP
      sessionDescription = await localConnection.createAnswer() 
      localConnection.setLocalDescription(sessionDescription)
    } catch (error) {
      console.error(error)
    }

    //ACEITA A OFERTA
    console.log('Socket send: ack_offer')
    socket.emit('ack_offer', {
      type: 'ack_offer',
      sdp: sessionDescription,
      loginDetails: loginDetails,
    })
  }

})

socket.on('ack_offer', async (event) => {
  console.log('Socket event callback: ack_offer')
  //localConnection.setRemoteDescription(event)
  localConnection.setRemoteDescription(new RTCSessionDescription(event))
  console.log(localConnection)
})


// ================================= FUNCTIONS =============================================//
// =========================================================================================//

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
}

function buttonLogout(){
  userInput.disabled = false //Habilita o texto
  connectButton.disabled = false //Habilita o botão de Entrar
  stopconnectButton.disabled = true //Desabilita o botão de Sair
}

//=========================== FUNCOES DO DATA CHANNEL ======================================//
// =========================================================================================//

function sendMessage() {
  var message = localText.value;
  sendChannel.send(message);
  
  // Clear the input box and re-focus it, so that we're
  // ready for the next message.
  
  localText.value = "";
  localText.focus();
}

// Handle status changes on the local end of the data
// channel; this is the end doing the sending of data
// in this example.

function handleSendChannelStatusChange(event) {
  if (sendChannel) {
    var state = sendChannel.readyState;
    console.log(state)
    if (state === "open") {
      localText.disabled = false;
      localText.focus();
      buttonsendText.disabled = false;
    } else {
      localText.disabled = true;
      buttonsendText.disabled = true;
    }
  }
}

// Called when the connection opens and the data
// channel is ready to be connected to the remote.

function receiveChannelCallback(event) {
  receiveChannel = event.channel
  receiveChannel.onmessage = handleReceiveMessage(event)
  receiveChannel.onopen = handleReceiveChannelStatusChange
  receiveChannel.onclose = handleReceiveChannelStatusChange
}

// Handle onmessage events for the receiving channel.
// These are the data messages sent by the sending channel.

function handleReceiveMessage(event) {
  var el = document.createElement("p");
  var txtNode = document.createTextNode(event.data);
  
  el.appendChild(txtNode);
  chat.appendChild(el);
}

// Handle status changes on the receiver's channel.

function handleReceiveChannelStatusChange(event) {
  if (receiveChannel) {
    console.log("Receive channel's status has changed to " +
                receiveChannel.readyState);
  }
  
  // Here you would do stuff that needs to be done
  // when the channel's status changes.
}