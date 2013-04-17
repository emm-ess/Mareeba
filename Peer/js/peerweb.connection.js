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
    
    /**
     * prüft eine Nachricht auf erforderliche Felder und setzt diese bei Fehlen
     * @param {Object} msg zu verschickende Nachricht
     * @param {Function} callback Funktion, die bei Antwort aufgerufen werden soll
     */
    sendMsg = function(msg, callback){
        var refCode;
        if(typeof msg === String){
            msg = JSON.parse(msg);
        }
        if(msg.head.protocolVersion === undefined){
            msg.head.protocolVersion = this.protocolVersion;
        }
        if(msg.head.from === undefined){
            msg.head.from = conManager.peerDescription.id;
        }
        if(msg.head.refCode === undefined){
            refCode = peerWeb.getRandomHexNumber(40);
            msg.head.refCode = refCode;
        }
        if(msg.head.date === undefined){
            msg.head.date = new Date().getTime();
        }
        msg = JSON.stringify(msg);
        peerWeb.log("Message send: "+msg, "log");
        this._send(msg);
        if(refCode !== undefined){
            this._config.storeMessage(refCode, msg, callback);
        }
    },
    
    /**
     * sendet die Beschreibung des lokalen Knotens an den Verbindungspartner
     */
    onopen = function(msg){
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
        this.sendMsg(descriptionMsg);
    },
    
    init = function(__peerDesc, __config){
        if(__config === null || __config === undefined){
            throw {
                name: "Error",
                message: "no config Element"
            };
        }
        conManager = __config.connectionManager;
        __config.onerror = function(err){peerWeb.log(err, "error");};
        
        __config.onclose = function(msg){
            peerWeb.log(msg, "log");
            conManager.connectionClosed();
        };
        
        __config.onmessage = function(msg){
            peerWeb.log("Message recieved: "+msg.data, "log");
            msg = JSON.parse(msg.data);
            conManager.handleMessage(msg, this);
        };
        
        __config.onopen = onopen;
            
        this._config = __config;
        this._peerDesc = __peerDesc;
    },
    
    /**
     * liefert den aktuellen Status der Verbindung zurück.
     * die Verbindungsstati entsprechen denen von WebSockets 
     * @return {int} readyState Verbindungsstatus
     */
    getReadyState = function(){
        return this._getReadyState();
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
        protocolVersion: "0.1",
        init: init,
        sendMsg: sendMsg,
        getReadyState: getReadyState,
        setDescription: setDescription,
        getDescription: getDescription,
        getNumID: getNumID
    };
})();
