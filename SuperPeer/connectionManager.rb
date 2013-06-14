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
    @biggestDist = Integer("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", 16)
  end
  
  def newConnection con
    @newlyConnectedPeers.push con
    @logger.info "new Peer connected"
  end
  
  def connectionClosed con
    @logger.info "connection closed"
    key = @connectedPeers.key con
    if key != nil
      @connectedPeers.delete key
      @logger.info "Peer Connection removed from normal ones, "+@connectedPeers.size.to_s+" connections remaining"
    else
      @newlyConnectedPeers.delete con
      @logger.info "Peer Connection removed from newly connected ones"
    end
  end
  
  def peerDescriptionRecieved(peerDesc, con)
    numID = Integer(peerDesc["id"], 16)
    con.description = peerDesc
    @newlyConnectedPeers.delete con
    @connectedPeers[numID] = con
    @logger.info "PeerConnection moved from newly connected to regular ("+@newlyConnectedPeers.size.to_s+ " newly connetions; "+@connectedPeers.size.to_s+" normal ones)"
  end
  
  def getNearestPeer(targetID)
    return getNearestPeers(targetID, nil, 1)
  end
  
  def getNearestPeers(targetID, resultList, amount)
    if(not targetID.is_a? Integer)
      targetID = Integer(targetID, 16)
    end
    tempResult = Array.new
    @connectedPeers.each do |peerID, tPeer|
      tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => tPeer.description})
    end
    
    if(resultList.is_a? Array)
      resultList.each do |peerDesc|
        peerID = Integer(peerDesc["id"], 16)
        tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => peerDesc})
      end
    end
    
    tempResult = tempResult.uniq { |tPeer| tPeer[:peerDescription]["id"] }
    tempResult = tempResult.sort_by { |tPeer| tPeer[:distance] }
    
    if(amount.is_a? Integer)
      if(tempResult.size > amount)
        tempResult = tempResult.slice(0, amount)
      end
    end
    
    result = Array.new
    tempResult.each do |tPeer|
      result.push tPeer[:peerDescription]
    end
    return result
  end
  
  def getNearestConnection(targetID, currentDistance)
    if(not targetID.is_a? Integer)
      targetID = Integer(targetID, 16)
    end
    if(not currentDistance.is_a? Integer)
      closestDistance = @bigggestDist
    else
      closestDistance = currentDistance
    end
    closestCon = nil
    @connectedPeers.each do |peerID, con|
      distance = (targetID - peerID).abs
      if(distance < closestDistance)
        closestDistance = distance
        closestCon = con
        if(closestDistance == 0)
          break
        end
      end
    end
    return closestCon
  end

  def route(msg)
    @logger.info "route Message"
    targetID = Integer(msg["head"]["to"], 16)
    closestDistance = (targetID - @numID).abs
    closestCon = getNearestConnection(targetID, closestDistance)
    couldSend = false
    if(closestCon != nil)
      @logger.debug "forward message to peer: "+closestCon.description["id"]
      couldSend = closestCon.send msg 
    else
      @logger.debug "I'm the closest one"
    end
    return couldSend
  end
end