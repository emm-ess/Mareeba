require 'em-websocket'
require 'json'

EventMachine.run {
  @id = SecureRandom.hex 20
  host = "192.168.15.205"
  port = 8080
  @peerDescr = {
    :ID => @id,
    :ws => "ws://"+host+port.to_s
  }
  @connectedPeers = {}
  @newlyConnectedPeers = Array.new

  EventMachine::WebSocket.start(:host => host, :port => port, :debug => false) do |ws|

    ws.onopen {
      msg = {:head => {:service => "network", :action => "peerDescription", :from => @id}, :body => {:peerDescr => @peerDescr}}
      msg = JSON.generate msg
      puts "new peer connected, send identity-msg: "+msg
      ws.send(msg)
      @newlyConnectedPeers.push ws
      puts ""
      puts ""
    }

    ws.onmessage { |msg|
      
      puts "msg recieved: "+msg
      msg = JSON.parse! msg
      if msg["head"].has_key?("code")
        #response
      else 
        #request
        if msg[:head][:action] == "peerDescription"
          @newlyConnectedPeers.delete ws
          @connectedPeers[msg[:head][:from]] = ws
          msg[:head][:code] = 200
          msg = JSON.generate msg
          ws.send msg
          puts "response to peerDescription send"
        end
      end
      puts ""
      puts ""
    }

    ws.onclose {
      puts "connection closed"
      key = @connectedPeers.key ws
      if key != nil
        @connectedPeers.delete key
      end
      @newlyConnectedPeers.delete ws
      puts ""
      puts ""
    }
    
    ws.onerror { |error|
      puts error
    }

  end

  puts "SuperPeer started with ID: "+@id
}