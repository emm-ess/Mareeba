/**
 * @author Marten Schälicke
 */
(function(window){
    "use strict";
    var peerWeb = window.peerWeb || {},
    peer;
    
    //define functions of peerWeb
    //TODO
    //namespace function taken from JavaScript Patterns Seite 91
    peerWeb.namespace = function(ns_string){
        var parts = ns_string.split('.'),
            parent = peerWeb,
            i;
            
        if(parts[0] === "peerWeb"){
            parts = parts.slice(1);
        }
        for(i = 0; i < parts.length; i += 1){
            if(typeof parent[parts[i]] === "undefined"){
                parent[parts[i]] = {};
            }
            parent = parent[parts[i]];
        }
        return parent;
    };
    
    //define needed BrowserFeatures here
    peerWeb.supportFor = {
        "webrtc" : !(window.RTCPeerConnection === undefined) || !(window.webkitRTCPeerConnection === undefined),
        "flash" : !!swfobject && swfobject.getFlashPlayerVersion().major > 10,
        "websocket" : !(window.WebSocket === undefined)
    };
    
    peerWeb.log = function(msg, level){
        switch(level){
            case "info": console.log(msg);
                break;
            case "warn": console.warn(msg);
                break;
            case "error": console.error(msg);
                break;
            case "log":
            default:
                console.log(msg);
                break;
        }
    };
    
    peerWeb.getRandomHexNumber = function(length){
        var hex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'],
        number = "", i;
        for (i = 0; i < length; i+=1){
            number += hex[Math.round(Math.random()*15)];
        }
        return number;
    };
    
    peerWeb.removeFromArray = function(needle, stack){
        if(!$.isArray(stack)){
            throw{
                name: "False Argument",
                message: "stack isn't an Array"
            };
        }
        var idx = stack.indexOf(needle); // Find the index
        if(idx !== -1){
           stack.splice(idx, 1); 
        }
        return stack;
    };
    
    peerWeb.init = function(){
        peer = new peerWeb.Peer();
    };
    
    window.peerWeb = peerWeb;
})( window );
