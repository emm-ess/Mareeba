/**
 * @author Marten Schälicke
 */ 
//used to have only one interface
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

peerWeb.namespace("Connection.WebRTC");
peerWeb.Connection.WebRTC = function(config){
    "use strict";
    var connection, offer;
    config = {iceServers: [{url:"stun:stunserver.org:3478"},{url:"stun:stun.l.google.com:19302"}]};
    
    connection = new RTCPeerConnection(config);
    
    this.send = function(msg){
        console.log(connection);
    };
};

/*
 * var config = {iceServers: [{url:"stun:stunserver.org:3478"}]};
undefined
config
Object
var pc1 = new RTCPeerConnection(config);
undefined
pc1.ondatachannel = function(evt){
SyntaxError: Unexpected end of input
pc1.ondatachannel = function(evt){var chan = evt.channel; console.log(chan);};
function (evt){var chan = evt.channel; console.log(chan);}
var pc2 = new RTCPeerConnection(config);
undefined
var offer;
undefined
pc1.createOffer(function(desc){pc1.setLocalDescription(desc);offer = desc;};
SyntaxError: Unexpected token ;
pc1.createOffer(function(desc){pc1.setLocalDescription(desc);offer = desc;});
undefined
offer
RTCSessionDescription
pc2.setRemoteDescription(offer);
undefined
pc2.createDataChannel("peerWeb");
Error: NOT_SUPPORTED_ERR: DOM Exception 9
var pc2chan = pc2.createDataChannel("peerWeb");
Error: NOT_SUPPORTED_ERR: DOM Exception 9


 */