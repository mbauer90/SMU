goInterval = null;

masterPong = false; //PRECISO REVISAR O SEU USO....
pongRunning = false;
pongStarted = false;

var config = {
    type: Phaser.AUTO,
    width: 600,
    height: 350,
    parent: 'game',
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var paddle1;
var paddle2;
var paddle3;
var paddle4;
var ball;

var ball_launched;
var ball_vel;
var comandoTeclado;

var score = 0;
var TimeA = {score};
var TimeB = {score};

function preload ()
{
    this.load.image('paddle', 'assets/paddle.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.bitmapFont('font','assets/font.png','assets/font.xml');
}

function create ()
{
    //iMAGEM DE FUNDO DO JOGO
	//this.add.image(400, 300, 'sky');

    ball_launched = false;  //informa se a bola foi lancada ou nao
    ball_vel = 100; //velocidade da bola

    // O PONG E COLISAO NO CENARIO
    paddle1 = createPaddle(0,game.config.height/2,this);
    paddle2 = createPaddle(game.config.width,game.config.height/2,this);

    // CRIA A BOLA DO JOGO
    ball = createBall(game.config.width/2,game.config.height/2,this);

    // PLACAR
    TimeA.score = 0;
    TimeB.score = 0;
}

function update (){
        
    if(loginDetails){
        if((loginDetails.numberOfClients>2) && (!paddle3)){
            paddle3 = createPaddle(15,game.config.height/2,this);
            this.physics.add.collider(paddle3, ball);   //elementos de colisao
        } 
        if((loginDetails.numberOfClients==4) && (!paddle4)){
            paddle4 = createPaddle(game.config.width-15,game.config.height/2,this);
            this.physics.add.collider(paddle4, ball); //elementos de colisao
        }
    }

    if (pongStarted){
        $('#idjogador').html('Jogador '+loginDetails.posClient);
        if(pongRunning){ //teste 

            //  Input Events
            comandoTeclado = this.input.keyboard.createCursorKeys();

            if(loginDetails.posClient==1){ //Verifica qual palheta irá controlar
                controlPaddle(paddle1,comandoTeclado);
            }else if(loginDetails.posClient==2){
                controlPaddle(paddle2,comandoTeclado);
            }else if(loginDetails.posClient==3){
                controlPaddle(paddle3,comandoTeclado);   
            }else if(loginDetails.posClient==4){
                controlPaddle(paddle4,comandoTeclado);
            }
            
            //  Colisão entre os paddles e bola
            this.physics.add.collider(paddle1, ball);
            this.physics.add.collider(paddle2, ball);

            if(ball.body.blocked.left){
                //console.log('Time 2 Marcou!');
                newPoint(TimeB);
                sendNewScore();
            } else if(ball.body.blocked.right){
                //console.log('Time 1 Marcou!');
                newPoint(TimeA);
                sendNewScore();
            }

            //if (masterPong){
            if (loginDetails.posClient == 1){
                sendGameStatus(paddle1);
            }else{
                sendPlayerPosition();
            }
            
            /*else if(loginDetails.posClient == 2){
                sendPlayerPosition(paddle2);
            }else if(loginDetails.posClient == 3){
                sendPlayerPosition(paddle3);
            }else if(loginDetails.posClient == 4){
                sendPlayerPosition(paddle4);
            }*/
        }
    }

    // REALIZANDO O SEGUNDO JOGADOR IA
    //paddle2.body.velocity.setTo(ball.body.velocity.y);
    //paddle2.body.velocity.x = 0;
    //paddle2.body.maxVelocity.y = 250;
 
}

//========================================================================================================//
//=============================== ATUALIZA O PLACAR ======================================================//
//========================================================================================================//

function updateScore(msg) {
    pongRunning = false;
    if (msg.content.TimeA > TimeA.score){
       newPoint(TimeA);
    }else if (msg.content.TimeB > TimeB.score){
       newPoint(TimeB);
    }
}

function newPoint(player) {
    //masterPong = !masterPong;
    //newIntervalGo(5);
    //player scores
    player.score += 1;
    $('#placarTimeA').html(TimeA.score);
    $('#placarTimeB').html(TimeB.score);
    resetPosBall();
    verPlacar();
}

function verPlacar(){
        //VERIFICA SE REALIZOU 5 PONTOS E FINALIZA O JOGO
        if(TimeA.score==5 || TimeB.score==5){
            console.log('GAME OVER ');
            
            if(TimeA.score > TimeB.score){
                var timeVencedor = "Time A venceu!";
            }else {
                var timeVencedor = "Time B venceu!";
            }

            //Parar a funcao update do jogo
            pongRunning = false;
            pongStarted = false;
            $('#displayTime').html(timeVencedor); //COLOCA O TIME VENCEDOR NO LOCAL DO TEMPO

            $('#displayEsperaReinicio').html('Aguarde o jogador 1 reiniciar o jogo');
            document.getElementById('displayEsperaReinicio').style.display = 'block';

            if(loginDetails.posClient==1){
                document.getElementById('buttonNovaPartida').style.display = 'block';
            }    
            //game.state.stop();
            
        }else{
            newIntervalGo(5);
        }
}
//----------------- FUNCOES EXTRAS -------------------------/

function createPaddle (x,y,t){
    //var newpaddle = game.add.sprite(x,y, 'paddle');
    var paddle = t.physics.add.sprite(x, y, 'paddle');
    paddle.setCollideWorldBounds(true);
    paddle.body.immovable = true;
    paddle.setScale(.5);
    //paddle.scale.setTo(0.5,0.5);
    
    return paddle;
}

function createBall(x,y,t){
    var ball = t.physics.add.sprite(x, y, 'ball');
    ball.x = x;
    ball.y = y;
    ball.setBounce(1,1);
    ball.setCollideWorldBounds(true);
    ball.setScale(.5);

    return ball;
}

function controlPaddle (paddleControlado,comandoTeclado){
    if (comandoTeclado.up.isDown)
    {
        paddleControlado.setVelocityY(-400);
    }
    else if (comandoTeclado.down.isDown)
    {
        paddleControlado.setVelocityY(400);
    }
    else
    {
        paddleControlado.setVelocityY(0);
    }
}

function resetPosPaddle(){
    //console.log('======ATENCAO NO RESET PADDLE====== ', loginDetails.numberOfClients)
    if(loginDetails.numberOfClients<4){
        if(paddle4){
            this.paddle4.destroy();
            paddle4 = null;
        }
    }
    if(loginDetails.numberOfClients<3){
        if(paddle3){
            this.paddle3.destroy();
            paddle3 = null;
        }
    }

    //paddle1.x = 0;
    if(paddle1){ paddle1.y = game.config.height/2; }
    if(paddle2){ paddle2.y = game.config.height/2; }
    if(paddle3){ paddle3.y = game.config.height/2; }
    if(paddle4){ paddle4.y = game.config.height/2; }
}

function launchBall(){
    if(ball_launched){
        ball.x = game.config.width/2;
        ball.y = game.config.height/2;
        ball.body.velocity.setTo(0,0);
        ball_launched = false;
    }else{
        ball.body.velocity.x = -ball_vel;
        ball.body.velocity.y = ball_vel;
        ball_launched = true;
    }
}

function resetPosBall() {
    ball.x = game.config.width/2;
    ball.y = game.config.height/2;
    ball.body.velocity.setTo(0,0);
    ball_launched = false;
}

//========================================================================================================//
//=============================== MENSAGENS PARA O DATACHANNEL ===========================================//
//========================================================================================================//

function sendNewScore (){
    pongRunning = false;
    var objToSend = {
        'type': 'update_score',
        'content': {'TimeB': TimeB.score, 'TimeA': TimeA.score}
    }
    messageDataProducer.send(JSON.stringify(objToSend));
}

function sendGameStatus(player) { //O dono da sala envia a localizacao da bola e sua posicao
    var objToSend = {
        'type': 'game_status',
        'ball': {'x': ball.x, 'y': ball.y},
        'player1': {'y': player.y}
        //'player': {'y': paddle1.y},
    }
    messageDataProducer.send(JSON.stringify(objToSend));
}

//function sendPlayerPosition(player) { //O visitante envia apenas sua localizacao
function sendPlayerPosition() { //O visitante envia apenas sua localizacao
    var objToSend = {
        'type': 'game_status',
        'player2': {'y': paddle2.y}
    }
    if(paddle3){
        objToSend.player3 = {'y': paddle3.y}
    }
    if(paddle4){
        objToSend.player4 = {'y': paddle4.y}
    }
    //console.log(objToSend)
    messageDataProducer.send(JSON.stringify(objToSend));
}

//========================================================================================================//
//================================FUNCOES NOVAS PARA CONTROLE DO GAME=====================================//
//========================================================================================================//

function updatePosPong(msg) {

    //console.log(msg)
    if (!masterPong && msg.ball){ 
        if(ball_launched){  //Evitar o valor negativo inicial de -300
            //ball.x = -msg.ball.x;
            ball.x = msg.ball.x; 
            ball.y = msg.ball.y;
        }
    }

    //LOGICA DE MOVIMENTAR OS PADDLES DIFERENTES DO USUARIO ATUAL
    if(loginDetails.posClient==1){
        if(msg.player2){ paddle2.y = msg.player2.y; } 
        if(msg.player3){ paddle3.y = msg.player3.y; } 
        if(msg.player4){ paddle4.y = msg.player4.y; }
    }else if(loginDetails.posClient==2){
        if(msg.player1){ paddle1.y = msg.player1.y; } 
        if(msg.player3){ paddle3.y = msg.player3.y; } 
        if(msg.player4){ paddle4.y = msg.player4.y; }
    }else if(loginDetails.posClient==3){
        if(msg.player1){ paddle1.y = msg.player1.y; } 
        if(msg.player2){ paddle2.y = msg.player2.y; } 
        if(msg.player4){ paddle4.y = msg.player4.y; }
    }else if(loginDetails.posClient==4){
        if(msg.player1){ paddle1.y = msg.player1.y; }
        if(msg.player2){ paddle2.y = msg.player2.y; } 
        if(msg.player3){ paddle3.y = msg.player3.y; } 
    }
  
}

function newIntervalGo(timeLeft) {
        if (goInterval) clearInterval(goInterval);
        goInterval = setInterval(function () {
            if (timeLeft > 0){
                $('#displayTime').html(timeLeft);
            } else {
                clearInterval(goInterval);
                goInterval = null;
                $('#displayTime').html('GO!');
                //launchBall();
                if (pongStarted){ 
                    pongRunning = true; 
                    launchBall();
                }
            }
            timeLeft--;
        }, 1000);
}

//========================================================================================================//
//================================ CONTROLE GAME =========================================================//
//========================================================================================================//
  

  function sendBeginGame() {

    messageDataProducer.send(JSON.stringify({ 'type': 'begin_game'}))
    pongStarted = true
    checkMaster()
    //newIntervalGo(5)
  }

  function checkMaster(){ //funcao para verificar o dono da sala, usado para definir enviar o inicio do jogo para todos

    //============GARANTIR ELEMENTOS DEFAULT=======================//
    valuesDefault()
    //=============================================================//

    //console.log(loginDetails)
    if(loginDetails.isRoomCreator){
      masterPong = true
    } else{
      masterPong = false
    }

    messageDataProducer.send(JSON.stringify({'type': 'GO!'}));
    //console.log('checkMaster ',masterPong)
  }

function stopGame(buttonLogout = 0) {

    masterPong = false;
    pongRunning = false;
    pongStarted = false;

    valuesDefault();

    if((loginDetails.numberOfClients>1) && (!buttonLogout)){       //Permite que o jogo recomece
        sendBeginGame();
    }

}

function valuesDefault(){

    TimeA.score = 0;
    TimeB.score = 0;

    resetPosPaddle(); //POSICAO ORIGINAL padldles
    
    clearInterval(goInterval);
    $('#idjogador').html('Jogador');
    $('#displayTime').html('Tempo');
    $('#placarTimeA').html('0');
    $('#placarTimeB').html('0');
    document.getElementById('displayEsperaReinicio').style.display = 'none';
    document.getElementById('buttonNovaPartida').style.display = 'none';

    resetPosBall();

}