NeuralNetwork = require("./nn")
tetriminos = require("./../tetriminos")

let boardSize = [10, 20]
let visualboard = []
let permboard = []
let blockSize = 1
let lastGrav = 0;
let activeTetrimino
let score;
let lines;
let gameend = true;
let lastVisualboard = []
generationNNs = []
framecount = 0

let currentNN
let currentGen = 0
let state = 0;

bestNNs = []

currentBestNN = ["a", -1]


hiddenLayerSize = 32
genSize = 20
mutationRate = 0.01
cullPercent = 70

function printBoard() {
  process.stdout.write("\x1b[0;0H")
  for (var i = 0; i < visualboard.length; i++) {
    for (var j = 0; j < visualboard[0].length; j++) {
      char = visualboard[i][j] ? "#" : "_"
      process.stdout.write(char)
    }
    process.stdout.write("\n")
  }
  console.log(activeTetrimino)
  //console.log(currentNN[0])
}

function gameLoop() {
  stop = false;
  fixedrot = false
  changed = false
  numChanges = 0;
  lastVisualboard = JSON.parse(JSON.stringify(visualboard))
  visualboard = JSON.parse(JSON.stringify(permboard)) // dealing with reference copying

  if (activeTetrimino.index == -1) {
    activeTetrimino.index = Math.floor(Math.random()*tetriminos.length)
    activeTetrimino.rot = 0;
    activeTetrimino.y = 0;
    activeTetrimino.x = 4;
    if (activeTetrimino.index == 0) { // deal with line block special case
      activeTetrimino.y--
    }
  }

  if (lastGrav > 3) {
    lastGrav = 0
    lastAction[1] = 1
    activeTetrimino.y++;
  }

  inputs = []
  for (var i = 0; i < lastVisualboard.length; i++) {
    for (var j = 0; j < lastVisualboard[i].length; j++) {
      inputs.push(lastVisualboard[i][j])
    }
  }
  inputs.push(activeTetrimino.index/6)
  inputs.push(activeTetrimino.rot/3)
  inputs.push(activeTetrimino.x/9)
  inputs.push(activeTetrimino.y/19)

  outputs = currentNN[0].predict(inputs)

  highest = -1
  highestIndex = -1
  for (var i = 0; i < outputs.length; i++) {
    if (outputs[i] > highest) {
      highest = outputs[i]
      highestIndex = i
    }
  }

  if (highest > 0.8 && lastGrav != 0) {
    switch (highestIndex) {
      case 0:
      activeTetrimino.rot++;
      activeTetrimino.rot = activeTetrimino.rot % 4;
        break;
      case 1:
      activeTetrimino.x--;
        break;
      case 2:
        activeTetrimino.x++;
        break;
      default:
    }
  }

  t = JSON.parse(JSON.stringify(tetriminos[activeTetrimino.index][activeTetrimino.rot]))

  for (var i = 0; i < t.length; i++) { // collision detection
    for (var j = 0; j < t[0].length; j++) {
      if (t[i][j]) {
        if (activeTetrimino.y+i >= visualboard.length) { // hit ground
          stop = true;
          activeTetrimino.y--;
        }
        if (activeTetrimino.y+i >= boardSize[1] || activeTetrimino.y+i < 0 || activeTetrimino.x+j >= boardSize[0] || activeTetrimino.x+j < 0 || visualboard[activeTetrimino.y+i][activeTetrimino.x+j]) { // hitting walls or other blocks
          if (lastGrav == 0) {
            stop = true;
            activeTetrimino.y--;
            changed = true
          } else if (highest > 0.8 && highestIndex == 2) {
            activeTetrimino.x--;
            changed = true
          } else if (highest > 0.8 && highestIndex == 1) {
            activeTetrimino.x++;
            changed = true
          } else if (highest > 0.8 && highestIndex == 0) {
            changed = true
            if (!fixedrot) {
              activeTetrimino.rot--;
              i = 0
              j = 0
              fixedrot = true
            } else {
              if (activeTetrimino.x+j < 1) {
                activeTetrimino.x++
                activeTetrimino.rot++
              } else if (activeTetrimino.x+j > 8) {
                activeTetrimino.x--
                activeTetrimino.rot++
              }
            }
            n = 4
            activeTetrimino.rot = ((activeTetrimino.rot % n) + n) % n // deal with stupid negative modulos
          } else { // hitting top or something really broke
            gameend = true

            activeTetrimino.y--
          }
        }
        if (changed) {
          t = JSON.parse(JSON.stringify(tetriminos[activeTetrimino.index][activeTetrimino.rot]))
          changed = false
          i = 0
          j = 0
          numChanges++
          if (numChanges > 2) {
            activeTetrimino.rot = 0;
            activeTetrimino.x = 5;
            activeTetrimino.y = 5;
            t = JSON.parse(JSON.stringify(tetriminos[activeTetrimino.index][activeTetrimino.rot]))
            gameend = true
            i = 100
            j = 100
          }
        }
      }
    }
  }

  for (var i = 0; i < t.length; i++) { // add tetrimino to board
    for (var j = 0; j < t[i].length; j++) {
      if (t[i][j]) {
        if (!(activeTetrimino.y+i >= boardSize[1] || activeTetrimino.y+i < 0 || activeTetrimino.x+j >= boardSize[0] || activeTetrimino.x+j < 0)) { // array bounds
          visualboard[activeTetrimino.y+i][activeTetrimino.x+j] = true;
        } else {
          gameend = true
        }
      }
    }
  }
  //printBoard()
  if (stop) {
    activeTetrimino.index = -1;

    tempLines = 0;
    for (var i = 0; i < boardSize[1]; i++) { // line detection
      full = true
      for (var j = 0; j < boardSize[0]; j++) { // check if line is full
        if (!visualboard[i][j]) {
          full = false
        }
      }
      if (full) {
        lines++
        tempLines++
        for (var j = i; j > 0; j--) { // deal with moving the rows around to move things down
          for (var k = 0; k < boardSize[0]; k++) {
            visualboard[j][k] = visualboard[j-1][k]
          }
        }
        for (var j = 0; j < boardSize[0].length; j++) {
          visualboard[0][j] = false
        }
        i= 0
      }
    }
    if (tempLines > 0) {
      score += 300*Math.pow(3,tempLines-1)
    }
    score+=4

    permboard = JSON.parse(JSON.stringify(visualboard))
  }
  lastGrav++
  if (!gameend) {
    setTimeout(gameLoop, 0)
  }
}

function firstSetup() {
  console.log("start time: "+new Date())
  currentGen = 0;

  for (var i = 0; i < genSize; i++) {
    generationNNs[i] = [new NeuralNetwork(204, hiddenLayerSize, 3, true), 0]
  }
  evalNN(0, 0)
}

function evalNN(i, j) {
  if (state == 0) { // todo: dont test AIs with fitness
    if (j < 10) {
      currentNN = generationNNs[i]
      startGame()
      state = 1
      setTimeout(evalNN, 10, i, (j+1))
    } else {
      setTimeout(evalNN, 10, (i+1), 0)
    }
  } else if (state == 1) {
    if (gameend) {
      generationNNs[i][1] += score
      if (i < generationNNs.length-1) {
        state = 0
        setTimeout(evalNN, 10, i, j)
      } else {
        nextGen()
        state = 0
      }
    } else {
      setTimeout(evalNN, 10, i, j)
    }
  }
}

async function nextGen() {
  console.log("gen "+currentGen+": "+new Date())
  currentGen++
  generationNNs.sort(function(a,b) {
    return b[1]-a[1]
  });
  for (var i = 0; i < generationNNs.length; i++) {
    console.log(generationNNs[i][0].id()+": "+generationNNs[i][1])
  }
  if (generationNNs[0][1] > currentBestNN[1]) {
    currentBestNN[0] = generationNNs[0][0].clone()
    currentBestNN[1] = generationNNs[0][1]
  }
  for (var i = Math.floor(genSize*(1-(cullPercent/100))); i < genSize; i++) {
    generationNNs.pop()
  }
  newNNs = []
  while (newNNs.length+generationNNs.length < genSize) {
    parent1 = Math.floor(Math.abs((randn_bm()*generationNNs.length*2)-generationNNs.length)) // creates a bell
    parent2 = parent1
    while (parent2 == parent1) {
      parent2 = Math.floor(Math.abs((randn_bm()*generationNNs.length*2)-generationNNs.length))
    }
    temp = await generationNNs[parent1][0].crossover(generationNNs[parent2][0])
    newNNs = newNNs.concat(temp)
  }
  for (var i = 0; i < newNNs.length; i++) {
    await newNNs[i].mutate(mutationRate)
  }
  let finNNs = []
  for (var i = 0; i < newNNs.length; i++) {
    finNNs.push([newNNs[i], 0])
  }
  setTimeout(evalNN, 1000, generationNNs.length-1)
  generationNNs = generationNNs.concat(finNNs)
}

function startGame() {
  gameend = false
  score = 0;
  lines = 0;
  activeTetrimino = {
    x: -1,
    y: -1,
    index: -1,
    rot: 0,
  }
  lastAction = [0,0,0]
  for (var i = 0; i < boardSize[1]; i++) {
    visualboard[i] = []
    permboard[i] = []
    for (var j = 0; j < boardSize[0]; j++) {
      visualboard[i][j] = false
      permboard[i][j] = false
    }
  }
  if (JSON.stringify(lastVisualboard) != JSON.stringify(visualboard)) { //only draw on changed frame
  }
  setTimeout(gameLoop, 10)
  lastGrav = 0
}

function randn_bm() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
  return num
}

firstSetup()
