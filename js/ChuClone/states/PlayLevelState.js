/**
File:
	CharacterControllerComponent.js
Created By:
	Mario Gonzalez
Project	:
	ChuClone
Abstract:
 	This component will allow an entity to be controlled as a 'character'
 Basic Usage:

 License:
    Creative Commons Attribution-NonCommercial-ShareAlike
    http://creativecommons.org/licenses/by-nc-sa/3.0/
 */
(function(){
    "use strict";

	ChuClone.namespace("ChuClone.states");

	ChuClone.states.PlayLevelState = function() {
		ChuClone.states.PlayLevelState.superclass.constructor.call(this);
	};

	ChuClone.states.PlayLevelState.prototype = {

        /**
         * @type {Number}
         */
        _currentTime    : 0,
        _previousTime   : 0,
        _elapsedTime    : 0,
        
        /**
         * @type {ChuClone.GameViewController}
         */
        _gameView: null,

        /**
         * @type {ChuClone.physics.WorldController}
         */
        _worldController: null,

        /**
         * @type {ChuClone.PlayerEntity}
         */
        _player         : null,

        // Internal state
        _beatLevel      : false,

		/**
		 * @inheritDoc
		 */
		enter: function() {
			ChuClone.states.PlayLevelState.superclass.enter.call(this);

            this._beatLevel = false;
            this._previousTime = Date.now();
            this.setupEvents();
		},

        setupEvents: function() {
            var that = this;
            this.addListener( ChuClone.components.GoalPadComponent.prototype.EVENTS.GOAL_REACHED, function( aGoalPad ) { that.onGoalReached( aGoalPad ) } );
        },

        /**
         * @inheritDoc
         */
        update: function() {
            ChuClone.states.PlayLevelState.superclass.update.call(this);
            this.updateTime();

            /**
             * @type {Box2D.Dynamics.b2Body}
             */
            var node = this._worldController.getWorld().GetBodyList();
            while(node) {
                var b = node;
                node = node.GetNext();
                /**
                 * @type {ChuClone.GameEntity}
                 */
                var entity = b.GetUserData();
                if(entity)
                    entity.update();
            }

            this._worldController.update();
            this._gameView.update( this._currentTime );
            ChuClone.gui.HUDController.setTimeInSeconds( this._elapsedTime );
        },

        updateTime: function() {
            if( this._beatLevel )
                return;
            
            this._currentTime = Date.now();
            this._elapsedTime += this._currentTime - this._previousTime;
            this._previousTime = this._currentTime;
        },

         /**
		 * Called when a goal is hit
		 * @param {ChuClone.components.GoalPadComponent} aGoalComponent
		 */
		onGoalReached: function( aGoalComponent ) {
			console.log("ChuClone.states.PlayLevelState:", aGoalComponent);

		},

        /**
         * @inheritDoc
         */
        exit: function() {

            console.log("Exiting PlayLevelState!");
            ChuClone.states.PlayLevelState.superclass.exit.call(this);

            this.removeListener( ChuClone.components.GoalPadComponent.prototype.EVENTS.GOAL_REACHED );

            this.dealloc();
        },

        /**
         * @inheritDoc
         */
        dealloc: function() {
            this._worldController = null;
            this._gameView = null;
            this._player = null;
        }
	};

    ChuClone.extend( ChuClone.states.PlayLevelState, ChuClone.model.FSM.State );
})();