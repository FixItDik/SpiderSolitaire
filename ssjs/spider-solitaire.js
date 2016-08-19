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
        
        ssObj.playerName = '';
        ssObj.highScores = [];
        ssObj.scoresToKeep = 10;
        ssObj.score = 500;
        ssObj.moveCount = 0;
        
        // these are used to calculate card spacing in tall piles
        // using variables so you can change card dimensions etc if you want
        ssObj.cardHeight = 96;
        ssObj.cardWidth = 71;
        ssObj.cardPadding = 6;
        ssObj.minHeight = 535;
        ssObj.tablePadding = 40;

        ssObj.maxCardSpacing = ssObj.cardHeight / 4;


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
            $('<style id="customStyle"></style>').appendTo("head");
            $(document).attr('draggable','false');
            ssDiv.attr('draggable','false');
            ssObj.initHandlers(ssDiv);
            ssObj.newGame();
            ssObj.initCard = 0;
            setTimeout(ssObj.loadImages, 1);
        };


        // initialise all the event handlers we need
        this.initHandlers = function (ssDiv) {

            // first the four buttons
            ssDiv.on('click', '#Deal', ssObj.deal);

            ssDiv.on('click', '#New', ssObj.checkForNewGame);

            ssDiv.on('click', '#Undo', ssObj.undo);

            ssDiv.on('click', '#Menu', ssObj.showMenu);
            
            ssDiv.on('click', '#Just', ssObj.compact);

            ssDiv.on('click', '#Hide', ssObj.hide);

            //if they want to use ctrl-z to undo
            $(document).keyup(ssObj.keyPress);

            // if they resize the window (or rotate their device)
            $(window).resize( function (event) {
                ssObj.respaceCards();
            });

            // if user has inadvertantly dragged a rectangle on the page they will have selected some (empty) text
            // this means the drag-drop loses the image of the card you are dragging (because the browser thinks
            // you want to drag the card and the selected text) so this should fix it
            ssDiv.on('mousedown', function (event) {
                if (window.getSelection) {
                  if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                  } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                  }
                } else if (document.selection) {  // old IE
                  document.selection.empty();
                }
            });

            // need to save the id of the card being dragged when they start to drag it
            ssDiv.on('dragstart', function (event) {
                if (event.target.classList.contains('canDrag')) {
                    event.originalEvent.dataTransfer.setData('text', event.target.id);
                    ssObj.dragging = true;
                    return;
                }
                event.preventDefault();
            });

            // detect when they drop one card on another
            ssDiv.on('drop', '.canDrop', function (event) {
                event.preventDefault();
                if (event.originalEvent.dataTransfer.getData("text")) {
                    ssObj.dragging = false;
                    ssObj.moveCard(event.originalEvent.dataTransfer.getData("text"), event.target);
                }
            });

            // for non-mouse users detect a tap and act on it
            ssDiv.on('click', '.canDrop', function (event) {
                if (ssObj.cardSelected == -1) {
                    // no card selected so try to select this one
                    if (!event.target.classList.contains('canDrag')) {
                        event.preventDefault();
                        return;
                    }
                    event.target.classList.add('clicked');
                    ssObj.cardSelected = event.target.id;
                } else if (event.target.id == ssObj.cardSelected) {
                    // same card so deselect
                    event.target.classList.remove('clicked');
                    ssObj.cardSelected = -1;
                } else {
                    // new card clicked on so decide if to move or just change selection
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
                event.preventDefault();
                event.stopPropagation();
            });
        };

        ///
        // Now the functions to support the above actions
        ///

        // Do double check if they are in middle of a game
        this.checkForNewGame = function () {
            if (!ssObj.playing) {
                ssObj.newGame();
            } else {
                ssObj.confirm(ssObj.getTemplate('confirmNew'), ssObj.newGame);
            }
        };


        // start a new game
        this.newGame = function () {
            // re-initialise the basic parts of a game
            ssObj.forgetGame();
            ssObj.moves = [];
            ssObj.piles = [];
            ssObj.deck = [];
            ssObj.score = 500;
            ssObj.playing = false;
            ssObj.cardSelected = -1;

            // draw the buttons and pile locations
            ssDiv.html('').append(ssObj.getTemplate('tableaux'));
            var target = $('#workspace');
            var base = ssObj.getTemplate('home-base');
            for (var home = 0; home < 8; home++) {
                target.append(base
                    .replace('%id%', home)
                    .replace('%zindex%', 0)
                    );
            }
            target = $('#table');
            base = ssObj.getTemplate('stack-base');
            for (var stack = 0; stack < 10; stack++) {
                target.append(base
                    .replace('%id%', stack)
                    .replace('%zindex%', 0)
                    );
            }

            // make sure none of the basic table items are draggable
            $('*').attr('draggable', false);

            // create the cards and shuffle them
            ssObj.prepareCards();

            // display the cards

            var maxTop = 0;
            ssObj.cardSelected = -1;
            var cardFaceCode = ssObj.getTemplate('card-face');
            var cardBackCode = ssObj.getTemplate('card-back');
            var id = 0;

            for (var stack = 0; stack < 8; stack++) {
                target = $('#home_' + stack);
                for (var card = 0; card < ssObj.piles[stack].length; card++) {
                    var thisCard = ssObj.piles[stack][card];
                    var cardCode = thisCard.facingUp ? cardFaceCode : cardBackCode;
                    target.append(cardCode
                        .replace(/%id%/g, thisCard.id)
                        .replace('%zindex%', card)
                        .replace('%dropFunction%', '')
                        .replace('%dropClass%', '')
                        .replace('%face%', thisCard.suit + thisCard.value)
                        );
                    id++;
                }
            }

            for (var stack = 8; stack < 18; stack++) {
                target = $('#base_' + (stack-8));
                for (var card = 0; card < ssObj.piles[stack].length; card++) {
                    var thisCard = ssObj.piles[stack][card];
                    var cardCode = thisCard.facingUp ? cardFaceCode : cardBackCode;
                    target.append(cardCode
                        .replace(/%id%/g, thisCard.id)
                        .replace('%zindex%', (thisCard.facingUp ? 200 : card))
                        .replace('%dropFunction%', 'event.preventDefault();')
                        .replace('%dropClass%', 'canDrop')
                        .replace('%face%', thisCard.suit + thisCard.value)
                        );
                    id++;
                }
            }
            if (ssObj.compacted) {
                ssObj.compacted = !ssObj.compacted;
                ssObj.compact();
            }
            ssObj.refreshTable();
        };


        // shuffle cards
        this.prepareCards = function () {
            var pos = 0;
            var suits = ['c', 'd', 'h', 's'];
            var values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
            var pile = [];
            
            if (ssObj.readGame()) {
                // there's an ongoing game so load it

                // disable buttons as necessary
                var stack;
                for (stack = 5; stack >= 0; stack--) {
                    if (ssObj.piles[stack].length == 10) {
                        break;
                    }
                }
                $('#Deal').prop('disabled', eval(stack == -1));

                ssObj.playing = (ssObj.piles[0].length != 13); // may have loaded a completed game

                $('#Undo').prop('disabled', (!ssObj.playing || (ssObj.moves.length == 0)));

            } else {
                // make sure we clear any previous game
                ssObj.forgetGame();
                
                ssObj.score = 500;

                if (ssObj.piles.length == 0) {
                    for (var stack = 0; stack < 18; stack++) {
                        ssObj.piles[stack] = [];
                    }
                }
    
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
                    pile[card2] = tempCard;
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
            }
        };


        // deal one of the undealt stacks
        this.deal = function () {
            var stack;
            // first check there are no empty spaces
            for (stack = 0; stack < 10; stack++) {
                if (ssObj.piles[8 + stack].length == 0) {
                    break;
                }
            }
            if (stack != 10) {
                ssObj.alert("You cannot deal when there are empty spaces");
                return;
            }

            // now find the next deck to deal
            for (stack = 5; stack >= 0; stack--) {
                if (ssObj.piles[stack].length == 10) {
                    break;
                }
            }
            if (stack == -1) {
                ssObj.alert('No cards left to deal');
                $('#Deal').prop('disabled', true);
            } else {
                // deal the deck we found
                for (var count = 0; count < 10; count++) {
                    var card = ssObj.piles[stack].pop();
                    card.facingUp = true;
                    $('#' + card.id).css('background-image', 'url(ssimages/card_' + card.suit + card.value + '.gif)');
                    ssObj.piles[8 + count].push(card);
                    $('#base_' + count).append($('#' + card.id));
                }

                ssObj.recordMove(-1, stack, -1, -1);
                ssObj.checkAndDoRemove();
                ssObj.refreshTable();
                if (stack == 0) {
                    $('#Deal').prop('disabled', true);
                }
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
                hand.forEach( function (card, cardIndex) {
                    t = targetPile.result < 8 ? $('#home_' + targetPile.result) : $('#base_' + (targetPile.result - 8));
                    $(t).append($('#' + card.id));
                });
                ssObj.piles[targetPile.result] = ssObj.piles[targetPile.result].concat(hand);
                if (ssObj.piles[sourcePile.result].length > 0 &&
                    !ssObj.piles[sourcePile.result][ssObj.piles[sourcePile.result].length - 1].facingUp) {
                    ssObj.piles[sourcePile.result][ssObj.piles[sourcePile.result].length - 1].facingUp = true;
                    var card = ssObj.piles[sourcePile.result][ssObj.piles[sourcePile.result].length - 1];
                    $('#' + card.id).css('background-image', 'url(ssimages/card_' + card.suit + card.value + '.gif)');
                    resultedInTurn = true;
                }
                ssObj.recordMove(onthemove.id, sourcePile.result, targetPile.result, resultedInTurn);
                ssObj.checkAndDoRemove();
                ssObj.refreshTable();
                result = true;
            }
            return result;
        };


        // undo the last recorded move
        this.undo = function () {
            // check to see if there are any moves to undo, if so undo the last one
            if (ssObj.moves.length) {
                var thisMove = ssObj.moves.pop();
                // got the move, let's undo it
                if (thisMove.cardId == -1) {
                    // undoing a deal
                    var stack;
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
                            var card = ssObj.piles[8 + count].pop();
                            card.facingUp = false;
                            $('#' + card.id).css('background-image', '');
                            ssObj.piles[stack].push(card);
                            $('#home_' + stack).append($('#' + card.id));
                        }
                        $('#Deal').prop('disabled', false);
                    }
                } else if (thisMove.cardId == -2) {
                    //undoing a suit clearance
                    if (thisMove.resultedInTurn) {
                        ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length - 1].facingUp = false;
                        var card = ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length - 1];
                        $('#' + card.id).css('background-image', '');
                    }
                    var hand = ssObj.piles[thisMove.targetPile].splice(ssObj.piles[thisMove.targetPile].length - 13, 13);
                    hand.forEach(function (card, cardIndex) {
                        var t = thisMove.sourcePile < 8 ? $('#home_' + thisMove.sourcePile) : $('#base_' + (thisMove.sourcePile - 8));
                        $(t).append($('#' + card.id));
                    });
                    ssObj.piles[thisMove.sourcePile] = ssObj.piles[thisMove.sourcePile].concat(hand);
                    ssObj.undo(); //because this is automatic we need to undo the move that caused it as well

                } else {
                    // undoing a regular move
                    if (thisMove.resultedInTurn) {
                        ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length - 1].facingUp = false;
                        var card = ssObj.piles[thisMove.sourcePile][ssObj.piles[thisMove.sourcePile].length - 1];
                        $('#' + card.id).css('background-image', '');
                    }
                    // need to find pos of card in pile, quickest is to do call to getcardinpile
                    var tmp = ssObj.getPileContainingCard(thisMove.cardId);
                    var hand = ssObj.piles[thisMove.targetPile].splice(tmp.pos, ssObj.piles[thisMove.targetPile].length - tmp.pos);
                    hand.forEach(function (card, cardIndex) {
                        var t = thisMove.sourcePile < 8 ? $('#home_' + thisMove.sourcePile) : $('#base_' + (thisMove.sourcePile - 8));
                        $(t).append($('#' + card.id));
                    });
                    ssObj.piles[thisMove.sourcePile] = ssObj.piles[thisMove.sourcePile].concat(hand);

                }
                ssObj.score--;
                ssObj.refreshTable();
                // save the current status in case they close window
                ssObj.saveGame();
            } else {
                ssObj.alert('No more moves to undo');
            }
        };


        // catch ctrl-z as undo
        this.keyPress = function (ev) {
            try {
                if (ev.ctrlKey && ((ev.key.toLowerCase() == 'z') ||(ev.keyCode == 90)) && ssObj.moves.length > 0) {
                    ssObj.undo();
                } else if (ev.key.toLowerCase() == 'escape' || ev.keyCode == 27) {
                    ssObj.hide();
                }
            } catch (ex) {}
            ev.preventDefault();
            ev.stopPropagation();
        };


        // display the Menu (placeholder at moment)
        this.showMenu = function (theirScore) {
            var scores = ssObj.getTemplate('score');
            var tmp = '';
            var congrats = '';
            if (!isNaN(theirScore)) {
                congrats = ssObj.getTemplate('congrats').replace('%score%', theirScore);
            } else {
                theirScore = 0;
            }
            for (var index=0; index < ssObj.highScores.length; index++) {
                var highlight = '';
                if ((ssObj.highScores[index].score == theirScore) && (('' + ssObj.highScores[index].date).substr(0,10) == JSON.parse(JSON.stringify(new Date())).substr(0,10))) {
                    highlight = 'highlight';
                }
                tmp += scores.replace('%score%', ssObj.highScores[index].score)
                            .replace('%date%', ('' + ssObj.highScores[index].date).substr(0,10))
                            .replace('%name%', ssObj.highScores[index].player)
                            .replace('%highlight%', highlight);
            }
            $('<div>' + ssObj.getTemplate('menu').replace('%player%', ssObj.playerName).replace('%scores%', tmp).replace('%congratulate%', congrats) +'</div>').dialog(
                {
                    modal : true, 
                    title :  "Spider Solitaire",
                    buttons: [
                        {
                            text : 'save name & reset scores',
                            click : function () {
                                ssObj.playerName = $('#ssplayer').val();
                                ssObj.highScores = [];
                                try {
                                    localStorage.removeItem('spidersolitaireHighScores');
                                } catch (ex) {}
                                ssObj.saveGame();
                                $(this).dialog('destroy');
                            }
                        },
                        {
                            text : 'close', 
                            click : function () {
                                $(this).dialog('destroy');
                            },
                            class : 'default-button'
                        }
                    ],
                    close : function () {
                        $(this).dialog('destroy');
                    }
                });
            $('.ui-dialog, .ui-dialog *, .ui-widget-overlay').addClass('ssexceptme');
            $('.default-button').focus();
        };


        // hide everything except the game
        this.compact = function () {
            if (ssObj.compacted == true) {
                $(document.body).removeClass('sscompact');
                ssObj.compacted = false;
                $('#Just').attr('value', 'Compact');
            } else {
                $(document.body).addClass('sscompact');
                $('#spidersolitaire *, #spidersolitaire').addClass('ssexceptme');
                var e = $('#spidersolitaire').parent();
                while (e[0].nodeName != 'BODY') {
                    e.addClass('ssexceptme');
                    e = e.parent();
                }
                ssObj.compacted = true;
                $('#Just').attr('value', 'Whole');
            }
        };


        // hide everything except the buttons
        this.hide = function () {
            if (ssObj.hidden == true) {
                $('.spidersolitaire').removeClass('sshide');
                $('#Hide').attr('value', 'Hide');
                ssObj.hidden = false;
            } else {
                $('.spidersolitaire').addClass('sshide');
                $('#Hide').attr('value', 'Show');
                ssObj.hidden = true;
            }
        }


        //
        // Utility functions from here on
        //

        // just add another move to the stack
        this.recordMove = function (cardId, sourcePile, targetPile, resultedInTurn) {
            ssObj.playing = true;
            if (cardId >= 0) {
                ssObj.score--;
            }
            
            ssObj.moves.push({cardId: cardId, sourcePile: sourcePile, targetPile: targetPile, resultedInTurn: resultedInTurn});
            // save the current status in case they close window
            ssObj.saveGame();
        };


        // check to see if last move resulted in a full suit being formed and remove it if so
        this.checkAndDoRemove = function () {
            var stack;
            var spareHome = -2;

            // work out where we would put it if we find one
            for (stack = 7; stack >= 0; stack--) {
                if (ssObj.piles[stack].length == 0) {
                    spareHome = stack;
                    break;
                }
            }

            // now look to see if one exists
            for (stack = 8; stack < 18; stack++) {
                var topCard = ssObj.piles[stack][ssObj.piles[stack].length - 1];
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
                    if (card == 13) {
                        // full suit found
                        var hand = ssObj.piles[stack].splice(ssObj.piles[stack].length - 13, 13);
                        hand.forEach(function (card, cardIndex) {
                            var t = $('#home_' + spareHome);
                            $(t).append($('#' + card.id));
                        });
                        ssObj.piles[spareHome] = ssObj.piles[spareHome].concat(hand);
                        ssObj.score += 100;
                        var turned = false;
                        if (ssObj.piles[stack].length > 0 && !ssObj.piles[stack][ssObj.piles[stack].length - 1].facingUp) {
                            ssObj.piles[stack][ssObj.piles[stack].length - 1].facingUp = true;
                            var tmpCard = ssObj.piles[stack][ssObj.piles[stack].length - 1];
                            $('#' + tmpCard.id).css('background-image', 'url(ssimages/card_' + tmpCard.suit + tmpCard.value + '.gif)');
                            turned = true;
                        }
                        ssObj.recordMove(-2, stack, spareHome, turned);
                        spareHome--;
                    }
                }
            }

            if (spareHome == -1) {
                ssObj.displayScore();
                ssObj.playing = false;
                ssObj.moves = [];
                ssObj.highScoreCheck();
                ssObj.saveGame();
                //@@todo ask them if they want to start a new game
                ssObj.showMenu(ssObj.score);
            }
        };


        // check if current score is a high score and if so add it to the top 10
        this.highScoreCheck = function () {
            var index;
            for (index = 0; index < ssObj.highScores.length; index++) {
                var highScore = ssObj.highScores[index];
                if (highScore.score < ssObj.score) {
                    ssObj.highScores.splice(index, 0, { score: ssObj.score,
                                    date: new Date(),
                                    player: ssObj.playerName
                                    });
                    if (ssObj.highScores.length > ssObj.scoresToKeep) {
                        ssObj.highScores.pop(); // remove last one
                    }
                    break;
                }
            }
            
            if (index == ssObj.highScores.length && ssObj.highScores.length < ssObj.scoresToKeep) {
                ssObj.highScores.push({ score: ssObj.score,
                                        date: new Date(),
                                        player: ssObj.playerName
                                        });
            }
            ssObj.highScores = JSON.parse(JSON.stringify(ssObj.highScores)); // ensures dates are in UTC format for displaying
        };


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
                            // break does not work in "forEach" so have to use this nasty work around
                            throw "Found it";
                        }
                    });
                });
            } catch(e) {}
            return {result: result, cardOnTop: topCard, pos: posInStack};
        };


        // simply un-click the card that is currently selected
        this.unselectCurrentSelectedCard = function () {
            $('#' + ssObj.cardSelected).removeClass('clicked');
            ssObj.cardSelected = -1;
        };


        // ensure table is presented correctly
        this.refreshTable = function () {
            ssObj.respaceCards();
            ssObj.setDraggableCards();
            ssObj.displayScore();
            ssObj.unselectCurrentSelectedCard();
            $('#Undo').prop('disabled', (!ssObj.playing || (ssObj.moves.length == 0)));
        };


        // recalculate the card spacing for the piles based on visible area
        this.respaceCards = function () {
            //  calculate margin-top of every card (except first) in base as "height of base - (count * height of card)"
            var baseStyling = '\nbody.sscompact *:not(.ssexceptme) {display:none;}\n';
            var tableSize = $('#table')[0].clientHeight;
            for (var stack = 0; stack < 10; stack++) {
                var calcMargin = ssObj.maxCardSpacing - ssObj.cardHeight;
                if (ssObj.piles[stack + 8].length > 1) {
                    var calcSpacing = (tableSize - ssObj.cardHeight - 80) / (ssObj.piles[stack + 8].length - 1);
                    calcMargin = calcSpacing > ssObj.maxCardSpacing ? (ssObj.maxCardSpacing - ssObj.cardHeight) : (calcSpacing - ssObj.cardHeight);
                }
                baseStyling += '.spidersolitaire #base_' + stack + ' .card {margin-top:' + calcMargin + 'px;}\n';
            }
            $('#customStyle').html(baseStyling);
        };


        // set the attributes of the cards so only the draggable ones can be dragged
        this.setDraggableCards = function () {
            // iterate through each pile to see if cards can be dragged
            //first set all cards to non-draggable:
            ssObj.piles.forEach ( function (pile, pileIndex) {
                pile.forEach( function (card, cardIndex) {
                    card.canDrag = false;
                    $('#' + card.id).removeClass('canDrag');
                });
            });

            // now go determine which cards can be dragged and set them up accordingly
            ssObj.piles.forEach ( function (pile, pileIndex) {
                if (pileIndex >= 8) {
                    if (pile.length) {
                        pile[pile.length - 1].canDrag = true;
                        $('#' + pile[pile.length - 1].id).addClass('canDrag');
                    }
                    for (var cardIndex = pile.length - 2; cardIndex >= 0; cardIndex--) {
                        if ((pile[cardIndex].hierarchy == pile[cardIndex + 1].hierarchy + 1) &&(pile[cardIndex].suit == pile[cardIndex + 1].suit)) {
                            pile[cardIndex].canDrag = true;
                               $('#' + pile[cardIndex].id).addClass('canDrag');
                        } else {
                            break;
                        }
                    }
                }
            });

            $('*').prop('draggable', false);
            $('.canDrag').prop('draggable', true)
        };


        this.displayScore = function () {
            $('#ssScore').html('Score: ' + ssObj.score);
        };


        // save game to localStorage (if supported)
        this.saveGame = function () {
            if (ssObj.usingstorage) {
                try {
                    localStorage.setItem('spidersolitaireMoves', JSON.stringify(ssObj.moves));
                    localStorage.setItem('spidersolitairePiles', JSON.stringify(ssObj.piles));
                    localStorage.setItem('spidersolitaireDeck', JSON.stringify(ssObj.deck));
                    localStorage.setItem('spidersolitaireScore', JSON.stringify(ssObj.score));
                    localStorage.setItem('spidersolitaireHighScores', JSON.stringify(ssObj.highScores));
                    localStorage.setItem('spidersolitairePlayerName', JSON.stringify(ssObj.playerName));
                } catch (ex) {
                    // just catch
                }
            }
        };


        // read the game from localStorage (if supported)
        // returns true if they were in the middle of a game
        this.readGame = function () {
            if (typeof(Storage) !== "undefined" && localStorage !== undefined) {
                ssObj.usingstorage = true;
                ssObj.deck = ssObj.readStorage(localStorage.spidersolitaireDeck, 'array');
                ssObj.piles = ssObj.readStorage(localStorage.spidersolitairePiles, 'array');
                ssObj.moves = ssObj.readStorage(localStorage.spidersolitaireMoves, 'array');
                ssObj.score = ssObj.readStorage(localStorage.spidersolitaireScore, 'number');
                ssObj.playerName = ssObj.readStorage(localStorage.spidersolitairePlayerName, 'string');
                ssObj.highScores = ssObj.readStorage(localStorage.spidersolitaireHighScores, 'array');
                return (ssObj.piles.length > 0);
            } else if (!(document.cookie.indexOf('nostorage') > -1)) {
                document.cookie = 'nostorage=true';
                ssObj.alert('Your browser does not support "localStorage" so there is no way to remember games, sorry');
            }
            ssObj.usingstorage = false;
            return false;
        };


        // parse localStorage item without error
        this.readStorage = function (item, type) {
            try {
                return JSON.parse(item);
            } catch (ex) {
                if (type == 'array') {
                    return [];
                } else if (type == 'number') {
                    return 0;
                } else {
                    return '';
                }
            }
        };


        // read the game from localStorage (if supported)
        this.forgetGame = function () {
            if (ssObj.usingstorage) {
                try {
                    localStorage.removeItem('spidersolitaireMoves');
                    localStorage.removeItem('spidersolitairePiles');
                    localStorage.removeItem('spidersolitaireDeck');
                    localStorage.removeItem('spidersolitaireScore');
                } catch (ex) {
                    // just catch
                }
            }
        };


        // reset the remembered high scores
        this.resetHighScores = function (newName) {
            ssObj.highScores = [];
            try {
                localStorage.removeItem('spidersolitaireHighScores');
            } catch (ex) {}
        };


        // load next image until whole deck has been loaded
        // this saves delay when image first appears on browser
        this.loadImages = function () {
            if (ssObj.initCard == 0) {
                $('#workspace').append('<div id="imageLoader" style="display:none;"/>');
            }
            var tmpCard = ssObj.deck[ssObj.initCard];
            $('#imageLoader').css('background-image', 'url(ssimages/card_' + tmpCard.suit + tmpCard.value + '.gif)');
            ssObj.initCard++;
            if (ssObj.initCard < ssObj.deck.length) {
                setTimeout(ssObj.loadImages, 30);
            }
            // else could remove the div here
        };

        //replace window alert with jQuery dialog
        this.alert = function (someHTML) {
            $('<div>' + someHTML +'</div>').dialog({
                modal : true, 
                title : "Spider Solitaire", 
                close : function () {
                    $(this).dialog('destroy');
                }
            });
            $('.ui-dialog, .ui-dialog *').addClass('ssexceptme');
        };


        // replace window confirm with jQuery dialog
        this.confirm = function (question, confirmFunction) {
            $('<div>' + question + '</div>').dialog({
                title : 'Are you sure?',
                close : function () {
                    $(this).dialog('destroy');
                },
                buttons : {
                    "Confirm" : function () {
                        $(this).dialog('destroy');
                        confirmFunction();
                    },
                    "Cancel" : function () {
                        $(this).dialog('destroy');
                    }
                }
            });
            $('.ui-dialog, .ui-dialog *, .ui-widget-overlay').addClass('ssexceptme');
        };



        // custom exception to give notice to user
        this.Exception = function(message) {
            ssObj.alert(message);
            this.message = message;
            this.name = "Fatal SpiderSolitaire error";
        };


        // return appropriate HTML template for elements of game
        this.getTemplate = function (templateName) {
            var templates = {
                'tableaux' :
                    '<div id="workspace">' +
                        '<form name="ButtonsForm">' +
                            '<input type="button" id="Undo" value="Undo" disabled="true">' +
                            '<input type="button" id="Deal" value="Deal" >' +
                            '<input type="button" id="Menu" value="Menu" >' +
                            '<input type="button" id="New" value="New" >' +
                            '<input type="button" id="Just" value="Compact" >' +
                            '<input type="button" id="Hide" value="Hide" >' +
                            '<span id="ssScore"/>' +
                        '</form>' +
                    '</div>' +
                    '<div id="table">' +
                    '</div>',
                'card-face' :
                    '<div id="%id%" class="card %dropClass%" style="z-index:%zindex%;background-image:url(ssimages/card_%face%.gif);" ondragover="event.preventDefault();" />',
                'card-back' :
                    '<div id="%id%" class="card %dropClass%" style="z-index:%zindex%;" ondragover="%dropFunction%"/>',
                'stack-base' :
                    '<div id="base_%id%" class="base canDrop" style="z-index:%zindex%;" ondragover="event.preventDefault();"/>',
                'home-base' :
                    '<div id="home_%id%" class="base home" style="z-index:%zindex%;"/>',
                'score' :
                    '<tr class="%highlight%"><td>%score%</td><td>%date%</td><td>%name%</td></tr>',
                'menu' :
                    '<div class="menu">%congratulate%The top 10 high scores are:<br>' +
                    '<table class="ssscores"><tr><th>Score</th><th>Date</th><th>Name</th></tr>%scores%</table></div>' +
                    '<label for="ssplayer">Your name:&nbsp;</label><input type="text" id="ssplayer" value="%player%">',
                'congrats' :
                    'Congratulations, you have finished and your score is %score%<br>',
                'confirmNew' :
                    'You are in the middle of a game, are you sure?'
            };
            return templates[templateName];
        };
    };
});