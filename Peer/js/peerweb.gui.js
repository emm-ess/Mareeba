/**
 * @author Marten Schälicke
 */

peerWeb.namespace("GUI");
peerWeb.GUI= function(config){
    "use strict";
    
    this.peerReady = function(){
        peerWeb.setLogDisplay(null);
        $('#overlay').fadeOut('slow');
    };
    
    //init-code
    (function(){
        $('#inner-overlay').html("<h2>initializiere peerWeb</h2><div id=\"startlogarea\"></div>");
        peerWeb.setLogDisplay(function(msg){
            $('#startlogarea').append("<p>"+msg+"</p>");
        });
        $('a').click(function(e){
            e.preventDefault();
        });
    })();
};