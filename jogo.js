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

var score1_text;
var score2_text;

var score1;
var score2;

function preload ()
{
	this.load.image('sky', 'assets/sky.png');
    this.load.image('paddle', 'assets/paddle.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.bitmapFont('font','assets/font.png','assets/font.xml');
}

function create ()
{
    //iMAGEM DE FUNDO DO JOGO
	//this.add.image(400, 300, 'sky');

    ball_launched = false;
    ball_vel = 400;

    // O PONG E COLISAO NO CENARIO
    //paddle1 = createPaddle(0,300,this);
    //paddle2 = createPaddle(800,300,this);
    paddle1 = createPaddle(0,game.config.height/2,this);
    paddle2 = createPaddle(game.config.width,game.config.height/2,this);


    // CRIA A BOLA DO JOGO
    ball = createBall(game.config.width/2,game.config.height/2,this);

    // LANÇA A BOLA ASSIM QUE O TECLADO É PRESSIONADO;
    this.input.keyboard.on('keydown_W', launchBall, this); 

    // GERA O PLACAR
    score1_text = this.add.bitmapText(game.config.width/4,50,'font','0',60);
    score2_text = this.add.bitmapText(game.config.width/2+game.config.width/4,50,'font','0',60);

    score1 = 0;
    score2 = 0;
}

function update ()
{
    score1_text.text = score1;
    score2_text.text = score2;
    
    //  Input Events
    comandoTeclado = this.input.keyboard.createCursorKeys();
    controlPaddle(paddle1,comandoTeclado);

    //  Colisão entre os paddles e bola
    this.physics.add.collider(paddle1, ball);
    this.physics.add.collider(paddle2, ball);

    if(ball.body.blocked.left){
    
        console.log('Time 2 Marcou!');
        score2+=1;
    
    } else if(ball.body.blocked.right){
    
        console.log('Time 1 Marcou!');
        score1+=1;

    }

    //VERIFICA SE REALIZOU 10 PONTOS E FINALIZA O JOGO
    if(score1_text.text==5 || score2_text.text==5){
        gameOver = true;
        //this.add.bitmapText(150, 400, 'font', 'Fim de Jogo', 64);
        this.add.bitmapText(game.config.height/4, game.config.width/2, 'font', 'Fim de Jogo', 50);
        console.log('Foi para o Gameover');
    }

    if(gameOver){
        console.log('GAME OVER');
        this.scene.pause();
        console.log('GAME OVER1');
        //this.input.keyboard.once('keydown_ESC', function () {
        //    global_pause('default'); //will be unpaused in game.html
        //});
        //sleep(5000);

        //this.scene.restart();
        //this.input.keyboard.on('keydown_W', () => this.scene.restart()); 
       // return;
    }

    // REALIZANDO O SEGUNDO JOGADOR IA
    paddle2.body.velocity.setTo(ball.body.velocity.y);
    paddle2.body.velocity.x = 0;
    paddle2.body.maxVelocity.y = 250;
 
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
        //ball.x = game.centerX;
        //ball.y = game.centerY;
        //console.log("story", game.config.width, "story");
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