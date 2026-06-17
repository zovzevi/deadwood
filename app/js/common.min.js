/*jshint esversion: 6 */
//GLOBAL VARS & CYCLES
let player        = new Player('../img/player2.png', 16, 300, 51, 64, 3.4); 
    player.setVars(0);      // Player initialization
let gameIsRunning = false;  // Var for start function, prevents pressing the start button again
let game;                   // Var for render function interval
let rivalCycle;             // Var for cycle of rivals
let collectorCycle;         // Var for collector cycle
let buyCycle;               // Var for rising cost of food cycle
let eatCycle;               // Var for player eating cycle
let glbuy = 18;             // Initial cost of food
let lifetime;               // Var for counting game time

//GAME MAIN FUNCTION
function main() {
  gameIsRunning = true;
  //vars & objects
  let screen    = document.getElementById('screen');
  let ctx       = screen.getContext('2d');
  let time      = new Date();
  let ms        = 20;
  let mapLength = 100;
  let buy       = glbuy;

  let wood      = new Background();
  let ground    = new Ground('../img/grass.jpg', mapLength);
  let dwood     = new Resources(ground.relief);
  let scores    = new Interface(); 
  let torch     = new Fire('../img/fireInTheDark.png', 1400, 875);
  let rivals    = new LinkedList();
  let shop      = new Shop('../img/shop.png', 6000);
  let mshop     = new Shop('../img/shop.png', 3200);

  if (ctx) {
    DWFuncs.movingManager(player, ground, dwood, ms, true); 
    game = setInterval(render, 25); 
  }

  //MAIN GAME CYCLE
  function render() {
    ms = new Date() - time;
    time = new Date();

    //mechanics
    DWFuncs.movingManager(player, ground, dwood, ms); 
    player.gravity(ground.relief, ms);
    if (player.backZone > 5760)
      stop();

    //draw & enemy cycles
    ctx.clearRect(0, 0, 640, 400);
    wood.draw(ctx, player);
    ground.draw(ctx, player.backZone);
    shop.draw(ctx, player.backZone);
    mshop.draw(ctx, player.backZone);
    dwood.draw(ctx, player.backZone);

    DWFuncs.rivalForeach(rivals.first, ctx, player.backZone, ground.relief, dwood, ms);

    player.draw(ctx);
    torch.draw(ctx, player.x + (player.dir == 1 ? 20 : -20), player.y - 40);
    scores.draw(ctx, player.x + player.backZone, player.food, player.point, buy, ms);

    //Checking: is player died?
    if (player.food <= 0) {
      let lived = new Date() - lifetime;
      DWFuncs.diedWindow(ctx, lived);
      for (var i = 0; i < dwood.location.length; i++)
        dwood.location[i] = 0;  
      stop();
    }

    //buying
    if (player.backZone + player.x > 3200 && player.backZone + player.x < 3264) {
      player.food += Math.floor(player.point / glbuy);
      player.point = player.point % glbuy;
    }
  }

  //ANOTHER CYCLES (these add or delete bots, these don't depend on render func)
  collectorCycle  = setInterval(DWFuncs.collector, 20000, (rivals));
  rivalCycle      = setInterval(DWFuncs.newRival,  10000, (rivals), (player), (dwood.location), (mapLength));
  buyCycle        = setInterval(function() { let up = Math.floor(glbuy / 10); glbuy += up; buy += up; }, 12000);
  eatCycle        = setInterval(function() { player.food -= 1; }, 11000);
}

//START FUNCTION
function start() {
  if (!gameIsRunning)
    restart();
}

//STOP FUNCTION
function stop() {
  gameIsRunning = false;
  clearInterval(game);
  clearInterval(rivalCycle);
  clearInterval(collectorCycle);
  clearInterval(buyCycle);
  clearInterval(eatCycle);
  player.x = 16;
  player.backZone = 0;

  if (player.food > 0) {
    player.food += Math.floor(player.point / glbuy);
    player.point = player.point % glbuy;
    main();
  }
}

//RESTART LEVEL FUNCTION
function restart() {
  player.x = 16;
  player.backZone = 0;
  player.food = 10;
  player.point = 0;  
  glbuy = 18;
  lifetime = new Date();
  main();
}