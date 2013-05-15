peerWeb.namespace("Connection");
/**
 * Verwaltet Verbindungen und behandelt Anfragen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} conManager Referenz auf den ConnectionManager um Nachrichten weitergeben zu können
 * @param {Object} config Konfigurationsobjekt, welches u.A. den Verbindungspartner enthält
 */
peerWeb.Connection = function(){
    "use strict";
    return this;
};

peerWeb.Connection.prototype = (function(){
    "use strict";
    var conManager,    
    
    send = function(msg){
        var couldSend = false;
        if(typeof msg !== String){
            msg = JSON.stringify(msg);
        }
        couldSend = this._send(msg);
        peerWeb.log("Message send: "+msg, "debug");
        return couldSend;
    },
    
    init = function(__peerDesc, __config){
        var that = this,
        msgHndl;
        if(__config === null || __config === undefined){
            throw {
                name: "Error",
                message: "no config Element"
            };
        }
        conManager = __config.connectionManager;
        msgHndl = __config.messageHandler;
        __config.onerror = function(err){peerWeb.log(err, "error");};
        
        __config.onclose = function(e){
            peerWeb.log(e, "log");
            conManager.connectionClosed();
        };
        
        __config.onmessage = function(msg){
            peerWeb.log("Message recieved: "+msg.data, "debug");
            msg = JSON.parse(msg.data);
            msgHndl.handleMessage(msg, that);
        };
        
        __config.onopen = function(e){
            peerWeb.log("Connection open", "log");
            var descriptionMsg = {
                head: {
                    "service": "network",
                    "action": "peerDescription"
                },
                body: {
                    "peerDescription": conManager.peerDescription
                }
            };
            msgHndl.send(descriptionMsg, null, that);
        };
            
        this._config = __config;
        this._peerDesc = __peerDesc;
    },
    
    /**
     * setzt die Beschreibung des Verbindungspartners.
     * Aus Performanzgründen kann auch die nummerische Version der ID angegeben werden, bei Nichtangabe wird diese sonst generiert.
     * @param {Object} desc peerDescription des Verbindungspartners
     * @param {BigInteger} numID nummerische Variante der ID des Verbindungspartners (optional)
     */
    setDescription = function(__peerDesc, __NumID){
        this._peerDesc = __peerDesc;
        if(__NumID === "undefined"){
            this._numID = BigInteger.parse(__peerDesc.id, 16);
        }
        else{
            this._numID = __NumID;
        }
    },
    
    /**
     * gibt die peerDescription des Verbindungspartners zurück
     * @return {Object} description peerDescription des Verbindungspartners
     */
    getDescription = function(){
        return this._peerDesc;
    },
    
    /**
     * gibt die nummerische Version der ID des Verbindungspartners zurück
     * @return {BigInteger} numID nummerische Variante der ID des Verbindungspartners
     */
    getNumID = function(){
        return this._numID;
    };
    
    return {
        init: init,
        send: send,
        setDescription: setDescription,
        getDescription: getDescription,
        getNumID: getNumID
    };
})();
