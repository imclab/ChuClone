/**
File:
	PlayLevelState.js
Created By:
	Mario Gonzalez
Project	:
	ChuClone
Abstract:
 	Gameplaying state
 
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

        _lastTextUpdate : 0,
        
        /**
         * @type {ChuClone.GameViewController}
         */
        _gameView: null,

        /**
         * @type {ChuClone.physics.WorldController}
         */
        _worldController: null,

        /**
         * @type {ChuClone.editor.LevelManager}
         */
        _levelManager: null,

        /**
         * @type {ChuClone.GameEntity}
         */
        _player         : null,

        /**
         * @type {Array}    Array of our extra mesh items
         */
        _backgroundElements: [],

        // Internal state
        _beatLevel      : false,
        _didAnimateIn   : false,

		/**
		 * @inheritDoc
		 */
		enter: function() {
			ChuClone.states.PlayLevelState.superclass.enter.call(this);
            this.removeEditContainer();

            this._didAnimateIn = false;
            this._beatLevel = false;
            this._previousTime = Date.now();
            this.setupEvents();
		},

        animateIn: function() {
            var cam = this._gameView.getCamera();

            var goalPad = null;

            var node = this._worldController.getWorld().GetBodyList();
            this._player.getBody().SetActive( false );
            while(node) {

                var b = node;
                node = node.GetNext();

				/**
				 * @type {ChuClone.GameEntity}
				 */
				var entity = b.GetUserData();
				if (!(entity instanceof ChuClone.GameEntity) ) continue;
				if( entity.getComponentWithName(ChuClone.components.CharacterControllerComponent.prototype.displayName) ) continue;
				if( entity.getComponentWithName(ChuClone.components.GoalPadComponent.prototype.displayName) ) goalPad = entity;

				entity.getView().visible = false;

				var end = b.GetPosition();
				var start = {x: end.x + ChuClone.utils.randFloat(-100, 100), y: end.y + ChuClone.utils.randFloat(-100, 100), z: ChuClone.utils.randFloat(-10000, 10000) };
				var end = {x: b.GetPosition().x, y: b.GetPosition().y, z: 0};
				var prop = {target: b, entity: entity.getView(), x: start.x, y: start.y, z: start.z};

				b.SetPosition(new Box2D.Common.Math.b2Vec2(start.x, start.y))
				entity.getView().position.z = start.z;
				entity.getView().visible = true;
                var animationTime = 2000;
                var variation = 400;

				var tween = new TWEEN.Tween(prop)
						.to({x: end.x, y: end.y, z: end.z}, animationTime)
						.delay(Math.random() * variation )
						.onUpdate(function() {
							this.target.SetPosition(new Box2D.Common.Math.b2Vec2(this.x, this.y));
							this.entity.position.z = this.z;
						})
						.easing(TWEEN.Easing.Circular.EaseInOut)
						.start();
			}

            // Pan camera
//
//
            // Animate in complete timeout
            var respawnPoint = ChuClone.components.RespawnComponent.prototype.GET_CURRENT_RESPAWNPOINT();
//            cam.removeAllComponents();
//            cam.removeComponentWithName( ChuClone.components.camera.CameraFollowPlayerComponent.prototype.displayName );

            var end = cam.position.clone();
            cam.position = end.clone();
            cam.position.z *= 10;
            prop = {target: cam, z: cam.position.z};
            new TWEEN.Tween(prop)
                .to({z: end.z}, animationTime*2)
                .onUpdate(function() {
                    this.target.position.x = end.x;
                    this.target.position.y = end.y;
                    this.target.position.z = this.z;
                    this.target.target.position = new THREE.Vector3(0,0,0);
//  
                })
                .easing(TWEEN.Easing.Quadratic.EaseOut)
                .start();

            var that = this;
            this._animateInTimeout = setTimeout(function(){
                that.animateInComplete();
            }, variation+animationTime)
        },

        /**
         * Fired on animate in complete
         */
        animateInComplete: function() {
            this._didAnimateIn = true;
            this._player.getBody().SetActive( true );
        },

		/**
		 * Setup events related to this state
		 */
        setupEvents: function() {
            var that = this;
            this.addListener( ChuClone.editor.LevelManager.prototype.EVENTS.LEVEL_CREATED, function( aLevelManager ) { that.onLevelLoaded( aLevelManager ) } );
            this.addListener( ChuClone.editor.LevelManager.prototype.EVENTS.LEVEL_DESTROYED, function( aLevelManager ) { that.onLevelDestroyed( aLevelManager ) } );
            this.addListener( ChuClone.components.CharacterControllerComponent.prototype.EVENTS.CREATED, function( aPlayer ) { that.onPlayerCreated(aPlayer) } );
            this.addListener( ChuClone.components.CharacterControllerComponent.prototype.EVENTS.REMOVED, function( aPlayer ) { that.onPlayerDestroyed(aPlayer) } );
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


            this._gameView.update( this._currentTime );

            // Don't update canvas clock every frame
            if( this._currentTime - this._lastTextUpdate > 128 ) {
                this._lastTextUpdate = this._currentTime;
                ChuClone.gui.HUDController.setTimeInSeconds( this._elapsedTime );
            }

            this._worldController.update();
        },

		/**
		 * Updates elapsed time until level is completed
		 */
        updateTime: function() {
            if( this._beatLevel || !this._didAnimateIn )
                return;
            
            this._currentTime = Date.now();
            this._elapsedTime += this._currentTime - this._previousTime;
            this._previousTime = this._currentTime;
        },

		/**
		 * Restarts the clock
		 */
		resetTime: function() {
			this._elapsedTime = 0;
			this._lastTextUpdate = 0;
			this._previousTime = Date.now();
		},

        /**
		 * Sets up the camera
		 */
		setupCamera: function() {
			// Attach a few gameplay related components to the camera
			var gameCamera = this._gameView.getCamera();

			// Follow the player
			var followPlayerComponent = new ChuClone.components.camera.CameraFollowPlayerComponent();
			if( this._player ) followPlayerComponent.setPlayer( this._player );
			gameCamera.addComponentAndExecute( followPlayerComponent );

			// Allow rotation about target
			var focusComponent = new ChuClone.components.camera.CameraFocusRadiusComponent();
			gameCamera.addComponentAndExecute(focusComponent);
			focusComponent.getRadius().x = 1000;
			focusComponent.getRadius().y = 1000;
			focusComponent.getRadius().z = 2000;
		},

         /**
		 * Called when a goal is hit
		 * @param {ChuClone.components.GoalPadComponent} aGoalComponent
		 */
		onGoalReached: function( aGoalComponent ) {
			 ChuClone.gui.HUDController.setTimeInSeconds( this._elapsedTime );
			 this._beatLevel = true;
             this._player.addComponentAndExecute( new ChuClone.components.effect.BirdEmitterComponent() );



//             /**
//              * @type {ChuClone.states.EndLevelState}
//              */
//             var endLevelState = new ChuClone.states.EndLevelState();
//             endLevelState._gameView = this._gameView;
//             endLevelState._worldController = this._worldController;
//             ChuClone.model.FSM.StateMachine.getInstance().changeState(endLevelState);
		},

        onPlayerCreated: function( aPlayer ) {
            this._player = aPlayer;

            // Add component to check the players boundary
            this._player.addComponentAndExecute( new ChuClone.components.BoundsYCheckComponent() );


            // Set the player target for the follow player component
            this._gameView.getCamera()
                    .getComponentWithName( ChuClone.components.camera.CameraFollowPlayerComponent.prototype.displayName )
                    .setPlayer( this._player );


            // Respawn at nearest respawnpoint
            var respawnPoint = ChuClone.components.RespawnComponent.prototype.GET_CURRENT_RESPAWNPOINT();
            respawnPoint.setSpawnedEntityPosition( this._player );

            this.animateIn();

            console.log(aPlayer);
        },

        onPlayerDestroyed: function( aPlayer ) {
            if( aPlayer === this._player ) {
                this._player = null;
            }
        },

        /**
		 * Called when a goal is hit
		 * @param {ChuClone.editor.LevelManager} aLevelManager
		 */
		onLevelLoaded: function( aLevelManager ) {
            this._isLevelLoaded = true;
			this.resetTime();
            this.setupCamera();
            this._worldController.createBox2dWorld();
		},

        /**
         * Level was destroyed - probably about to exit.
         * Remove components?
         */
        onLevelDestroyed: function() {
            console.log("PlayLevelState: onLevelDestroyed");
            
            if( this._isLevelLoaded ) {
                /**
                * @type {ChuClone.states.PlayLevelState}
                */
                var playLevelState = new ChuClone.states.PlayLevelState();
                playLevelState._gameView = this._gameView;
                playLevelState._worldController = this._worldController;
                ChuClone.model.FSM.StateMachine.getInstance().changeState(playLevelState);
            }

        },

		/**
		 * Removes the editcontainer node if it's around
		 */
		removeEditContainer: function(){
			if(!document.getElementById("editorContainer")) return;
				document.getElementById("editorContainer").parentNode.removeChild(document.getElementById("editorContainer")); // Remove the editcontainer
		},

        /**
         * @inheritDoc
         */
        exit: function() {
            ChuClone.states.PlayLevelState.superclass.exit.call(this);
            console.log("EXIT")
            clearTimeout( this._animateInTimeout );

            this._gameView.getCamera().removeComponentWithName( ChuClone.components.camera.CameraFollowPlayerComponent.prototype.displayName );
			this._gameView.getCamera().removeComponentWithName( ChuClone.components.camera.CameraFocusRadiusComponent.prototype.displayName );
            this.removeAllListeners();
        },

        /**
         * @inheritDoc
         */
        dealloc: function() {
            this._worldController = null;
            this._gameView = null;
            this._player = null;
        },


		/**
		 * Sets the current _playerEntity
		 * @param {ChuClone.GameEntity} aPlayer
		 */
		setPlayer: function( aPlayer ) {
			var respawnPoint = ChuClone.components.RespawnComponent.prototype.GET_CURRENT_RESPAWNPOINT();
			respawnPoint.setSpawnedEntityPosition( aPlayer );
			this._player = aPlayer;
		}
	};

    ChuClone.extend( ChuClone.states.PlayLevelState, ChuClone.model.FSM.State );
})();