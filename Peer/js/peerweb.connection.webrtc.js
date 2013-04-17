//used to have only one interface
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

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
    var connection, dataChannel, iceCallback;
    
    peerWeb.Connection.WebRTC.parent.init.call(this, __peerDesc, __config);
    connection = new RTCPeerConnection({iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]}, {optional: [{RtpDataChannels: true}]});
    dataChannel = connection.createDataChannel("peerWeb", {reliable: false});
    connection.onicecandidate = iceCallback;
    dataChannel.onerror = this._config.onerror;
    dataChannel.onclose = this._config.onclose;
    dataChannel.onmessage = this._config.onmessage;
    dataChannel.onopen = this._config.onopen;
    
    iceCallback = function(e){
        if(e.candidate){
            
        }
    };
    
    this.send = function(msg){
        dataChannel.send(msg);
    };
    
    this.getReadyState = function(){
        return dataChannel.readyState;
    };
};
peerWeb.Connection.WebRTC.parent = peerWeb.Connection.prototype;