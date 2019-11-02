//All main rules and movement implemented. Has a weird bug where if you move pieces offscreen (using the Red: Move and Black: Move buttons)
//when legal, the item will be moved off screen, but not until the player selects the next piece. Ran out of time to debug due to PLC exam.

var canvas;
var gl;
var colorLoc;
var modelViewLoc;
var projectionLoc;
var mv;
var proj;


var playerTurn;
var doubles = false;
var doublesRollVal = 0;
var diceRoll = 0;
var die1 = 0;
var die2 = 0;
var lightBrown = vec4(0.2, 0.05, 0.05, 1.0);
var darkBrown = vec4(0.6, 0.45, 0.05, 1.0);
var vertices = [];
var fbVertices = [];
var fbTriVerts = [];
var colors = [];
var fbColors = [];
var theta = [];
var angles = [];
var c = [];
var s = [];
const pieceRad = 2;
var numBoardPoints = 0;
var numTrianglePoints = 0;
var selectedColor = new Uint8Array(4);
var debugPiece;
const debugMode = false;
var rolled = false;

class TriCollector {
	constructor() {
		this.setOfTriColors = [];
		this.allTriVerts = [];
		this.allTris = [];
		this.fbTriColors = [];
		this.i = 0;
		this.topTriangles = [];
		this.bottomTriangles = [];
	}

	pushTri(tri) {
		this.allTris.push(tri);
		var newcolor = vec4(0.0, 0.0, Math.round((1.00 - (this.i * 0.04)) * 100) / 100, 1);
		this.setOfTriColors.push(Math.round((1.00 - (this.i * 0.04)) * 100) / 100);
		for (var j = 0; j < 3; j++) {
			this.allTriVerts.push(tri.verts[j]);
			this.fbTriColors.push(newcolor);
		}


		this.i++;
	}

}
class PieceCollector {
	constructor() {
		this.i = 0;
		this.allPieces = [];
		this.allColors = [];
		this.allVertices = [];
		this.setOfAllShades = [];
	}

	addPiece(piece) {
		this.allPieces.push(piece);
		this.pushVerticesAndColors(piece.discVertices);
		this.i++;
	}

	pushVerticesAndColors(listOfVertices) {
		var newColor = vec4(0.0, Math.round((1.00 - (this.i * 0.02)) * 100) / 100, 0.0, 1.0);
		this.setOfAllShades.push(Math.round((1.00 - (this.i * 0.02)) * 100) / 100);
		for (var j = 0; j < listOfVertices.length; j++) {
			this.allVertices.push(listOfVertices[j]);
			//this.allColors.push(newColor);
			fbColors.push(newColor);
		}
	}
}

var selectedPiece;
var collector = new PieceCollector();
var triCollec = new TriCollector();
var allTriangles = [];
var boardVertices = [];
var boardDiffX = 27;
var boardDiffZ = 18;
var greenOffset = 1;
var widthTriangles = 2 * (boardDiffX - greenOffset - 0.5) / 12;
var tableSize = 19;
var tableSize2 = tableSize / 2.0;
var windowMin = -tableSize2;
var windowMax = tableSize + tableSize2;

var gameBoardCoordinates = [vec4(-boardDiffX + greenOffset, tableSize + 10.1, boardDiffZ - greenOffset, 1.0),
vec4(-boardDiffX + greenOffset, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0),
vec4(boardDiffX - greenOffset, tableSize + 10.1, boardDiffZ - greenOffset, 1.0),
vec4(boardDiffX - greenOffset, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0)];

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = 0;
var rotate = false;

var projection;
var modelView;
var aspect;

class BoardLocation {
	constructor(x) {
		this.centerX = x;
		this.player1Pieces = [];
		this.player2Pieces = [];
		this.list = [];
		this.lowestSelectableZ = -boardDiffZ + 10;
	}

	pushPiece(piece) {
		//piece.location.popPiece();
		this.list.push(piece);
		piece.player == 1 ? this.player1Pieces.push(piece) : this.player2Pieces.push(piece)
		this.lowestSelectableZ += 2.2;
	}

	removePiece(piece) {
		this.list = this.list.filter(function (ele) {
			return ele != piece;
		})
		if (piece.player == 1) {
			this.player1Pieces = this.list.filter(function (ele) {
				return ele != piece;
			})
		}
		else {
			this.player2Pieces = this.list.filter(function (ele) {
				return ele != piece;
			})
		}

		this.lowestSelectableZ -= 2.2;
	}
}
var centerOfBoard = new BoardLocation(0.0);
var redTray = new BoardLocation(boardDiffX);
var blackTray = new BoardLocation(-boardDiffX);

window.onload = function init() {

	chooseFirstTurn();
	die1 = 0;
	die2 = 0;
	canvas = document.getElementById("gl-canvas");

	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) { alert("WebGL isn't available"); }

	// Load vertices and colors for cube faces

	boardVertices = [
		vec4(-boardDiffX, 1.0, boardDiffZ, 1.0),
		vec4(-boardDiffX, tableSize + 10, boardDiffZ, 1.0),
		vec4(boardDiffX, tableSize + 10, boardDiffZ, 1.0),
		vec4(boardDiffX, 1.0, boardDiffZ, 1.0),
		vec4(-boardDiffX, 1.0, -boardDiffZ, 1.0),
		vec4(-boardDiffX, tableSize + 10, -boardDiffZ, 1.0),
		vec4(boardDiffX, tableSize + 10, -boardDiffZ, 1.0),
		vec4(boardDiffX, 1.0, -boardDiffZ, 1.0),

		vec4(-boardDiffX + greenOffset, tableSize + 10.1, boardDiffZ - greenOffset, 1.0),
		vec4(-boardDiffX + greenOffset, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0),
		vec4(boardDiffX - greenOffset, tableSize + 10.1, boardDiffZ - greenOffset, 1.0),
		vec4(boardDiffX - greenOffset, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0),
	];

	this.vertices = [boardVertices[1], boardVertices[0], boardVertices[3], boardVertices[3],
	boardVertices[2], boardVertices[1],
	boardVertices[6], boardVertices[5], boardVertices[1], boardVertices[1],
	boardVertices[2], boardVertices[6]];


	for (var i = 0; i < 12; i++) {
		if (i < 6) this.colors.push(lightBrown);
		else this.colors.push(this.darkBrown);
	}

	var topLeftBoardVertex = [-boardDiffX + greenOffset, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0];

	this.vertices.push(this.boardVertices[9]);
	this.vertices.push(this.boardVertices[8]);
	this.vertices.push(vec4(-0.5, tableSize + 10.1, boardDiffZ - greenOffset, 1.0));
	this.vertices.push(vec4(-0.5, tableSize + 10.1, boardDiffZ - greenOffset, 1.0))
	this.vertices.push(vec4(-0.5, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0));
	this.vertices.push(this.boardVertices[9]);


	this.vertices.push(vec4(0.5, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0));
	this.vertices.push(vec4(0.5, tableSize + 10.1, boardDiffZ - greenOffset, 1.0));
	this.vertices.push(this.boardVertices[10]);
	this.vertices.push(this.boardVertices[10]);
	this.vertices.push(this.boardVertices[11]);
	this.vertices.push(vec4(0.5, tableSize + 10.1, -boardDiffZ + greenOffset, 1.0));

	for (var i = 0; i < 12; i++) this.colors.push(vec4(0.0, 0.5, 0.0, 1.0));

	numBoardPoints = this.vertices.length;


	var half = 1;
	var triIndex = 0;
	for (var j = 0; j < 2; j++) {

		var startX = half == 1 ? topLeftBoardVertex[0] : 0.5;
		for (var i = 0; i < 6; i++) {
			var tri = (i % 2 == 0 ? new Triangle(startX + (i * this.widthTriangles), -boardDiffZ + greenOffset, true, vec4(0.5, 0.0, 0.0, 1.0), triIndex) :
				new Triangle(startX + (i * this.widthTriangles), -boardDiffZ + greenOffset, true, vec4(0.9, 0.9, 0.5, 1.0), triIndex));
			tri.pushVertices();
			triCollec.pushTri(tri);
			allTriangles.push(tri)
			triIndex++;
		}
		for (var i = 0; i < 6; i++) {
			var tri = (i % 2 == 1 ? new Triangle(startX + (i * this.widthTriangles), boardDiffZ - greenOffset, false, vec4(0.5, 0.0, 0.0, 1.0), triIndex) :
				new Triangle(startX + (i * this.widthTriangles), boardDiffZ - greenOffset, false, vec4(0.9, 0.9, 0.5, 1.0), triIndex));
			tri.pushVertices();
			triCollec.pushTri(tri);
			allTriangles.push(tri)
			triIndex++;
		}
		half++;

	}
	console.log(vertices.length);
	numTrianglePoints = vertices.length - numBoardPoints;


	initBoard();

	updateFBVertexPosition();
	var newCBuffData = [];

	triVertBuffData = [];
	triColorBuffData = [];

	for (var i = 0; i < collector.allColors.length; i++) {
		newCBuffData.push(collector.allColors[i]);
	}

	for (var i = 0; i < triCollec.allTriVerts.length; i++) {
		triVertBuffData.push(triCollec.allTriVerts[i]);
		triColorBuffData.push(triCollec.fbTriColors[i]);
	}

	theta[0] = 65.0;
	theta[1] = 0.0;
	theta[2] = 0.0;

	//
	//  Configure WebGL
	//

	gl.viewport(0, 0, canvas.width, canvas.height);
	aspect = canvas.width / canvas.height;
	gl.clearColor(0.7, 0.7, 0.7, 1.0);
	gl.enable(gl.DEPTH_TEST);
	projection = perspective(45.0, aspect, 1, 20 * tableSize);

	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	colorRenderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGB565, canvas.width, canvas.height);

	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderBuffer);

	depthRenderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);

	var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if (status != gl.FRAMEBUFFER_COMPLETE) {
		this.alert('Framebuffer not complete');
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);


	//  Load shaders and initialize attribute buffers

	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	// colorLoc = gl.getUniformLocation(program, "color");
	modelViewLoc = gl.getUniformLocation(program, "modelView");
	projectionLoc = gl.getUniformLocation(program, "projection");

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	//gl.bufferData(gl.ARRAY_BUFFER, flatten(fbVertices), gl.STATIC_DRAW);
	!debugMode ? gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW) :
		gl.bufferData(gl.ARRAY_BUFFER, flatten(fbVertices), gl.STATIC_DRAW);

	var vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);

	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	!debugMode ? gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW) :
		gl.bufferData(gl.ARRAY_BUFFER, flatten(fbColors), gl.STATIC_DRAW);

	var vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);
	console.log(collector.setOfAllShades);


	//Event Listeners

	var a = document.getElementById("RollDice");
	a.addEventListener("click", function () {
		if (!rolled) {
			rollDice();
			if (!isPossibleMove()) {
				alert("No possible moves with these numbers...o o f >_>")
				changeTurn();
				die1 = 0;
				die2 = 0;
			}
			else {
				if (die1 == die2) {
					doubles = true;
					doublesRollVal = die1;
				}

				rolled = true;
				var b = document.getElementById("DiceResult");
				b.innerHTML = "Dice Result: \n Die 1: " + die1 + "\n Die 2: " + die2;
			}
		}
		else { alert("You've already rolled"); }
	})

	var b = document.getElementById("RedMoveOff");
	b.addEventListener("click", function () {
		redMoveOffValid();
	})

	var c = document.getElementById("BlackMoveOff");
	c.addEventListener("click", function () {
		blackMoveOffValid();
	})


	canvas.addEventListener("mousedown", function (event) {

		//WARNING: THIS IS WHERE ALL THE MADNESS HAPPENS D:


		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		//gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		var v2Buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, v2Buffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(fbVertices), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		var c2Buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, c2Buffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(fbColors), gl.STATIC_DRAW);

		var vColor = gl.getAttribLocation(program, "vColor");
		gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vColor);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.drawArrays(gl.TRIANGLES, 0, fbVertices.length);

		var x = event.x - canvas.offsetLeft;
		var y = (canvas.height + canvas.offsetTop) - event.y;

		gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, selectedColor);
		if (selectedColor[0] == 0 && selectedColor[2] == 0) {
			if (die1 == die2 && die1 == 0) {
				alert("Please roll the dice before selecting a piece.")
			}
			else {
				var pieceShade = 100 * (selectedColor[1]) / 255;
				var castedShade = pieceShade.toString();
				var asInt = parseInt(castedShade);

				if (asInt % 2 == 1) {
					asInt++;
					//asInt/=100.0;
				}
				var converted = asInt / 100;
				console.log(converted)
				console.log(collector.setOfAllShades);

				for (var j = 0; j < collector.setOfAllShades.length; j++) {
					if (converted == collector.setOfAllShades[j]) {
						var tempSelectedPiece = collector.allPieces[j];
						if (tempSelectedPiece.player == playerTurn) {
							var centerOfBoardChecklist = (playerTurn == 1) ? centerOfBoard.player1Pieces : centerOfBoard.player2Pieces;
							if (tempSelectedPiece.location == centerOfBoard || tempSelectedPiece == tempSelectedPiece.location.peekPiece()) {
								if (centerOfBoardChecklist.length != 0 && tempSelectedPiece.location != centerOfBoard) {
									alert("You must remove all your pieces from the center board before moving any other pieces.")
								}
								else {
									if (selectedPiece) selectedPiece.resetColor();
									selectedPiece = tempSelectedPiece;
									selectedPiece.pushNewColor(vec4(0.0, 1.0, 1.0, 1.0));
								}
							}
						}
						else {
							alert("Wait ur turn >:[")
						}

						console.log(j);
						break;
					}
				}

				console.log(selectedPiece)

				//selectedPiece.movePiece(allTriangles[1]);
				updateFBVertexPosition();
			}

		}
		else {
			gl.bindBuffer(gl.ARRAY_BUFFER, v2Buffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(triCollec.allTriVerts), gl.STATIC_DRAW);

			gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vPosition);

			gl.bindBuffer(gl.ARRAY_BUFFER, c2Buffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(triCollec.fbTriColors), gl.STATIC_DRAW);

			gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vColor);

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.drawArrays(gl.TRIANGLES, 0, triCollec.allTriVerts.length);
			gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, selectedColor);

			if (selectedPiece) {
				if (selectedColor[0] == 0 && selectedColor[1] == 0) {
					console.log(selectedColor[2]);
					var triShade = 100 * ((selectedColor[2]) / 255);
					triShade = roundToNearestMultiple(triShade, 4);
					var converted = triShade / 100;
					console.log(converted)
					console.log(triCollec.setOfTriColors);


					for (var j = 0; j < triCollec.setOfTriColors.length; j++) {
						if (converted == triCollec.setOfTriColors[j]) {
							selectedLocation = triCollec.allTris[j];
							console.log(j);
							break;
						}
					}
					if (selectedPiece.location == centerOfBoard) {
						if (centerBoardValidMove(selectedPiece.player, selectedLocation, die1, 1, true) ||
							centerBoardValidMove(selectedPiece.player, selectedLocation, die2, 2, true)) {
							if (selectedLocation.peekPiece()) {
								var topPiece = selectedLocation.peekPiece();
								if (topPiece.player != selectedPiece.player) {
									//DONE: Push it to the center
									topPiece.movePiece(centerOfBoard);
									debugPiece = topPiece;
								}
							}
							selectedPiece.moveFromCenter(selectedLocation);
							selectedPiece.resetColor();
							selectedPiece = undefined;
							selectedLocation = undefined;
							if (die1 == die2 && die1 == 0) {
								if (doubles) {
									die1 = doublesRollVal;
									die2 = doublesRollVal;
									doublesRollVal = 0;
									doubles = false;
								}
								else {
									rolled = false;
									changeTurn();
								}
							}
							updateFBVertexPosition();

						}
						else alert("Invalid Move")
					} else if (isValidMove(selectedPiece.player, selectedPiece.location, selectedLocation, die1, 1, true) ||
						isValidMove(selectedPiece.player, selectedPiece.location, selectedLocation, die2, 2, true)
					) {
						if (selectedLocation.peekPiece()) {
							var topPiece = selectedLocation.peekPiece();
							if (topPiece.player != selectedPiece.player) {
								//DONE: Push it to the center
								topPiece.movePiece(centerOfBoard);
								debugPiece = topPiece;
							}
						}
						selectedPiece.movePiece(selectedLocation);
						selectedPiece.resetColor();
						selectedPiece = undefined;
						selectedLocation = undefined;
						if (die1 == die2 && die1 == 0) {
							if (doubles) {
								die1 = doublesRollVal;
								die2 = doublesRollVal;
								doublesRollVal = 0;
								doubles = false;
							}
							else {
								rolled = false;
								changeTurn();
							}
						}

						updateFBVertexPosition();
					}
					else {
						alert("Invalid Move");
					}

				}
			}
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);


		gl.bindBuffer(gl.ARRAY_BUFFER, v2Buffer);

		!debugMode ? gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW) :
			gl.bufferData(gl.ARRAY_BUFFER, flatten(fbVertices), gl.STATIC_DRAW);

		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, c2Buffer);
		!debugMode ? gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW) :
			gl.bufferData(gl.ARRAY_BUFFER, flatten(fbColors), gl.STATIC_DRAW);

		gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vColor);

	})



	render();
};

function changeTurn() {
	playerTurn = (playerTurn == 1) ? 2 : 1;
}

function allRedInHomeBoard() {
	for (var i = 0; i < collector.allPieces.length; i++) {
		var currentPiece = collector.allPieces[i];
		if (currentPiece.player == playerTurn) {
			if (currentPiece.location == redTray || (currentPiece.location.index >= 18 && currentPiece.location.index <= 23)) {
				continue;
			}
			else return false;
		}
	}

	return true;
}

function allBlackInHomeBoard() {
	for (var i = 0; i < collector.allPieces.length; i++) {
		var currentPiece = collector.allPieces[i];
		if (currentPiece.player == playerTurn) {
			if (currentPiece.location == blackTray || (currentPiece.location.index >= 12 && currentPiece.location.index <= 17)) {
				continue;
			}
			else return false;
		}
	}

	return true;
}

function redMoveOffValid() {
	if (playerTurn == 1) {
		if (allRedInHomeBoard()) {
			if (selectedPiece) {
				if (23 - selectedPiece.location.index + 1 == die1) {
					selectedPiece.movePiece(redTray);
					die1 = 0;
					selectedPiece.resetColor();
					selectedPiece = undefined;
					if (die1 == die2 && die1 == 0) {
						if (doubles) {
							die1 = doublesRollVal;
							die2 = doublesRollVal;
							doublesRollVal = 0;
							doubles = false;
						}
						else {
							rolled = false;
							changeTurn();
						}
					}

					updateFBVertexPosition();

				}
				else if (23 - selectedPiece.location.index + 1 == die2) {
					selectedPiece.movePiece(redTray);
					die2 = 0;
					selectedPiece.resetColor();
					selectedPiece = undefined;
					selectedLocation = undefined;
					if (die1 == die2 && die1 == 0) {
						if (doubles) {
							die1 = doublesRollVal;
							die2 = doublesRollVal;
							doublesRollVal = 0;
							doubles = false;
						}
						else {
							rolled = false;
							changeTurn();
						}
					}

					updateFBVertexPosition();
				}
				else {
					alert("Invalid Move")
				}
			}
		}
	}
	else {
		alert("HEY D:<");
	}
}

function blackMoveOffValid() {
	if (playerTurn == 2) {
		if (allBlackInHomeBoard()) {
			if (selectedPiece) {
				if (17 - selectedPiece.location.index + 1 == die1) {
					selectedPiece.movePiece(blackTray);
					die1 = 0;
					selectedPiece.resetColor();
					selectedPiece = undefined;
					selectedLocation = undefined;
					if (die1 == die2 && die1 == 0) {
						if (doubles) {
							die1 = doublesRollVal;
							die2 = doublesRollVal;
							doublesRollVal = 0;
							doubles = false;
						}
						else {
							rolled = false;
							changeTurn();
						}
					}

					updateFBVertexPosition();
				}
				else if (17 - selectedPiece.location.index + 1 == die2) {
					selectedPiece.movePiece(blackTray);
					die2 = 0;
					selectedPiece.resetColor();
					selectedPiece = undefined;
					selectedLocation = undefined;
					if (die1 == die2 && die1 == 0) {
						if (doubles) {
							die1 = doublesRollVal;
							die2 = doublesRollVal;
							doublesRollVal = 0;
							doubles = false;
						}
						else {
							rolled = false;
							changeTurn();
						}
					}

					updateFBVertexPosition();
				}
				else {
					alert("Invalid Move")
				}
			}
		}
	}
	else {
		alert("HEY D:<");
	}
}

function isPossibleMove() {
	var centerBoardChecker = playerTurn == 1 ? centerOfBoard.player1Pieces : centerOfBoard.player2Pieces;
	var farIndexOfTris = playerTurn == 1 ? 17 : 23;
	if (centerBoardChecker.length != 0) {
		for (var i = 0; i < centerBoardChecker.length; i++) {
			for (var j = 0; j < 6; j++) {
				if (centerBoardValidMove(playerTurn, triCollec.allTris[farIndexOfTris - j], die1, 1, false) ||
					centerBoardValidMove(playerTurn, triCollec.allTris[farIndexOfTris - j], die2, 2, false)) {
					return true;
				}
			}
		}
		return false;
	}
	else {
		var topOfStackPieces = [];
		for (var i = 0; i < triCollec.allTris.length; i++) {
			var currentTri = triCollec.allTris[i];
			var topPiece = currentTri.peekPiece();
			if (topPiece && topPiece.player == playerTurn) topOfStackPieces.push(topPiece);
		}

		for (var i = 0; i < topOfStackPieces.length; i++) {
			for (var j = 0; j < triCollec.allTris.length; j++) {
				if (isValidMove(playerTurn, topOfStackPieces[i].location, triCollec.allTris[j], die1, 1, false) ||
					isValidMove(playerTurn, topOfStackPieces[i].location, triCollec.allTris[j], die2, 2, false)) return true;
			}
		}
		return false;
	}


}

function centerBoardValidMove(player, selectLoc, dieNum, die, changeDie) {
	if (player == 2) {
		var player2HomeLocation = triCollec.allTris[23 + -(dieNum - 1)];
		if (selectLoc == player2HomeLocation) {
			if (stackChecker(player, selectLoc)) {
				if (changeDie) {
					die == 1 ? die1 = 0 : die2 = 0;
				}
				return true;
			}
			return false;
		}
		else return false;
	}
	else {
		var player1HomeLocation = triCollec.allTris[17 + -(dieNum - 1)];
		if (selectLoc == player1HomeLocation) {
			if (stackChecker(player, selectLoc)) {
				if (changeDie) die == 1 ? die1 = 0 : die2 = 0;
				return true;
			}
			return false;
		}
		else return false;
	}
}

function chooseFirstTurn() {
	rollDice();
	var temp = die1 + die2;
	rollDice();
	if (temp == die1 + die2) return chooseFirstTurn();
	playerTurn = temp > die1 + die2 ? 1 : 2;
}

function rollDice() {
	//diceRoll = Math.ceil(Math.random() * 6);
	die1 = Math.ceil(Math.random() * 6);
	die2 = Math.ceil(Math.random() * 6);
	console.log(die1);
	console.log(die2)
}

function initBoard() {
	var index = vertices.length;
	const stepSize = 114;
	// REAL CODE
	for (var i = 0; i < 5; i++) {
		var playerPiece = new Piece(1, allTriangles[0], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}
	for (var i = 0; i < 3; i++) {
		var playerPiece = new Piece(2, allTriangles[4], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}
	for (var i = 0; i < 5; i++) {
		var playerPiece = new Piece(2, allTriangles[6], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}

	for (var i = 0; i < 3; i++) {
		var playerPiece = new Piece(1, allTriangles[10], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}

	for (var i = 0; i < 5; i++) {
		var playerPiece = new Piece(2, allTriangles[12], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}
	for (var i = 0; i < 2; i++) {
		var playerPiece = new Piece(1, allTriangles[17], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}

	for (var i = 0; i < 5; i++) {
		var playerPiece = new Piece(1, allTriangles[18], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}

	for (var i = 0; i < 2; i++) {
		var playerPiece = new Piece(2, allTriangles[23], index);
		collector.addPiece(playerPiece);
		index += stepSize;
	}

	//TEST CODE
	// for (var i = 0; i < 5; i++) {
	// 	var playerPiece = new Piece(1, allTriangles[18], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }
	// for (var i = 0; i < 3; i++) {
	// 	var playerPiece = new Piece(2, allTriangles[12], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }
	// for (var i = 0; i < 5; i++) {
	// 	var playerPiece = new Piece(2, allTriangles[13], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }

	// for (var i = 0; i < 3; i++) {
	// 	var playerPiece = new Piece(1, allTriangles[19], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }

	// for (var i = 0; i < 5; i++) {
	// 	var playerPiece = new Piece(2, allTriangles[14], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }
	// for (var i = 0; i < 2; i++) {
	// 	var playerPiece = new Piece(1, allTriangles[20], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }

	// for (var i = 0; i < 5; i++) {
	// 	var playerPiece = new Piece(1, allTriangles[21], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }

	// for (var i = 0; i < 2; i++) {
	// 	var playerPiece = new Piece(2, allTriangles[15], index);
	// 	collector.addPiece(playerPiece);
	// 	index += stepSize;
	// }




}


function render() {
	playerTurn == 1 ? gl.clearColor(0.6, 0.0, 0.0, 1.0) : gl.clearColor(0.7, 0.7, 0.7, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	if (rotate) {
		theta[axis] += 0.5;
	}
	for (i = 0; i < 3; i++) {
		angles[i] = radians(theta[i]);
		c[i] = Math.cos(angles[i]);
		s[i] = Math.sin(angles[i]);
	}

	rx = mat4(1.0, 0.0, 0.0, 0.0,
		0.0, c[0], -s[0], 0.0,
		0.0, s[0], c[0], 0.0,
		0.0, 0.0, 0.0, 1.0);

	ry = mat4(c[1], 0.0, s[1], 0.0,
		0.0, 1.0, 0.0, 0.0,
		-s[1], 0.0, c[1], 0.0,
		0.0, 0.0, 0.0, 1.0);

	rz = mat4(c[2], -s[2], 0.0, 0.0,
		s[2], c[2], 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0);

	tz1 = mat4(1.0, 0.0, 0.0, -tableSize2 + 9.5,
		0.0, 1.0, 0.0, -tableSize2,
		0.0, 0.0, 1.0, -tableSize2 + 15,
		0.0, 0.0, 0.0, 1.0);

	tz2 = mat4(1.0, 0.0, 0.0, tableSize2,
		0.0, 1.0, 0.0, tableSize2,
		0.0, 0.0, 1.0, tableSize2,
		0.0, 0.0, 0.0, 1.0);

	looking = lookAt(vec3(tableSize2, tableSize2, 4 * tableSize), vec3(tableSize2, tableSize2, 0), vec3(0.0, 1.0, 0.0));
	rotation = mult(rz, mult(ry, rx));
	modelView = mult(looking, mult(tz2, mult(rotation, tz1)));
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));

	!debugMode ? gl.drawArrays(gl.TRIANGLES, 0, vertices.length) :
		gl.drawArrays(gl.TRIANGLES, 0, fbVertices.length);

	requestAnimFrame(render);
};

class Triangle {
	constructor(x, z, top, triColor, index) {
		this.x = x;
		this.index = index;
		this.z = z;
		this.stack = [];
		this.triColor = triColor;
		this.top = top;
		this.centerX = this.x + 0.5 * widthTriangles
		this.lowestSelectableZ = top ? z + 1.0 : z - 1.0;
		this.verts = [];
		if (top) triCollec.topTriangles.push(this);
		else triCollec.bottomTriangles.push(this);

	}

	pushVertices() {

		vertices.push(vec4(this.x, tableSize + 10.2, this.z, 1.0));
		vertices.push(vec4(this.x + widthTriangles, tableSize + 10.2, this.z, 1.0));
		this.verts.push(vec4(this.x, tableSize + 10.2, this.z, 1.0));
		this.verts.push(vec4(this.x + widthTriangles, tableSize + 10.2, this.z, 1.0));

		if (this.top) {
			vertices.push(vec4(this.x + (0.5 * widthTriangles), tableSize + 10.2, this.z + 12, 1.0))
			this.verts.push(vec4(this.x + (0.5 * widthTriangles), tableSize + 10.2, this.z + 12, 1.0))
		}
		else {
			vertices.push(vec4(this.x + (0.5 * widthTriangles), tableSize + 10.2, this.z - 12, 1.0));
			this.verts.push(vec4(this.x + (0.5 * widthTriangles), tableSize + 10.2, this.z - 12, 1.0));

		}

		for (var i = 0; i < 3; i++) {
			colors.push(this.triColor);
		}
	}

	pushPiece(piece) {
		this.stack.push(piece);
		if (this.top)
			this.lowestSelectableZ += 2.2;

		else this.lowestSelectableZ -= 2.2;
	}

	popPiece() {
		this.stack.pop();
		if (this.top)
			this.lowestSelectableZ -= 2.2;
		else this.lowestSelectableZ += 2.2;
	}

	peekPiece() {
		return (this.stack.length == 0) ? undefined : this.stack[this.stack.length - 1];
	}
}

function whichIsZero(arg1, arg2) {
	if (arg1 == arg2) return 3;
	else if (arg1 == 0) return 1;
	else return 2;
}

function stackChecker(player, location) {
	if (location.stack.length < 2) return true;
	else {
		if (location.peekPiece().player != player) return false;
		return true;
	}


}

function isValidMove(player, startLocation, newLocation, numRolls, die, modifyDie) {
	var rollsLeft = numRolls;
	var currentLocation = startLocation;
	if (player == 2) {
		if (!currentLocation.top) {
			for (var i = 0; i <= numRolls; i++ , rollsLeft--) {
				var bottomTriIndex = currentLocation.index > 11 ? currentLocation.index - 12 : currentLocation.index - 6;
				if (rollsLeft == 0) {
					if (newLocation == currentLocation) {
						if (stackChecker(player, newLocation)) {
							if (modifyDie) {
								if (die == 1) die1 = 0;
								else die2 = 0;
							}
							return true;
						}
						else {
							return false;
						}

					}
					else {
						return false;
					}
				}
				else if (bottomTriIndex - 1 < 0) {
					return isValidMove(player, triCollec.topTriangles[0], newLocation, rollsLeft - 1, die, modifyDie);
				}
				else {
					currentLocation = triCollec.bottomTriangles[bottomTriIndex - 1];
				}
			}

		}
		else {
			//if the start location is on the top
			for (var i = 0; i <= numRolls; i++ , rollsLeft--) {
				var topTriIndex = currentLocation.index > 5 ? currentLocation.index - 6 : currentLocation.index;
				if (rollsLeft == 0) {
					if (newLocation == currentLocation) {
						if (stackChecker(player, newLocation)) {
							if (modifyDie) {
								if (die == 1) die1 = 0;
								else die2 = 0;
							}
							return true;
						}
						else {
							return false;
						}
					}
					else {
						return false;
					}
				}
				else if (topTriIndex + 1 > 11) {
					return isValidMove(player, triCollec.topTriangles[0], newLocation, rollsLeft - 1, die, modifyDie);
				}
				else {
					currentLocation = triCollec.topTriangles[topTriIndex + 1];
				}
			}
		}
	}
	else {
		if (!currentLocation.top) {
			for (var i = 0; i <= numRolls; i++ , rollsLeft--) {
				var bottomTriIndex = currentLocation.index > 11 ? currentLocation.index - 12 : currentLocation.index - 6;
				if (rollsLeft == 0) {
					if (newLocation == currentLocation) {
						if (stackChecker(player, newLocation)) {
							if (modifyDie) {
								if (die == 1) die1 = 0;
								else die2 = 0;
							}
							return true;
						}
						else {
							return false
						}
					}
					else {
						return false;
					}
				}
				else if (bottomTriIndex + 1 > 11) {
					return isValidMove(player, triCollec.topTriangles[11], newLocation, rollsLeft - 1, die, modifyDie);
				}
				else {
					currentLocation = triCollec.bottomTriangles[bottomTriIndex + 1];
				}
			}

		}
		else {
			//if the start location is on the top
			for (var i = 0; i <= numRolls; i++ , rollsLeft--) {
				var topTriIndex = currentLocation.index > 5 ? currentLocation.index - 6 : currentLocation.index;
				if (rollsLeft == 0) {
					if (newLocation == currentLocation) {
						if (stackChecker(player, newLocation)) {
							if (modifyDie) {
								if (die == 1) die1 = 0;
								else die2 = 0;
							}
							return true;
						}
						else {
							return false;
						}
					}
					else {
						return false;
					}
				}
				else if (topTriIndex - 1 < 0) {
					return isValidMove(player, triCollec.bottomTriangles[0], newLocation, rollsLeft - 1, die, modifyDie);
				}
				else {
					currentLocation = triCollec.topTriangles[topTriIndex - 1];
				}
			}
		}
	}


}

function contains(collection, item) {
	if (!collection) false;
	else {
		for (var i = 0; i < collection.length; i++) {
			if (collection[i] == item) return true;
			else continue;
		}

		return false;
	}
}

function updateFBVertexPosition() {
	for (var i = 0; i < vertices.length - (numBoardPoints + numTrianglePoints); i++) {
		fbVertices[i] = vertices[i + (numBoardPoints + numTrianglePoints)];
	}
}

function roundToNearestMultiple(n1, roundBase) {
	return (n1 % roundBase > roundBase / 2) ?
		n1 + (roundBase - (n1 % roundBase)) : n1 - (n1 % roundBase);
}

class Piece {
	constructor(player, location, verticesIndex) {
		this.verticesIndex = verticesIndex;
		this.location = location;
		this.player = player;
		this.centerX = location.centerX;
		this.centerZ = location.lowestSelectableZ;
		this.color = player == 1 ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.3, 0.3, 0.3, 1.0);
		this.sideColor = player == 1 ? vec4(0.4, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
		this.bottomVerts = [];
		this.topVerts = [];
		this.discVertices = [];
		this.numNonTubeVertices = 0;
		this.makeVertices();
		this.pushAllVerticesTo(vertices);
		location.pushPiece(this)
		//console.log("DiscVertices Length: " + this.discVertices.length);

	}


	makeVertices() {
		var pieceBottomY = tableSize + 10.3;
		var centerBottom = vec4(this.centerX, pieceBottomY, this.centerZ, 1.0);
		var centerTop = vec4(this.centerX, pieceBottomY + 1, this.centerZ, 1.0);
		var numSlices = 10;
		var stepSize = (2 * Math.PI) / numSlices;
		for (var i = 0; i < numSlices; i++) {
			var v1x = Math.cos(i * stepSize) + this.centerX;
			var v1z = Math.sin(i * stepSize) + this.centerZ;
			var v2x = Math.cos((i + 1) * stepSize) + this.centerX;
			var v2z = Math.sin((i + 1) * stepSize) + this.centerZ;

			//Bottom vertices of piece
			var v1 = vec4(v1x, pieceBottomY, v1z, 1.0);
			var v2 = vec4(v2x, pieceBottomY, v2z, 1.0);

			this.discVertices.push(centerBottom);
			this.discVertices.push(v1);
			this.discVertices.push(v2);

			colors.push(this.color);
			colors.push(this.color);
			colors.push(this.color);

			this.bottomVerts.push(v1);

			//Top vertices of piece

			v1 = vec4(v1x, pieceBottomY + 1, v1z, 1.0);
			v2 = vec4(v2x, pieceBottomY + 1, v2z, 1.0);

			// vertices.push(centerTop);
			// vertices.push(v1);
			// vertices.push(v2);

			this.discVertices.push(centerTop);
			this.discVertices.push(v1);
			this.discVertices.push(v2);

			colors.push(this.color);
			colors.push(this.color);
			colors.push(this.color);
			this.topVerts.push(v1);

		}

		this.numNonTubeVertices = this.discVertices.length;
		// Sides/Tube of piece
		for (var i = 0; i < 9; i++) {

			this.discVertices.push(this.topVerts[i]);
			this.discVertices.push(this.bottomVerts[i]);

			var topRightVert;
			var bottomRightVert;
			topRightVert = (i < this.topVerts.length - 1) ? this.topVerts[i + 1] : this.topVerts[0];
			bottomRightVert = (i < this.topVerts.length - 1) ? this.bottomVerts[i + 1] : this.bottomVerts[0];

			this.discVertices.push(topRightVert);
			this.discVertices.push(topRightVert);
			this.discVertices.push(bottomRightVert);
			this.discVertices.push(this.bottomVerts[i]);

			for (var j = 0; j < 6; j++) { colors.push(this.sideColor) };
		}
	}

	pushAllVerticesTo(vertexCollector) {
		for (var i = 0; i < this.discVertices.length; i++) {
			vertexCollector.push(this.discVertices[i]);
		}
	}

	moveFromCenter(newLocation) {
		this.location.removePiece(this);
		this.location = newLocation;
		this.centerX = newLocation.centerX;
		this.centerZ = newLocation.lowestSelectableZ;

		this.discVertices = [];
		this.topVerts = [];
		this.bottomVerts = [];
		this.makeVertices();
		this.modifyVerticesInVertices();

		newLocation.pushPiece(this);
	}

	movePiece(newLocation) {
		this.location.popPiece();
		this.location = newLocation;
		this.centerX = newLocation.centerX;
		this.centerZ = newLocation.lowestSelectableZ;

		this.discVertices = [];
		this.topVerts = [];
		this.bottomVerts = [];
		this.makeVertices();
		this.modifyVerticesInVertices();

		newLocation.pushPiece(this);
	}

	modifyVerticesInVertices() {
		for (var i = 0; i < this.discVertices.length; i++) {
			vertices[this.verticesIndex + i] = this.discVertices[i];
		}
	}

	pushNewColor(newColor) {
		for (var i = 0; i < this.discVertices.length; i++) {
			colors[this.verticesIndex + i] = newColor;
		}
	}

	resetColor() {
		for (var i = 0; i < this.discVertices.length; i++) {
			if (i < this.numNonTubeVertices) {
				colors[this.verticesIndex + i] = this.color;
			}
			else {
				colors[this.verticesIndex + i] = this.sideColor;
			}
		}
	}
};