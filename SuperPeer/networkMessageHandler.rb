require 'logger'
require_relative 'connectionManager'
require_relative 'connection'
require_relative 'messageHandler'

class NetworkMessageHandler
  def initialize(msgHndl, peerID, logger)
    @msgHndl = msgHndl
    @msgHndl.setServiceHandler(self, "network")
    @peerID = peerID
    @logger = logger
  end
  
  def handleMessage(msg, con)
    case msg["head"]["action"]
    when "nodeLookup"
      nodeLookup(msg, con)
    when "peerDescription"
      peerDescription(msg, con)
    when "pcDescription"
      @msgHndl.forward(msg)
    when "iceProcess"
      @msgHndl.forward(msg)
    else
      @logger.info "recieved Message for unknown action of network service: "+msg["head"]["action"]
    end
  end
  
  def nodeLookupRequest(msg, con)
    @logger.info "recieved nodeLookup Request Message for: "+msg["body"]["id"]
    nearestPeers = @conMng.getNearestPeers(msg["body"]["id"], msg["body"]["resultList"], 6)
    
    msg["body"]["resultList"] = nearestPeers;
    if(nearestPeers[0].eql? @peerID)
        @msgHndl.answer(msg, con)
    else
        @msgHndl.forward(msg)
    end
  end
  
  def nodeLookupResponse(msg, con)
    @msgHndl.forward(msg)
  end
  
  def nodeLookup(msg, con)
    if(msg["head"].has_key? "code")
      nodeLookupResponse(msg, con)
    else
      nodeLookupRequest(msg, con)
    end
  end
  
  def peerDescriptionRequest(msg, con)
    @logger.info "recieved peerDescription (as Request) Message";
    peerDesc = msg["body"]["peerDescription"]
    @conMng.peerDescriptionRecieved(peerDesc, con)
    @msgHndl.answer(msg, con, 200)
  end
  
  def peerDescriptionResponse(msg, con)
    
  end
  
  def peerDescription(msg, con)
    if(msg["head"].has_key? "code")
=begin
  simply ignore
=end
    else
      peerDescriptionRequest(msg, con)
    end
  end
  
  def setConnectionManager(conMng)
    @conMng = conMng
  end
end