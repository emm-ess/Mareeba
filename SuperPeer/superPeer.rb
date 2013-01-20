#!/usr/bin/env ruby
require 'optparse'
require 'em-websocket'
require 'json'

options = {}

optparse = OptionParser.new do |opts|
  opts.banner = "Usage: superPeer.rb --host HOSTIP --port PORT"
  
  opts.on('-i', '--host HOSTIP', 'IP of host') do |host|
    options[:host] = host
  end

  opts.on('-p', '--port PORT', Integer, 'port which will be used') do |port|
    options[:port] = port
  end

  options[:debug] = false
  opts.on('-d', '--debug', 'show all messages of em-websockets') do
    options[:debug] = true
  end

  opts.on('-h', '--help', 'Display this screen') do
    puts opts
    exit
  end
end

# check mandatory parameter
# taken from http://stackoverflow.com/questions/1541294/how-do-you-specify-a-required-switch-not-argument-with-ruby-optionparser
begin
  optparse.parse!
  mandatory = [:host, :port]
  missing = mandatory.select{ |param| options[param].nil? }
  if not missing.empty?
    puts "Missing options: #{missing.join(', ')}"
    puts optparse
    exit
  end
rescue OptionParser::InvalidOption, OptionParser::MissingArgument
  puts $!.to_s
  puts optparse
  exit
end


class Peer
  attr_accessor :description, :connection
  def initialize con
    @connection = con
  end
  
  def send msg
    if not msg.is_a? String
      msg = msg.to_json
    end 
    @connection.send msg
  end
end

class SuperPeer
  
  def initialize(host, port)
    @id = SecureRandom.hex 20
    @numID = Integer(@id, 16)
    @peerDescr = {
      :ID => @id,
      :ws => "ws://"+host+":"+port.to_s
    }
    @connectedPeers = {}
    @newlyConnectedPeers = Array.new
  end
  
  def description
    @peerDescr
  end
  
  def id
    @id
  end
  
  def newConnection peer
    @newlyConnectedPeers.push peer
  end
  
  def connectionClosed peer
    key = @connectedPeers.key peer
    if key != nil
      @connectedPeers.delete key
    else
      @newlyConnectedPeers.delete peer
    end
  end
  
  def handleMessage(msg, peer)
    if msg["head"].has_key? "to" and not (msg["head"]["to"].eql? @id or msg["head"]["action"].eql? "nodeLookup")
      routeMessage msg
    elsif msg["head"].has_key? "code"
      #response
    else 
      #request
      handleRequest(msg, peer)
    end
  end
  
  def handleRequest(msg, peer)
    case msg["head"]["service"] 
    when "network"
      handleNetworkRequest(msg, peer)
    else
      puts "recieved request for unknown service: "+msg["head"]["service"]
    end
  end
  
  def handleNetworkRequest(msg, peer)
    puts "handle Network Request"
    case msg["head"]["action"]
    when "peerDescription"
      handlePeerDescription(msg, peer)
    when "nodeLookup"
      handleNodeLookup(msg, peer)
    else
      puts "recieved request for unknown action in network service: "+msg["head"]["action"]
    end
  end
  
  def handlePeerDescription(msg, peer)
    puts "peerDescription"
    @newlyConnectedPeers.delete peer
    peer.description = msg["body"]["peerDescription"]
    @connectedPeers[Integer(msg["head"]["from"], 16)] = peer
    msg["head"]["code"] = 200
    msg = JSON.generate msg
    peer.send msg
    puts "response to peerDescription send"
  end
  
  def handleNodeLookup(msg, peer)
    puts "nodeLookup"
    targetID = Integer(msg["body"]["id"], 16)
    tempResult = Array.new
    @connectedPeers.each do |peerID, tPeer|
      tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => tPeer.description})
    end
    if msg["body"].has_key? "resultList"
      msg["body"]["resultList"].each do |peerDesc|
        peerID = Integer(peerDesc["ID"], 16)
        tempResult.push({:distance => (targetID - peerID).abs, :peerDescription => peerDesc})
      end
    end
    tempResult.uniq_by! { |tPeer| tPeer[:distance] }
    tempResult.sort_by { |tPeer| tPeer[:distance] }
    tempResult = tempResult.slice(0,6)
    result = Array.new
    tempResult.each do |tPeer|
      result.push tPeer[:peerDescription]
    end
    msg["body"]["resultList"] = result
    puts "result of nodeLookup"
    puts result
    if result[0].eql? @peerDescr
      peer.send msg
    else
      routeMessage(msg, nil)
    end
  end

  def routeMessage(msg, peer)
    puts "route Message"
    targetID = Integer(msg["head"]["to"], 16)
    closestPeer = nil
    closestDistance = (targetID - @numID).abs
    @connectedPeers.each do |peerID, tPeer|
      distance = (targetID - peerID).abs
      if(distance < closestDistance)
        clostestDistance = distance
        closestPeer = tPeer
      end
    end
    if(closestPeer != nil)
      puts "forward message to peer "
      closestPeer.send msg 
    else
      puts "I'm the closest one"
      handleRequest(msg, peer)
    end
  end
end

#start server
EventMachine.run do
  @superPeer = SuperPeer.new(options[:host], options[:port])
  
  EventMachine::WebSocket.start(:host => options[:host], :port => options[:port], :debug => options[:debug]) do |ws|

    peer = Peer.new ws
    
    ws.onopen {
      msg = ({:head => {:service => "network", :action => "peerDescription", :from => @superPeer.id}, :body => {:peerDescription => @superPeer.description}}).to_json
      # msg = JSON.generate msg
      puts "new peer connected, send peerDescription "
      ws.send msg
      @superPeer.newConnection peer
      puts ""
      puts ""
    }

    ws.onmessage { |msg|
      puts "msg recieved: "+msg
      msg = JSON.parse! msg
      @superPeer.handleMessage(msg, peer)
      puts ""
      puts ""
    }

    ws.onclose {
      puts "connection closed"
      @superPeer.connectionClosed peer
      ws = nil
      peer = nil
      puts ""
      puts ""
    }
    
    ws.onerror { |error|
      puts error
    }

  end

  puts "SuperPeer started with ID: "+@superPeer.id
  puts "on Host: "+options[:host]
  puts "on Port: "+options[:port].to_s
end