require 'logger'
require_relative 'publicMessageHandler'
require_relative 'connection'

class ConnectionManager
  attr_writer :publicMessageHandler
  
  def initialize(peerDesc, logger)
    @logger = logger
    @peerDesc = peerDesc
    @numID = Integer(@peerDesc["id"], 16)
    @connectedPeers = {}
    @newlyConnectedPeers = Array.new
  end
  
  def newConnection peer
    @newlyConnectedPeers.push peer
    @logger.info "new Peer connected"
  end
  
  def connectionClosed peer
    @logger.info "connection closed"
    key = @connectedPeers.key peer
    if key != nil
      @connectedPeers.delete key
      @logger.info "Peer Connection removed from normal ones, "+@connectedPeers.size.to_s+" connections remaining"
    else
      @newlyConnectedPeers.delete peer
      @logger.info "Peer Connection removed from newly connected ones"
    end
  end
  
  def handleMessage(msg, peer)
    case msg["head"]["service"]
    when "network"
      handleNetworkMessage(msg, peer)
    when "public"
      @publicMessageHandler.handle(msg, peer)
    else
      @logger.info "recieved message for unknown service: "+msg["head"]["service"]
    end
  end
  
  def handleNetworkMessage(msg, peer)
    if msg["head"].has_key? "to" and not (msg["head"]["to"].eql? @id or (msg["head"]["action"].eql? "nodeLookup" and not msg["head"].has_key? "code"))
      routeMessage(msg, peer)
    elsif msg["head"].has_key? "code"
      #response
      @logger.info "response recieved"
    else 
      #request
      handleNetworkRequest(msg, peer)
    end
  end
  
  def handleNetworkRequest(msg, peer)
    @logger.info "handle Network Request"
    case msg["head"]["action"]
    when "peerDescription"
      handlePeerDescription(msg, peer)
    when "nodeLookup"
      handleNodeLookup(msg, peer)
    else
      @logger.info "recieved request for unknown action in network service: "+msg["head"]["action"]
    end
  end
  
  def handlePeerDescription(msg, peer)
    @newlyConnectedPeers.delete peer
    peer.description = msg["body"]["peerDescription"]
    @connectedPeers[Integer(msg["head"]["from"], 16)] = peer
    msg["head"]["code"] = 200
    peer.send msg
    @logger.info "PeerConnection moved from newly connected to regular ("+@newlyConnectedPeers.size.to_s+ " newly connetions; "+@connectedPeers.size.to_s+" normal ones)"
  end
  
  def handleNodeLookup(msg, peer)
    @logger.info "nodeLookup"
    targetID = Integer(msg["body"]["id"], 16)
    tempResult = Array.new
    @connectedPeers.each do |peerID, tPeer|
      tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => tPeer.description})
    end
    if msg["body"].has_key? "resultList"
      msg["body"]["resultList"].each do |peerDesc|
        peerID = Integer(peerDesc["id"], 16)
        tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => peerDesc})
      end
    end
    tempResult = tempResult.uniq { |tPeer| tPeer[:peerDescription]["id"] }
    tempResult = tempResult.sort_by { |tPeer| tPeer[:distance] }
    tempResult = tempResult.slice(0,6)
    result = Array.new
    tempResult.each do |tPeer|
      result.push tPeer[:peerDescription]
    end
    msg["body"]["resultList"] = result
    @logger.debug "result of nodeLookup: "+result.to_s
    if result[0]["id"].eql? @peerDesc["id"]
      msg["head"]["code"] = 200
      peer.send msg
    else
      routeMessage(msg, nil)
    end
  end

  def routeMessage(msg, peer)
    @logger.info "route Message"
    targetID = Integer(msg["head"]["to"], 16)
    closestPeer = nil
    closestDistance = (targetID - @numID).abs
    @connectedPeers.each do |peerID, tPeer|
      distance = (targetID - peerID).abs
      if(distance < closestDistance)
        closestDistance = distance
        closestPeer = tPeer
        @logger.info "closest Peer has : "+tPeer.description["id"]+" with distance: "+distance.to_s
        if(closestDistance == 0)
          break
        end
      end
    end
    if(closestPeer != nil)
      @logger.info "forward message to peer "
      closestPeer.send msg 
    else
      @logger.info "I'm the closest one"
      #handleRequest(msg, peer)
    end
  end
end