/**
 * The Mareeba Library.
 * Offers some basic functions.
 * @author Marten Schälicke
 * @param {window} window global object
 * @param {jQuery} jQuery
 * @param {BigInteger} BigInteger 
 */
(function(window, console, BigInteger){
    "use strict";
    var Mareeba = window.Mareeba || {},
    logDisplay;
    
    /**
     * compatibility functions defined here 
     */
    (function(){
    	if(!Array.isArray) {
    		Array.isArray = function (vArg) {
    			return Object.prototype.toString.call(vArg) === "[object Array]";
    		};
    	}
    }());

    /**
     * namespace function taken from Stoyan Stefanov: "JavaScript Patterns", O'Reilly, 2010, deutschsprachige Ausgabe, Seite 91
     * bietet die Möglichkeit Module/Klassen an das Objekt Mareeba zu hängen und so eine Paketstruktur aufzubauen
     * @param {String} ns_string namespace
     */
    Mareeba.namespace = function(ns_string){
        var parts = ns_string.split('.'),
            parent = Mareeba,
            i;

        if(parts[0] === "Mareeba"){
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
     * simple AJAX get.
     * @param {object} param parameters.
     */
    Mareeba.ajaxGet = function(param){
    	var xmlhttp;
    	if(window.XMLHttpRequest){// code for IE7+, Firefox, Chrome, Opera, Safari
    		xmlhttp=new XMLHttpRequest();
    	}
    	else{// code for IE6, IE5
    		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    	}
    	xmlhttp.open("GET", param.url,true);
    	xmlhttp.onreadystatechange=function(){
    		if (xmlhttp.readyState==4){
    			if(xmlhttp.status==200){
    				param.success(xmlhttp.responseText);
    			}
    			else {
    				param.error(xmlhttp.responseText);
    			}
    		}
    	};
    	xmlhttp.send();
    };

    /**
     * Logging function
     * central point for logging.
     * Provides different severity-levels (info, warn, error, log) and can be disabled completly.
     * Logs to console and/or to a provided function.
     * @param {Object} msg
     * @param {Object} level
     */
    Mareeba.log = function(msg, level){
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
     * Sets the function if not only logging to the console should be used.
     * @param {Function} display function which writes logging messages into the DOM.
     */
    Mareeba.setLogDisplay = function(display){
        logDisplay = display;
    };

    /**
     * Creates a random Hex-String of given length. 
     * @param {int} length in digits (not Bytes)
     * @return {String} number a random number
     */
    Mareeba.getRandomHexNumber = function(length){
        var hex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'],
        number = "", i;
        for (i = 0; i < length; i+=1){
            number += hex[Math.round(Math.random()*15)];
        }
        return number;
    };

    /**
     * removes any given object out of an array.
     * @param {Object} needle object to be removed
     * @param {Array} stack array where object have to be removed from
     * @return {Array} stack changed array
     * @throws {FalseArgument} if stack is not an array
     */
    Mareeba.removeFromArray = function(needle, stack){
        if(stack.isArray(stack)){
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
	 * inits Mareeba (NOT USED at the moment!)
	 * @deprecated
	 */
    Mareeba.init = function(config){
        new Mareeba.Peer();
    };

    /**
     * biggest possible ID (and distance) in Mareeba (2^160)
     * @constant
     */
    Mareeba.BIGGESTID = BigInteger.parse("ffffffffffffffffffffffffffffffffffffffff", 16);

    window.Mareeba = Mareeba;
}(window, window.console, BigInteger));