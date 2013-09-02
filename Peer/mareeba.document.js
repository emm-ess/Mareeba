(function(Mareeba, CryptoJS){
    "use strict";
    /** @namespace Mareeba.Document */
    Mareeba.namespace("Document");
    /**
     * Documents.
     * @class Mareeba.Document
     * @param {(Object|String)} data title and content of document
     * @throws {InvalidArgument} if data or data.title or data.content is undefined
     */
    Mareeba.Document = function(data){
        var that = this,
        /** @type {String}
         * @memberOf Mareeba.Document~ */ 
        title,
        
        /** @type {String}
         * @memberOf Mareeba.Document~ */ 
        content,
        
        /** @type {Mareeba.ID}
         * @memberOf Mareeba.Document~ */ 
        titleID,
        
        /** @type {Mareeba.ID}
         * @memberOf Mareeba.Document~ */ 
        versionID,
        
        /**
         * Getter for titleID
         * @returns {Mareeba.ID} titleID titleID as string
         * @memberOf Mareeba.Document#
         */
        getTitleID = function(){
            return titleID;
        },

        /**
         * returns document as JS-object
         * @returns {Object} data document as JS-object
         * @memberOf Mareeba.Document#
         */
        getDataObject = function(){
            var data = {
                "title": title,
                "titleID": titleID,
                "content": content,
                "versionID": versionID
            };
            return data;
        },

        /**
         * returns document as JSON-string
         * @returns {String} document as JSON-string
         * @memberOf Mareeba.Document#
         */
        toJSON = function(){
            var data = that.getDataObject();
            return JSON.stringify(data);
        };
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
            title = data.title.replace(/(<([^>]+)>)/ig,"");
            content = data.content.replace(/(<([^>]+)>)/ig,"");
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
        }());

        return {
            getTitleID : getTitleID,
            getDataObject : getDataObject,
            toJSON : toJSON
        };
    };
}(Mareeba, CryptoJS));
