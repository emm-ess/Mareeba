(function(Mareeba, window){
    "use strict";
    var supported = false,
    //used to have only one interface
    RTCPeerConnection     = window.RTCPeerConnection     = window.RTCPeerConnection     || window.webkitRTCPeerConnection     || window.mozRTCPeerConnection,
    RTCSessionDescription = window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription,
    RTCIceCandidate       = window.RTCIceCandidate       = window.RTCIceCandidate       || window.webkitRTCIceCandidate       || window.mozRTCIceCandidate;

    (function(){
        if(!!window.webkitRTCPeerConnection){
            //must be chrome
            var testPC = new window.RTCPeerConnection({iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]},{optional: [{RtpDataChannels: true}]}),
            dc;
            if (testPC && testPC.createDataChannel) {
                dc = testPC.createDataChannel("sendDataChannel", {reliable: false});
                if (!!dc) {
                  supported = true;
                  dc.close();
                }
            }
            testPC.close();
        }
        else{
            supported = window.RTCPeerConnection !== undefined && window.DataChannel !== undefined;
        }
    }());

    if(supported){
        Mareeba.namespace("Connection.WebRTC");
        /**
         * Wrapper for WebRTC based p2p Connections
         * @class Mareeba.Connection.WebRTC
         * @extends Mareeba.Connection
         * @param {Mareeba.PeerDescription} peerDescription of far peer
         * @param {Object} configurationobject
         */
        Mareeba.Connection.WebRTC = function(__peerDesc, __config){
            (function(that){
                Mareeba.Connection.WebRTC.parent.init.call(that, __peerDesc, __config);
                that._connection = new window.RTCPeerConnection({iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]}, {optional: [{RtpDataChannels: true}]});
                that._connection.onicecandidate = function(e){that._iceCallback(e,that);};
                that._connection.onerror = that._config.onerror;
                that._connection.onclose = that._config.onclose;

                if(that._config.offer === undefined){
                    that._initConnection();
                }

                else{
                   that._answer();
                }
            }(this));
        };
        
        Mareeba.Connection.WebRTC.parent = Mareeba.Connection.prototype;
        
        Mareeba.Connection.WebRTC.prototype = (function(){
            /* TODO:
             * - use proxy function (like in Mareeba.Connection.WebSocket) (move proxy function to Mareeba) instead of passing "that"
             */
            var
            
            /**
             * callback for creating the local description (as offer) in first step to create WebRTC p2p connection.
             * Sets localDescription (offer) to underlying connection and sends it also to far peer.
             * @param {RTCSessionDescription} peerConnection Description of far peer
             * @param {Mareeba.Connection.WebRTC} that instance itself
             * @memberOf Mareeba.Connection.WebRTC#
             */
            gotOffer = function(pcDesc, that){
                var msg = {
                    "head": {
                        "service": "network",
                        "action": "pcDescription",
                        "to": that._peerDesc.id
                    },
                    "body": pcDesc
                };
                that._connection.setLocalDescription(pcDesc);
                that.msgHndl.send(msg);
            },

            /**
             * inits underlying connection and sets callbacks
             * @method _initConnection
             * @private
             * @memberOf Mareeba.Connection.WebRTC#
             */
            initConnection = function(){
                var that = this;
                that._dataChannel = that._connection.createDataChannel("Mareeba", {reliable: false});
                that._dataChannel.onerror = that._config.onerror;
                that._dataChannel.onclose = that._config.onclose;
                that._dataChannel.onmessage = that._config.onmessage;
                that._dataChannel.onopen = that._config.onopen;
                that._connection.createOffer(function(d){gotOffer(d, that);});
            },

            /**
             * callback for creating the local description (as answer) to create WebRTC p2p connection.
             * Sets localDescription (answer) to underlying connection and sends it also to far peer.
             * @param {RTCSessionDescription} peerConnection Description of far peer
             * @param {Mareeba.Connection.WebRTC} that instance itself
             * @memberOf Mareeba.Connection.WebRTC#
             */
            gotAnswer = function(pcDesc, that){
                var msg = {
                    "head": {
                        "service": "network",
                        "action": "pcDescription",
                        "to": that._peerDesc.id
                    },
                    "body": pcDesc
                };
                that._connection.setLocalDescription(pcDesc);
                that.msgHndl.send(msg);
            },
            
            /**
             * callback if data channel between peers is created.
             * sets callbacks for the given data channel
             * @param {Event} event containing data channel
             * @param {Mareeba.Connection.WebRTC} that instance itself
             * @memberOf Mareeba.Connection.WebRTC#
             */
            onDataChannel = function(e, that){
                that._dataChannel = e.channel;
                that._dataChannel.onerror = that._config.onerror;
                that._dataChannel.onclose = that._config.onclose;
                that._dataChannel.onmessage = that._config.onmessage;
                that._dataChannel.onopen = that._config.onopen;
            },

            /**
             * sets the given offer as remote description and creates an answer.
             * @method _answer
             * @private
             * @memberOf Mareeba.Connection.WebRTC#
             */
            answer = function(){
                var that = this;
                this._connection.ondatachannel = function(e){onDataChannel(e,that);};
                this._connection.setRemoteDescription(new RTCSessionDescription(this._config.offer));
                this._connection.createAnswer(function(d){gotAnswer(d, that);});
            },

            /**
             * sets the received answer as remote description.
             * @param {RTCSessionDescription} answer answer of far peer
             * @memberOf Mareeba.Connection.WebRTC#
             */
            gotAnswerMsg = function(answer){
                this._connection.setRemoteDescription(new RTCSessionDescription(answer));
            },

            /**
             * callback for iceProcess.
             * handles event and build an iceProcess-Message to be send to far peer.
             * @method _iceCallback
             * @private
             * @param {Event} e
             * @param {Mareeba.Connection.WebRTC} that own instance
             * @memberOf Mareeba.Connection.WebRTC#
             */
            iceCallback = function(e, that){
                if(e.candidate){
                    var msg = {
                        "head": {
                            "service": "network",
                            "action": "iceProcess",
                            "to": that._peerDesc.id
                        },
                        "body": e.candidate
                    };
                    that.msgHndl.send(msg);
                }
            },

            /**
             * adds the given ice candidate to the underlying connection.
             * @param {RTCIceCandidate} ice of far peer
             * @memberOf Mareeba.Connection.WebRTC#
             */
            gotIceMsg = function(ice){
                this._connection.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:ice.label, candidate:ice.candidate}));
            },

            /**
             * sends the given message via dataChannel.
             * @method _send
             * @private
             * @param {String} msg message to be send
             * @returns {Boolean} could message be send
             * @memberOf Mareeba.Connection.WebRTC#
             */
            send = function(msg){
                return this._dataChannel.send(msg);
            },

            /**
             * returns the readyState of the underlying connection.
             * Readystates are the same as used for WebSockets.
             * @returns {Number} readyState
             * @memberOf Mareeba.Connection.WebRTC#
             */
            getReadyState = function(){
                var intRState;
                switch(this._dataChannel.readyState){
                    case "connecting":
                        intRState = 0;
                    break;
                    case "open":
                        intRState = 1;
                    break;
                    default:
                        intRState = 4;
                    break;
                }
                return intRState;
            },

            /**
             * closes the connection and frees ressources.
             * @memberOf Mareeba.Connection.WebRTC#
             */
            close = function(){
                this._dataChannel.onclose = function(){};
                this._connection.onclose = function(){};
                this._dataChannel.close();
                this._connection.close();
                this._dataChannel = null;
                this._connection = null;
                this._config = null;
            };

            return {
                _send: send,
                _iceCallback: iceCallback,
                _initConnection: initConnection,
                _answer: answer,
                gotAnswer: gotAnswerMsg,
                gotIceMsg: gotIceMsg,
                getReadyState: getReadyState,
                close: close
            };
        }());
    }
}(Mareeba, window));