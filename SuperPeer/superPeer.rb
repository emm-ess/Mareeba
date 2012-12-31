require 'em-websocket'
require 'json'

EventMachine.run {
  @id = SecureRandom.hex 20
  @connectedPeers = {}
  @newlyConnectedPeers = Array.new

  EventMachine::WebSocket.start(:host => "192.168.15.205", :port => 8080, :debug => false) do |ws|

    ws.onopen {
      msg = {"head" => {"service" => "network", "action" => "peerIdentity", "from" => @id}, "body" => {}}
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
        if msg["head"]["action"] == "peerIdentity"
          @newlyConnectedPeers.delete ws
          @connectedPeers[msg["head"]["from"]] = ws
          msg["head"]["code"] = 200
          msg = JSON.generate msg
          ws.send msg
          puts "response to peerIdentity send"
          msg = {"head" => {"service" => "network", "action" => "nodeLookup", "from" => @id}, "body" => {}}
      msg = JSON.generate msg
      puts "new peer connected, send identity-msg: "+msg
      ws.send(msg)
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