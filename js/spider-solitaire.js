/**
 spider-solitaire.js
 Author: Dik Langan
 Url: https://github.com/fixitdik/spidersolitaire

 Dependencies: jQuery

 spider-solitaire.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 spider-solitaire.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with spider-solitaire.js.  If not, see <http://www.gnu.org/licenses/>.
 **/

var SpiderSolitaire;

jQuery(function($) {

    //instantiate object
	SpiderSolitaire = function () {
	
	    // make sure there's only one
	    if (!(this instanceof SpiderSolitaire)) {
	        throw new ssObj.Exception('Attempt to create more than one instance of SpiderSolitaire object');
	    }
	    
	    // set up some variables used throughout game
	    var ssObj = this;
	    ssObj.moves = [];
	    ssObj.piles = [];
	    ssObj.deck = [];
	    for (var stack = 0; stack < 18; stack++) {
		    ssObj.piles[stack] = [];
		}
		ssObj.score = 0;
		ssObj.baseTop = 20;
		ssObj.pileTop = 138;

		// initialise the object
		this.init = function (elementName) {
		    if (elementName === undefined) {
		        elementName = 'spidersolitaire';
		    }
		    ssDiv = $('#' + elementName);
		    if (!ssDiv.length || ssDiv[0].tagName != 'DIV') {
		        throw new ssObj.Exception('\'' + elementName + '\' element not defined as DIV in HTML');
		    }
		    ssDiv.addClass('spidersolitaire');
		    ssDiv.parent().addClass('ssParent');
		    $(document).attr('draggable','false');
		    ssDiv.attr('draggable','false');
            ssObj.initHandlers(ssDiv);
            // @@todo: could attempt to reload last game here
            ssObj.newGame();
		};
		
		// initialise all the event handlers we need
		this.initHandlers = function (ssDiv) {
		
		    ssDiv.on('click', '#Deal', ssObj.deal);
		    
            ssDiv.on('click', '#New', ssObj.checkForNewGame);
		
            ssDiv.on('click', '#Undo', ssObj.undo);

            ssDiv.on('click', '#Menu', ssObj.menu);

            $('*').keypress(ssObj.keyPress);
				
    		ssDiv.on('dragstart', function (event) {
    		    if (!event.target.classList.contains('canDrag')) {
    		        event.preventDefault();
    		        return;
    		    }
    		    event.originalEvent.dataTransfer.setData('text', event.target.id);
    		    ssObj.dragging = true;
    		    // @@todo: set up array of cards being dragged & draw them all moving as one
    		});
    		
    		ssDiv.on('drop', '.canDrop', function (event) {
    		    event.preventDefault();
    		    if (event.originalEvent.dataTransfer.getData("text")) {
        		    ssObj.dragging = false;        		    
        		    ssObj.moveCard(event.originalEvent.dataTransfer.getData("text"), event.target);
    		    }
    		});
    		
    		ssDiv.on('drag', '.canDrag', function (event) {
    		    if (!ssObj.dragging) {
    		        console.warn("drag called before dragstart, ignoring");
    		        return;
    		    }
    		    // @@todo make sure all cards above one being dragged are also dragged
    		});
    		
    		ssDiv.on('click', '.canDrop', function (event) {
    		    if (ssObj.cardSelected == -1) { // no card selected so try to select this one
        		    if (!event.target.classList.contains('canDrag')) {
        		        event.preventDefault();
        		        return;
        		    }
        		    event.target.classList.add('clicked');
        		    ssObj.cardSelected = event.target.id;
        		} else if (event.target.id == ssObj.cardSelected) { // same card so deselect
        		    event.target.classList.remove('clicked');
        		    ssObj.cardSelected = -1;
        		} else {
        		    if (ssObj.moveCard(ssObj.cardSelected, event.target)) {
            		    event.target.classList.remove('clicked');
            		    ssObj.cardSelected = -1;
        		    } else {
            		    if (!event.target.classList.contains('canDrag')) {
            		        event.preventDefault();
            		        return;
            		    }
            		    ssObj.unselectCurrentSelectedCard();
            		    event.target.classList.add('clicked');
            		    ssObj.cardSelected = event.target.id;
    		        }
    		    }
    		});
		};
		
		this.checkForNewGame = function () {
		    if (!ssObj.playing || confirm('You are in the middle of a game, are you sure?')) {
		            ssObj.newGame();
		        }
		};
		
		// start a new game
		this.newGame = function () {
		    //@@todo: should check they mean it
    	    ssObj.moves = [];
    	    ssObj.piles = [];
    	    ssObj.deck = [];
    	    ssObj.score = 500;
    	    ssObj.playing = false;
    	    ssObj.cardSelected = -1;
    	    for (var stack = 0; stack < 18; stack++) {
    		    ssObj.piles[stack] = [];
    		}
            ssObj.prepareCards();
		    ssObj.redraw();
		};
		
		//redraw the whole table (very quick)
		this.redraw = function () {
    		// draw the buttons and pile locations
		    ssDiv.html('').append(ssObj.getTemplate('buttons'));
		    var base = ssObj.getTemplate('home-base');
		    for (var home = 0; home < 8; home++) {
		        ssDiv.append(base.replace('%top%', ssObj.baseTop)
		            .replace('%left%', ((home + 2) * 77) + 10)
		            .replace('%zindex%', 0)
		            );
		    }
		    base = ssObj.getTemplate('stack-base');
		    for (var stack = 0; stack < 10; stack ++) {
		        ssDiv.append(base
		            .replace('%id%', stack)
		            .replace('%top%', ssObj.pileTop)
		            .replace('%left%', (stack * 77) + 10)
		            .replace('%zindex%', 0)
		            );
		    }
		    $('*').attr('draggable','false');
		    $('*').attr('selectable','false'); //@@todo: not working - for some reason you can drag a rectangle over buttons and they are included in drags

		    // display the cards

		    //always need to reset "canDrag" properties before each draw
		    var maxTop = 0;
		    ssObj.cardSelected = -1;
		    ssObj.setDraggableCards();
            var cardFaceCode = ssObj.getTemplate('card-face');
            var cardBackCode = ssObj.getTemplate('card-back');
            var id = 0;
            for (var stack = 0; stack < 8; stack++) {
                for (var card = 0; card < ssObj.piles[stack].length; card++) {
                    var thisCard = ssObj.piles[stack][card];
                    var cardCode = thisCard.facingUp ? cardFaceCode : cardBackCode;
                    ssDiv.append(cardCode.replace(/%id%/g, thisCard.id)
                        .replace('%top%', ssObj.baseTop)
                        .replace('%left%', ((stack + 2) * 77) + 10)
                        .replace('%zindex%', card)
                        .replace('%candrop%', '')
                        .replace('%dropClass%', '')
                        .replace('%face%', thisCard.suit + thisCard.value));
                    id++;
                }
            }
            for (var stack = 8; stack < 18; stack++) {
                var stackDrop = Math.floor(384 / ssObj.piles[stack].length);
                stackDrop = (stackDrop > 24) ? 24 : stackDrop;
                for (var card = 0; card < ssObj.piles[stack].length; card++) {
                    var thisCard = ssObj.piles[stack][card];
                    var cardCode = thisCard.facingUp ? cardFaceCode : cardBackCode;
                    var top = ssObj.pileTop + (card * stackDrop);
                    maxTop = (top > maxTop) ? top : maxTop;
                    ssDiv.append(cardCode.replace(/%id%/g, thisCard.id)
                        .replace('%top%', top)
                        .replace('%left%',((stack - 8) * 77) + 10)
                        .replace('%zindex%', (thisCard.facingUp ? 200 : card))
                        .replace('%candrop%','event.preventDefault();')
                        .replace('%dropClass%','canDrop')
                        .replace('%dragClass%', (thisCard.canDrag ? 'canDrag' : ''))
                        .replace('%candrag%', thisCard.canDrag)
                        .replace('%face%', thisCard.suit + thisCard.value));
                    id++;
                }
            }
            ssDiv.height(ssObj.baseTop + 96 + maxTop);
		};
		
		
		// shuffle cards
		this.prepareCards = function () {
		    var pos = 0;
		    var suits = ['c', 'd', 'h', 's'];
		    var values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
		    var pile = [];
		    
		    // @TODO: read current game from LocalStorage or from Cookies
		    
		    // create cards
            var card = 0;
		    for (var pack = 0; pack < 2; pack++) {
		        for (var csuit = 0; csuit < 4; csuit++) {
		            for (card = 0; card < 13; card++) {
		                pile.push({ 
		                    suit: suits[csuit], 
		                    value: values[card], 
		                    hierarchy: card,
		                    facingUp: false,
		                    canDrag: false
		                });
		            }
		        }
		    }
		    // shuffle them
		    //@@todo: seed the random numbers so games can be replayed
            for (var shuffle = 0; shuffle < 8000; shuffle++) {
                card1 = Math.floor(Math.random() * 1000) % 104;
                card2 = Math.floor(Math.random() * 1000) % 104;
                tempCard = pile[card1];
                pile[card1] = pile[card2];
                pile[card2] = tempCard ;
            }
            // assign card ids after shuffle
            for (var id = 0; id < pile.length; id++) {
                pile[id].id = id;
            }
            // create deal stacks
            var stack = 0;
            for (stack = 0; stack < 5; stack++) {
                for (card = 0; card < 10; card++) {
                    ssObj.piles[stack].push(pile[stack * 10 + card]);
                }
            }
            // create playing stacks (deal one card on each stack until all gone)
            card = 50;
            do {
                for (stack = 8; stack < 18; stack++) {
                    if (card >= 94) {
                        pile[card].facingUp = true;
                    };
                    ssObj.piles[stack].push(pile[card]);
                    card++;
                    if (card >= 104) {
                        break;
                    }
                }
            } while (card < 104);
            ssObj.deck = pile;
		};
		
		// deal one of the undealt stacks
		this.deal = function () {
		    var stack;
		    for (stack = 0; stack < 10; stack++) {
		        if (ssObj.piles[8 + stack].length == 0) {
		            break;
		        }
		    }
		    if (stack != 10) {
		        ssObj.alert("You cannot deal when there are empty spaces");
		        return;
		    }
		    for (stack = 5; stack >= 0; stack--) {
		        if (ssObj.piles[stack].length == 10) {
		            break;
		        }
		    }
		    if (stack == -1) {
		        ssObj.alert('No cards left to deal');
		    } else {
		        //deal here
		        for (var count = 0; count < 10; count++) {
		            var card = ssObj.piles[stack].pop();
		            card.facingUp = true;
		            ssObj.piles[8 + count].push(card);
		        }
		        ssObj.recordMove(-1, stack, -1, -1);
		        ssObj.checkAndDoRemove();
		        ssObj.redraw();
		    }
		};
		
		// move a card to target (either pile base or card on pile)
		this.moveCard = function (cardId, tg) {
		    var result = false;
            var onthemove = ssObj.deck[cardId];
    	    var targetPile = ssObj.getPileDroppedOn(tg);
    	    if (targetPile.result === -1) {
    	    	return;
    	    }
    	    if (targetPile.cardOnTop === undefined || onthemove.hierarchy == (targetPile.cardOnTop.hierarchy - 1)) {
    		    // time to move the cards around
    		    var resultedInTurn = false;
    		    var sourcePile = ssObj.getPileContainingCard(onthemove.id);
    		    var hand = ssObj.piles[sourcePile.result].splice(sourcePile.pos, ssObj.piles[sourcePile.result].length - sourcePile.pos);
    		    ssObj.piles[targetPile.result] = ssObj.piles[targetPile.result].concat(hand);
    		    if (ssObj.piles[sourcePile.result].length > 0 &&
    		        !ssObj.piles[sourcePile.result][ssObj.piles[sourcePile.result].length-1].facingUp) {
    		        ssObj.piles[sourcePile.result][ssObj.piles[sourcePile.result].length-1].facingUp = true;
    		        resultedInTurn = true;
    		    }
    		    ssObj.recordMove(onthemove.id, sourcePile.result, targetPile.result, resultedInTurn);
    		    ssObj.checkAndDoRemove();
    		    ssObj.redraw();
                ssObj.clearSelection()
                result = true;
    	    }
            return result;
		}; 
		
		// just add another move to the stack
		this.recordMove = function (cardId, sourcePile, targetPile, resultedInTurn) {
		    ssObj.playing = true;
		    ssObj.moves.push({cardId: cardId, sourcePile: sourcePile, targetPile: targetPile, resultedInTurn: resultedInTurn});
		    //@@todo: could store the moves here
		};
		
		// undo the last recorded move
		this.undo = function () {
		    if (ssObj.moves.length) {
		        var thisMove = ssObj.moves.pop();
		        // got the move, let's undo it
		        if (thisMove.cardId == -1) {
		            // undoing a deal
					for (stack = 0; stack < 5; stack++) {
						if (ssObj.piles[stack].length == 0) {
							break;
						}
					}
					if (stack == 5) {
						ssObj.alert('Oops, tried to undo a deal when no deal was done!');
					} else {
						//deal here
						for (var count = 9; count >= 0; count--) {
							var card = ssObj.piles[8+count].pop();
							card.facingUp = false;
							ssObj.piles[stack].push(card);
						}
					}
			    } else if (thisMove.cardId == -2) {
			        //undoing a suit clearance
		            if (thisMove.resultedInTurn) {
                        ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length-1].facingUp = false;
		            }
                    var hand = ssObj.piles[thisMove.targetPile].splice(ssObj.piles[thisMove.targetPile].length - 13, 13);
                    ssObj.piles[thisMove.sourcePile] = ssObj.piles[thisMove.sourcePile].concat(hand);
                    ssObj.undo(); //because this is automatic we need to undo the move that caused it as well
                    
		        } else {
		            // undoing a regular move
		            if (thisMove.resultedInTurn) {
                        ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length - 1].facingUp = false;
		            }
		            // need to find pos of card in pile, quickest is to do call to getcardinpile
		            var tmp = ssObj.getPileContainingCard(thisMove.cardId);
        		    var hand = ssObj.piles[thisMove.targetPile].splice(tmp.pos, ssObj.piles[thisMove.targetPile].length - tmp.pos);
        		    ssObj.piles[thisMove.sourcePile] = ssObj.piles[thisMove.sourcePile].concat(hand);
		            
		        }
		        // @@todo: should update game status in localStorage or cookie
		        ssObj.redraw();
		    } else {
		        ssObj.alert('No more moves to undo');
		    }
		};
		
		// catch ctrl-z as undo
        this.keyPress = function (ev) {
            try {
                if (ev.ctrlKey && ev.charCode == 26) {
                    ssObj.undo();
                }
            } catch (ex) {}
            ev.preventDefault();
            ev.stopPropagation();
        };
        
        // check to see if last move resulted in a full suit being formed and remove it if so
        this.checkAndDoRemove = function () {
            var stack;
            var spareHome = -2;
            
            for (stack = 7; stack >= 0; stack--) {
                if (ssObj.piles[stack].length == 0) {
                    spareHome = stack;
                    break;
                }
            }
            
            for (stack = 8; stack < 18; stack++) {
                var topCard = ssObj.piles[stack][ssObj.piles[stack].length-1];
                var cardAbove = topCard
                if (ssObj.piles[stack].length >= 13 
                    && topCard.value == 'A' 
                    && topCard.facingUp == true) { //enough cards & ace facing up on top
                    
                    var card;
                    for (card = 1; card < 13; card++) {
                        var tempCard = ssObj.piles[stack][ssObj.piles[stack].length - 1 - card];
                        if (!tempCard.facingUp || tempCard.suit != topCard.suit || tempCard.hierarchy != cardAbove.hierarchy + 1) {
                            break;
                        }
                        cardAbove = tempCard;
                    }
                    if (card == 13) {// full suit
                        var hand = ssObj.piles[stack].splice(ssObj.piles[stack].length - 13, 13);
                        ssObj.piles[spareHome] = ssObj.piles[spareHome].concat(hand);
                        var turned = false;
                        if (ssObj.piles[stack].length > 0 && !ssObj.piles[stack][ssObj.piles[stack].length - 1].facingUp) {
                            ssObj.piles[stack][ssObj.piles[stack].length - 1].facingUp =true;
                            turned = true;
                        }
                        ssObj.recordMove(-2, stack, spareHome, turned);
                        spareHome--;
                    }
                }
            }
            
            if (spareHome == -1) {
                ssObj.alert('Congratulations, you have finished, with a score of ' + eval(1300 - ssObj.moves.length));
                ssObj.playing = false;
                ssObj.moves = [];
                //@@todo record the high scores
            }
        };
        
        this.menu = function () {
        //@@todo change this in to a form also showing high scores etc
            ssObj.alert(ssObj.getTemplate('menu'));
        };
        
		//
		// Utility functions from here on
		//
		
		// find the pile that a card has been dropped on
		this.getPileDroppedOn = function (target) {
		    var id = '' + target.id;
		    if (id.indexOf("base_") == 0) {
		        return {result: 8 + eval(id.substr(5)), cardOnTop:undefined};
		    } else {
		        return ssObj.getPileContainingCard(id);
		    }
		    
		};
		
		// find the pile that contains the given card
		this.getPileContainingCard = function (cardId) {
		    var result = -1;
		    var cardOnTop = undefined;
		    var posInStack = -1;
		    try {
		        ssObj.piles.forEach ( function (pile, pileIndex) {
		            pile.forEach( function (card, cardIndex) {
		                if (card.id == cardId) {
		                    result = pileIndex;
		                    topCard = pile[pile.length - 1];
		                    posInStack = cardIndex;
		                    // break does not work so have to use this nasty work around
		                    throw "Found it"; 
		                }
		            });
		        });
	        } catch(e) {}
		    return {result: result, cardOnTop:topCard, pos: posInStack};
		};
		
		// set the attributes of the cards so only the draggable ones can be dragged
		this.setDraggableCards = function () {
		    // iterate through each pile to see if cards can be dragged
		    //first set all cards to non-draggable:
	        ssObj.piles.forEach ( function (pile, pileIndex) {
	            pile.forEach( function (card, cardIndex) {
	                card.canDrag = false;
	            });
	        });
	        ssObj.piles.forEach ( function (pile, pileIndex) {
    	        if (pileIndex >= 8) {
    	            if (pile.length) pile[pile.length - 1].canDrag = true;
    	            for (var cardIndex = pile.length - 2; cardIndex >= 0; cardIndex--) {
    	                if ((pile[cardIndex].hierarchy == pile[cardIndex + 1].hierarchy + 1) &&(pile[cardIndex].suit == pile[cardIndex + 1].suit)) {
    	                    pile[cardIndex].canDrag = true;
    	                } else {
    	                    break;
    	                }
    	            }
    	        }
	        });
		};
		
		// simply un-click the card
		this.unselectCurrentSelectedCard = function () {
		    $('#' + ssObj.cardSelected).removeClass('clicked');
		    ssObj.cardSelected = -1;
		};
		
		//replace window alert with jQuery dialog
		this.alert = function (someHTML) {
		    $('<div>' + someHTML +'</div>').dialog();
		};
		
		// custom exception to give notice to user
		this.Exception = function(message) {
			ssObj.alert(message);
			this.message = message;
			this.name = "Fatal SpiderSolitaire error";
		}
		
		//clear any user-accidental selection
		this.clearSelection = function () {
    		var selection = window.getSelection ? window.getSelection() : document.selection ? document.selection : null;
            if(!selection) selection.empty ? selection.empty() : selection.removeAllRanges();
        };

		
		// return appropriate HTML template for elements of game
		this.getTemplate = function (templateName) {
		    var templates = {
		        'buttons': 
		            '<div align=left>' +
    	                '<form name="ButtonsForm">' +
            		        '<input type="button" id="Undo" value="Undo" >' +
                		    '<input type="button" id="Deal" value="Deal" >' +
                		    '<input type="button" id="Menu" value="Menu" >' +
                		    '<input type="button" id="New" value="New" >' +
                	    '</form>' +
                    '</div>',
                'card-face':
                    '<div id="%id%" class="card %dragClass% %dropClass%" style="top:%top%px;left:%left%px;z-index=%zindex%;background-image:url(images/card_%face%.gif);" ondragover="event.preventDefault();" draggable="%candrag%" selectable="false"/>',
                'card-back':
                    '<div id="%id%" class="card %dropClass%" style="top:%top%px;left:%left%px;background-image:url(images/card_back.gif);" ondragover="%candrop%" selectable="false"/>',
			    'stack-base':
			        '<div id="base_%id%" class="base canDrop" style="top:%top%px;left:%left%px;z-index=%zindex%;background-image:url(images/card_pos.gif);" ondragover="event.preventDefault();"/>',
			    'home-base':
			        '<div class="base" style="top:%top%px;left:%left%px;z-index=%zindex%;background-image:url(images/card_pos.gif);"/>',
			    'menu' :
			        '<div class="menu">some text and info here, perhaps a form to set options</div>'
			};
			return templates[templateName];
        };
	};
});