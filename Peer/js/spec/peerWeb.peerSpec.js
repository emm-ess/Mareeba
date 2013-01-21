describe("Peer", function(){
    var peer;
    
    beforeEach(function(){
        peer = new peerWeb.Peer();
    });
    
    it("should be the same Instance everytime", function(){
        expect(peer).toEqual(new peerWeb.Peer());
    });
    
    /*it("should have an ID and also the numerical representation of it", function(){
        expect(peer.ID).toBeDefined();
        expect(peer.numID).toEqual(jasmine.any(BigInteger));
        expect(BigInteger.parse(peer.ID, 16)).toEqual(peer.numID);
        
    });*/ //-> der Test benötigt Zeit... da mehrere Abfragen an einen entfernten Server nötig sind.
    
    describe("should have some public functions", function(){
        it("has to have", function(){
            expect(peer.storeInNetwork).toBeDefined();
            expect(peer.searchInNetwork).toBeDefined();
        });
    });
});
