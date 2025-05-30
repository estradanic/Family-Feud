console.clear()

var app = {
    version: 1,
    role: "player",
    socket: io.connect(),
    jsonFile: "../public/data/FamilyFeud_Questions.json",
    currentQ: 0,
    wrong:0,
    board: $(`<div class='gameBoard'>
                <!--- Scores --->
                <div class='teamSection'>
                    <div class='teamNameContainer' id='team1Container'>
                        <input type='text' class='teamNameInput hide' id='team1Input' placeholder='Team 1 Name' maxlength='20' value='Team 1'>
                        <div class='teamName' id='team1Name'>Team 1</div>
                    </div>
                    <div class='score' id='team1'>0</div>
                </div>
                
                <div class='score' id='boardScore'>0</div>
                
                <div class='teamSection'>
                    <div class='teamNameContainer' id='team2Container'>
                        <input type='text' class='teamNameInput hide' id='team2Input' placeholder='Team 2 Name' maxlength='20' value='Team 2'>
                        <div class='teamName' id='team2Name'>Team 2</div>
                    </div>
                    <div class='score' id='team2'>0</div>
                </div>

                <!--- Main Board --->
                <div id='middleBoard'>

                    <!--- Question --->
                    <div class='questionHolder'>
                        <span class='question'></span>
                    </div>

                    <!--- Answers --->
                    <div class='colHolder'>
                    </div>

                </div>
                <!--- Wrong --->
                <div class='wrongX wrongBoard'>
                    <img alt="not on board" src="/public/img/Wrong.svg"/>
                    <img alt="not on board" src="/public/img/Wrong.svg"/>
                    <img alt="not on board" src="/public/img/Wrong.svg"/>
                </div>

                <!--- Buttons --->
                <div class='btnHolder hide' id="host">
                    <div id='hostBTN'     class='button'>Be the host</div>
                    <div id='awardTeam1'  class='button' data-team='1'>Award Team 1</div>
                    <div id='newQuestion' class='button'>New Question</div>
                    <div id="wrong"       class='button wrongX'>
                        <img alt="not on board" src="/public/img/Wrong.svg"/>
                    </div>
                    <div id='prevQuestion' class='button'>Previous Question</div>
                    <div id='resetScores' class='button'>Reset Scores</div>
                    <div id='awardTeam2'  class='button' data-team='2'>Award Team 2</div>
                </div>
            </div>`),
    
    // Utility functions
    shuffle: (array) => {
        var currentIndex = array.length,
            temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    },
    jsonLoaded: (data) => {
        app.allData = data;
        app.questions = Object.keys(data);
        app.makeQuestion(app.currentQ);
        app.board.find('.host').hide();
        $('body').append(app.board);
    },

    // Action functions
    makeQuestion: (eNum) => {
        var qText = app.questions[eNum];
        var qAnswr = app.allData[qText];

        var qNum = qAnswr.length;
        qNum = (qNum < 8) ? 8 : qNum;
        qNum = (qNum % 2 != 0) ? qNum + 1 : qNum;

        var boardScore = app.board.find("#boardScore");
        var question = app.board.find(".question");
        var holderMain = app.board.find(".colHolder");

        boardScore.html(0);
        
        // Clean text and store it as a data attribute for reference
        var cleanText = qText.replace(/&x22;/gi, '"');
        question.attr('data-text', cleanText);
        
        // Set content based on role
        if (app.role === "host") {
            // Host always sees the question
            question.html(cleanText);
        } else {
            // Clients start with question hidden
            question.html('');
        }
        
        // Track client-side visibility state (separate from what host sees)
        question.data('client-revealed', false);
        
        holderMain.empty();

        app.wrong = 0;
        var wrong = app.board.find(".wrongBoard")
        $(wrong).find("img").hide()
        $(wrong).hide()

        qNum = 10

        for (var i = 0; i < qNum; i++) {
            var aLI;
            if (qAnswr[i]) {
                aLI = $(`<div class='cardHolder'>
                            <div class='card' data-id='${i}'>
                                <div class='front'>
                                    <span class='DBG'>${(i + 1)}</span>
                                    <span class='answer'>${qAnswr[i][0]}</span>
                                </div>
                                <div class='back DBG'>
                                    <span>${qAnswr[i][0]}</span>
                                    <b class='LBG'>${qAnswr[i][1]}</b>
                                </div>
                            </div>
                        </div>`)
            } else {
                aLI = $(`<div class='cardHolder empty'><div></div></div>`)
            }

            var parentDiv = holderMain//(i < (qNum / 2)) ? col1 : col2;
            aLI.on('click', {
                trigger: 'flipCard',
                num: i
            }, app.talkSocket);
            $(aLI).appendTo(parentDiv)
        }

        var cardHolders = app.board.find('.cardHolder');
        var cards = app.board.find('.card');
        var backs = app.board.find('.back');
        var cardSides = app.board.find('.card>div');

        TweenLite.set(cardHolders, {
            perspective: 800
        });
        TweenLite.set(cards, {
            transformStyle: "preserve-3d"
        });
        TweenLite.set(backs, {
            rotationX: 180
        });
        TweenLite.set(cardSides, {
            backfaceVisibility: "hidden"
        });
        cards.data("flipped", false);
    },

    // Question reveal toggle function
    toggleQuestion: () => {
        if (app.role === "host") {
            var question = app.board.find(".question");
            var isClientRevealed = question.data('client-revealed');
            
            // Toggle client-side visibility state
            var newState = !isClientRevealed;
            question.data('client-revealed', newState);
            
            // Emit socket event to update clients
            app.socket.emit("talking", {
                trigger: 'toggleQuestion',
                revealed: newState
            });
        }
    },
    
    // Type animation function
    typeQuestion: () => {
        var question = app.board.find(".question");
        var text = question.attr('data-text');
        var length = text.length;
        var current = 0;
        
        // Clear any existing content
        question.html('');
        
        // Type out the text character by character
        var interval = setInterval(function() {
            if (current < length) {
                question.html(question.html() + text.charAt(current));
                current++;
            } else {
                clearInterval(interval);
            }
        }, 30); // Speed of typing
    },
    
    getBoardScore: () => {
        var cards = app.board.find('.card');
        var boardScore = app.board.find('#boardScore');
        var currentScore = {
            var: boardScore.html()
        };
        var score = 0;

        function tallyScore() {
            if ($(this).data("flipped")) {
                var value = $(this).find("b").html();
                score += parseInt(value)
            }
        }
        $.each(cards, tallyScore);
        TweenMax.to(currentScore, 1, {
            var: score,
            onUpdate: function () {
                boardScore.html(Math.round(currentScore.var));
            },
            ease: Power3.easeOut
        });
    },
    awardPoints: (num) => {
        if (app.role == "host") $("#win")[0].play();
        var boardScore = app.board.find('#boardScore');
        var currentScore = {
            var: parseInt(boardScore.html())
        };
        var team = app.board.find("#team" + num);
        var teamScore = {
            var: parseInt(team.html())
        };
        var teamScoreUpdated = (teamScore.var + currentScore.var);
        TweenMax.to(teamScore, 1, {
            var: teamScoreUpdated,
            onUpdate: function () {
                team.html(Math.round(teamScore.var));
            },
            ease: Power3.easeOut
        });

        TweenMax.to(currentScore, 1, {
            var: 0,
            onUpdate: function () {
                boardScore.html(Math.round(currentScore.var));
            },
            ease: Power3.easeOut
        });
    },
    changeQuestion: () => {
        app.currentQ++;
        app.makeQuestion(app.currentQ);
    },
    
    // New function to navigate to previous question
    previousQuestion: () => {
        if (app.currentQ > 0) {
            app.currentQ--;
            app.makeQuestion(app.currentQ);
        }
    },
    
    // New function to reset both team scores to zero
    resetScores: () => {
        if (app.role == "host") {
            // Reset visual scores
            app.board.find('#team1, #team2').html('0');
            
            // Play a sound effect (optional)
            $("#ding")[0].play();
            
            // Notify clients
            app.socket.emit("talking", {
                trigger: 'resetScores'
            });
        }
    },
    
    // New function to enable direct score editing
    enableScoreEditing: (teamNumber) => {
        const teamScore = app.board.find(`#team${teamNumber}`);
        const currentScore = teamScore.text();
        
        // Create an input field with the current score
        const input = $(`<input type='number' class='scoreEdit' value='${currentScore}' min='0'>`);
        
        // Replace the score display with the input
        teamScore.html(input);
        input.focus().select();
        
        // Handle when input is complete (blur or enter)
        input.on('blur keypress', function(e) {
            if (e.type === 'blur' || e.which === 13) {
                const newScore = parseInt($(this).val()) || 0;
                
                // Update locally
                teamScore.html(newScore);
                
                // Broadcast to other clients
                app.socket.emit("talking", {
                    trigger: 'updateScore',
                    team: teamNumber,
                    score: newScore
                });
                
                e.preventDefault();
            }
        });
    },
    
    makeHost: () => {
        app.role = "host";
        
        // Show the question for the host
        var question = app.board.find(".question");
        question.html(question.attr('data-text'));
        
        // Make input fields visible and hide the corresponding display elements
        app.board.find('.teamNameInput').removeClass('hide');
        
        // Remove the "Be the host" button
        app.board.find('#hostBTN').remove();
        
        // Show the host controls
        app.board.find(".hide").removeClass('hide');
        app.board.addClass('showHost');
        
        // Notify other clients that host is assigned
        app.socket.emit("talking", {
            trigger: 'hostAssigned'
        });
    },
    flipCard: (n) => {
        console.log("card");
        console.log(n);
        if (app.role == "host") $("#ding")[0].play();
        var card = $('[data-id="' + n + '"]');
        var flipped = $(card).data("flipped");
        var cardRotate = (flipped) ? 0 : -180;
        TweenLite.to(card, 1, {
            rotationX: cardRotate,
            ease: Back.easeOut
        });
        flipped = !flipped;
        $(card).data("flipped", flipped);
        app.getBoardScore()
    },
    wrongAnswer:()=>{
        app.wrong++
        console.log("wrong: "+ app.wrong )
        if (app.role == "host") $("#buzzer")[0].play();
        var wrong = app.board.find(".wrongBoard")
        $(wrong).find("img:nth-child("+app.wrong+")").show()
        $(wrong).show()
        setTimeout(() => { 
            $(wrong).hide(); 
        }, 1000); 

    },

    // Update the team name handling functionality
    // Update the updateTeamName function to properly handle team name display
    updateTeamName: (teamNumber, newName) => {
        // Update the team name display
        app.board.find(`#team${teamNumber}Name`).text(newName);
        
        // Update the award button text
        app.board.find(`#awardTeam${teamNumber}`).text(`Award ${newName}`);
        
        // Update the input field value (only if it's not the source)
        const inputField = app.board.find(`#team${teamNumber}Input`);
        if (inputField.val() !== newName) {
            inputField.val(newName);
        }
    },

    // Handle team name input events
    handleTeamNameInput: (teamNumber) => {
        return function() {
            const newName = $(this).val();
            
            // Update locally (both display and button)
            app.updateTeamName(teamNumber, newName);
            
            // Then broadcast to other clients
            app.socket.emit("talking", {
                trigger: 'teamNameChange',
                team: teamNumber,
                name: newName
            });
        };
    },

    // Socket Test
    talkSocket: (e) => {
        if (app.role == "host") app.socket.emit("talking", e.data);
    },
    listenSocket: (data) => {
        console.log(data);
        switch (data.trigger) {
            case "newQuestion":
                app.changeQuestion();
                break;
            case "prevQuestion":
                app.previousQuestion();
                break;
            case "awardTeam1":
                app.awardPoints(1);
                break;
            case "awardTeam2":
                app.awardPoints(2);
                break;
            case "resetScores":
                app.board.find('#team1, #team2').html('0');
                break;
            case "updateScore":
                app.board.find(`#team${data.team}`).html(data.score);
                break;
            case "flipCard":
                app.flipCard(data.num);
                break;
            case "hostAssigned":
                // When someone becomes host, remove the "Be the host" button from all clients
                app.board.find('#hostBTN').remove();
                break;
            case "wrong":
                app.wrongAnswer()
                break;
            case "toggleQuestion":
                if (app.role !== "host") {
                    if (data.revealed) {
                        // Show question with typing animation for clients
                        app.typeQuestion();
                    } else {
                        // Hide question for clients
                        app.board.find(".question").html('');
                    }
                    app.board.find(".question").data('client-revealed', data.revealed);
                }
                break;
            case "teamNameChange":
                // Update team name on all clients
                app.updateTeamName(data.team, data.name);
                break;
        }
    },
    
    // Inital function
    init: () => {

        $.getJSON(app.jsonFile, app.jsonLoaded);

        app.board.find('#hostBTN'    ).on('click', app.makeHost);
        app.board.find('#awardTeam1' ).on('click', { trigger: 'awardTeam1' }, app.talkSocket);
        app.board.find('#awardTeam2' ).on('click', { trigger: 'awardTeam2' }, app.talkSocket);
        app.board.find('#newQuestion').on('click', { trigger: 'newQuestion'}, app.talkSocket);
        app.board.find('#wrong'      ).on('click', { trigger: 'wrong'      }, app.talkSocket);
        app.board.find('#prevQuestion').on('click', { trigger: 'prevQuestion' }, app.talkSocket);
        app.board.find('#resetScores').on('click', { trigger: 'resetScores' }, app.talkSocket);
        
        // Add double-click handlers for score editing (host only)
        app.board.find('#team1').on('dblclick', function() {
            if (app.role === "host") app.enableScoreEditing(1);
        });
        app.board.find('#team2').on('dblclick', function() {
            if (app.role === "host") app.enableScoreEditing(2);
        });
        
        // Add event handlers for team name inputs
        app.board.find('#team1Input').on('input', app.handleTeamNameInput(1));
        app.board.find('#team2Input').on('input', app.handleTeamNameInput(2));
        
        // Add click handler for the question element
        app.board.find('.questionHolder').on('click', app.toggleQuestion);

        app.socket.on('listening', app.listenSocket)
    }
};
app.init();