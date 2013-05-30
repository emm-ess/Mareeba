(function(peerWeb){
    "use strict";
    peerWeb.namespace("Document");
    /**
     * In peerWeb genutzte Dokumente
     * @author Marten Schälicke
     * @constructor
     * @param {Object} data schon vorhandene Daten des Dokuments
     * @throws {InvalidArgument} if data or data.title or data.content is undefined
     */
    peerWeb.Document = function(data){
        var that = this,
        title, content, titleID, versionID;
        
        /**
         * Initierungscode
         */
        (function(){
            if(data === undefined){
                throw {
                    name: "InvalidArgument",
                    message: "the needed Argument was wrong"
                };
            }
            if(typeof data === String){
                data = JSON.parse(data);
            }
            title = data.title;
            content = data.content;
            if(data.titleID !== undefined){
                titleID = data.titleID;
            }
            else {
                titleID = CryptoJS.SHA1(title).toString(CryptoJS.enc.Hex);
            }
            if(data.versionID !== undefined){
                versionID = data.versionID;
            }
            else {
                versionID = CryptoJS.SHA1(content).toString(CryptoJS.enc.Hex);
            }
        })();
        
        /**
         * Getter der TitleID
         * @return {Strin} titleID die TitelID als String
         */
        this.getTitleID = function(){
            return titleID;
        };
        
        /**
         * gibt die grundlegenden Daten des Dokuments zurück
         * @return {Object} data Data-Objekt des Dokuments
         */
        this.getDataObject = function(){
            var data = {
                "title": title,
                "titleID": titleID,
                "content": content,
                "versionID": versionID
            };
            return data;
        };
        
        /**
         * Erzeugt ein HTML-Snippet aus dem Dokument und gibt dieses zurück
         * @return {String} DOMString Dokument mit HTML-Tags
         */
        this.toHTML = function(){
            var html = "<h2>"+title+"</h2>"+
                       "<div>"+content+"</div>";
            return html;
        };
        
        /**
         * Erzeugt aus dem Dokument einen JSON-String und gibt diesen zurück.
         * @return {String} documentString das Dokument mit allen IDs als JSON-String
         */
        this.toJSON = function(){
            var data = that.getDataObject();
            return JSON.stringify(data);
        };
    };
})(peerWeb);
