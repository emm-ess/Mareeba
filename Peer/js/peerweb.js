/**
 * Die peerWeb Bibliothek.
 * Diese hängt die Variable peerWeb an das globale Objekt und stellt einige Grundfunktionen zur Verfügung.
 * @param {Object} window das globale Objekt
 */
(function(window){
    "use strict";
    var peerWeb = window.peerWeb || {},
    logDisplay;
    
    //define functions of peerWeb
    //
    /**
     * namespace function taken from Stoyan Stefanov: "JavaScript Patterns", O'Reilly, 2010, deutschsprachige Ausgabe, Seite 91
     * bietet die Möglichkeit Module/Klassen an das Objekt peerWeb zu hängen und so eine Paketstruktur aufzubauen
     * @param {String} ns_string namespace
     */
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
    
    /**
     * in dieses Objekt definieren die Module ihre Abhängigkeiten
     */
    peerWeb.supportFor = {};
    
    /**
     * Logging Funktion
     * Ist das logging aktiviert werden Nachrichten in die Konsole und in den angegebenen Bereich im DOM geschrieben.
     * @param {Object} msg
     * @param {Object} level
     */
    peerWeb.log = function(msg, level){
        switch(level){
            case "info": console.info(msg);
                break;
            case "warn": console.warn(msg);
                break;
            case "error": console.warn(msg);
                break;
            case "log":
            default:
                console.log(msg);
                break;
        }
        if(typeof logDisplay === "function"){
            logDisplay(msg);
        }
    };
    
    /**
     * Gibt die Möglichkeit die Ausgabe der Log-Nachrichten im DOM zu steuern
     * @param {Function} display Funktion die Log-Nachrichten weiterverarbeitet
     */
    peerWeb.setLogDisplay = function(display){
        logDisplay = display;
    };
    
    /**
     * Erzeugt einen zufälligen Hex-String der gewünschten Länge.
     * die Länge wird in Zeichen angegeben. So entsprechen 2 Zeichen einem Byte.
     * @param {int} length gewünschte Länge der Zahl
     * @return {String} number die erzeugte Zahl als String
     */
    peerWeb.getRandomHexNumber = function(length){
        var hex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'],
        number = "", i;
        for (i = 0; i < length; i+=1){
            number += hex[Math.round(Math.random()*15)];
        }
        return number;
    };
    
    /**
     * Entfernt eine Nadel aus einem Heuhaufen.
     * @param {Object} needle das zu entfernende Objekt
     * @param {Array} stack Array aus dem entfernt werden soll
     * @return {Array} stack das geänderte Array
     * @throws {FalseArgument} if stack is not an array
     */
    peerWeb.removeFromArray = function(needle, stack){
        if(!$.isArray(stack)){
            throw{
                name: "FalseArgument",
                message: "stack isn't an Array"
            };
        }
        var idx = stack.indexOf(needle); // Find the index
        if(idx !== -1){
           stack.splice(idx, 1); 
        }
        return stack;
    };
    
    /**
     * beschreibt die größte mögliche ID und somit auch Entfernung in peerWeb (2^160)
     * @constant
     */
    peerWeb.BIGGESTID = BigInteger.parse("ffffffffffffffffffffffffffffffffffffffff", 16);
    
    window.peerWeb = peerWeb;
})( window );

/**
 * wartet, bis alles geladen ist und ruft anschließend den Eingangspunkt auf.
 */
$(document).ready(function(){
    "use strict";
    new peerWeb.Peer();
});