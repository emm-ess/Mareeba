//used to have only one interface
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

peerWeb.supportFor.webrtc = window.RTCPeerConnection !== undefined && window.DataChannel !== undefined;

peerWeb.namespace("Connection.WebRTC");
/**
 * Wrapper für WebRTC basierte p2p-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.Connection.WebRTC = function(config){
    "use strict";
    var connection, offer;
    config = {iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]};
    
    connection = new RTCPeerConnection(config);
    
    this.send = function(msg){
        console.log(connection);
    };
};