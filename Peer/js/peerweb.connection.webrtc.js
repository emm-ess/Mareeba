//used to have only one interface
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

if(!!window.webkitRTCPeerConnection){
    //must be chrome
    var testPC = new RTCPeerConnection({iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]},{optional: [{RtpDataChannels: true}]});
    if (testPC && testPC.createDataChannel) {
        var dc = testPC.createDataChannel("sendDataChannel", {reliable: false});
        if (!!dc) {
          peerWeb.supportFor.webrtc = true;
          dc = null;
        } 
    }
    testPC.close();
}
else{
    peerWeb.supportFor.webrtc = window.RTCPeerConnection !== undefined && window.DataChannel !== undefined;
}

peerWeb.namespace("Connection.WebRTC");
/**
 * Wrapper für WebRTC basierte p2p-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.Connection.WebRTC = function(__peerDesc, __config){
    "use strict";
    
    (function(that){
        peerWeb.Connection.WebRTC.parent.init.call(that, __peerDesc, __config);
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
    })(this);
};
peerWeb.Connection.WebRTC.parent = peerWeb.Connection.prototype;
peerWeb.Connection.WebRTC.prototype = (function(){
    "use strict";
    var
    
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
        msg = that.validateMsg(msg);
        that._config.connectionManager.sendMessage(msg);
    },
    
    initConnection = function(){
        var that = this;
        that._dataChannel = that._connection.createDataChannel("peerWeb", {reliable: false});
        that._dataChannel.onerror = that._config.onerror;
        that._dataChannel.onclose = that._config.onclose;
        that._dataChannel.onmessage = that._config.onmessage;
        that._dataChannel.onopen = that._config.onopen;
        that._connection.createOffer(function(d){gotOffer(d, that);});
    },
    
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
        msg = that.validateMsg(msg);
        that._config.connectionManager.sendMessage(msg);
    },
    
    onDataChannel = function(e, that){
        that._dataChannel = e.channel;
        that._dataChannel.onerror = that._config.onerror;
        that._dataChannel.onclose = that._config.onclose;
        that._dataChannel.onmessage = that._config.onmessage;
        that._dataChannel.onopen = that._config.onopen;
    },
    
    answer = function(){
        var that = this;
        this._connection.ondatachannel = function(e){onDataChannel(e,that);};
        this._connection.setRemoteDescription(new RTCSessionDescription(this._config.offer));
        this._connection.createAnswer(function(d){gotAnswer(d, that);});
    },
    
    gotAnswerMsg = function(answer){
        this._connection.setRemoteDescription(new RTCSessionDescription(answer));
    },
    
    iceCallback = function(e,that){
        if(e.candidate){
            var msg = {
                "head": {
                    "service": "network",
                    "action": "iceProcess",
                    "to": that._peerDesc.id
                },
                "body": e.candidate
            };
            msg = that.validateMsg(msg);
            that._config.connectionManager.sendMessage(msg);
        }
    },
    
    gotIceMsg = function(ice){
        this._connection.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:ice.label, candidate:ice.candidate}));
    },
    
    send = function(msg){
        return this._dataChannel.send(msg);
    },
    
    /**
     * liefert den aktuellen Status der Verbindung zurück.
     * die Verbindungsstati entsprechen denen von WebSockets 
     * @return {int} readyState Verbindungsstatus
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
    }
})();
