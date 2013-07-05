(function(Mareeba, CryptoJS){
    "use strict";
    Mareeba.namespace("Document");
    /**
     * Documents.
     * @author Marten Schälicke
     * @class
     * @param {(object|string)} data title and content of document
     * @throws {InvalidArgument} if data or data.title or data.content is undefined
     */
    Mareeba.Document = function(data){
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

        /**
         * Getter for titleID
         * @returns {string} titleID titleID as string
         */
        this.getTitleID = function(){
            return titleID;
        };

        /**
         * returns document as JS-object
         * @returns {object} data document as JS-object
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
         * returns document as JSON-string
         * @returns {JSON} document as JSON-string
         */
        this.toJSON = function(){
            var data = that.getDataObject();
            return JSON.stringify(data);
        };
    };
}(Mareeba, CryptoJS));
