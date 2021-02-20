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
var gameOver = false;
var paddle1;
var paddle2;
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

    if (pongStarted){
        if(pongRunning){ //teste 

            //  Input Events
            comandoTeclado = this.input.keyboard.createCursorKeys();
            controlPaddle(paddle1,comandoTeclado);

            //  Colisão entre os paddles e bola
            this.physics.add.collider(paddle1, ball);
            this.physics.add.collider(paddle2, ball);

            if(ball.body.blocked.left){
                console.log('Time 2 Marcou!');
                newPoint(TimeB);
                sendNewScore();
            } else if(ball.body.blocked.right){
                console.log('Time 1 Marcou!');
                newPoint(TimeA);
                sendNewScore();
            }

            //VERIFICA SE REALIZOU 5 PONTOS E FINALIZA O JOGO
            if(TimeA.score==5 || TimeB.score==5){
                gameOver = true;
            }

            if(gameOver){
                console.log('GAME OVER');
                this.scene.pause();
                
                var timeVencedor = "Fim da partida";
                $('#displayResultado').html(timeVencedor);
                document.getElementById('displayResultado').style.display = 'block';
            }

            if (masterPong){
                sendGameStatus();
            } else {
                sendPlayerPosition();
            }
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
    if (msg.content.you > TimeA.score){
       newPoint(TimeA);
    }else if (msg.content.me > TimeB.score){
       newPoint(TimeB);
    }
}

function newPoint(player) {
    //masterPong = !masterPong;
    newIntervalGo(5);
    //player scores
    player.score += 1;
    $('#localScore').html(TimeA.score);
    $('#remoteScore').html(TimeB.score);
    resetPosBall();
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
        'content': {'you': TimeB.score, 'me': TimeA.score}
    }
    sendChannel.send(JSON.stringify(objToSend));
}

function sendGameStatus() { //O dono da sala envia a localizacao da bola e sua posicao
    var objToSend = {
        'type': 'game_status',
        'ball': {'x': ball.x, 'y': ball.y},
        'player': {'y': paddle1.y},
    }
    sendChannel.send(JSON.stringify(objToSend));
    //console.log('Mestre',masterPong)
    //console.log('ball',ball.x)
}

function sendPlayerPosition() { //O visitante envia apenas sua localizacao
    var objToSend = {
        'type': 'game_status',
        'player': {'y': paddle1.y}
    }
    sendChannel.send(JSON.stringify(objToSend));
}

//========================================================================================================//
//================================FUNCOES NOVAS PARA CONTROLE DO GAME=====================================//
//========================================================================================================//

function updatePosPong(msg) {

    if (!masterPong && msg.ball){ 
        if(ball_launched){  //Evitar o valor negativo inicial de -300
            //ball.x = -msg.ball.x;
            ball.x = msg.ball.x;   //Deve espelhar a bola para o visitante no eixo X, valor negativo
            ball.y = msg.ball.y;
        }
    }

    paddle2.y = msg.player.y;   
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

function stopGame() {

    masterPong = false;
    pongRunning = false;
    pongStarted = false;

    TimeA.score = 0;
    TimeB.score = 0;

    //paddle2.x = game.config.width;
    //paddle2.y = game.config.height/2;
    
    clearInterval(goInterval);
    $('#displayTime').html('Tempo');
    $('#localScore').html('0');
    $('#remoteScore').html('0');
    document.getElementById('displayResultado').style.display = 'none';

    resetPosBall()
}