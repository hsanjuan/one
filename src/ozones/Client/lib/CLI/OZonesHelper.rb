require 'CLI/CLIHelper'
require 'OZonesClient'

module OZonesHelper
    
    class OZHelper
        def initialize
            @client = OZonesClient::Client.new
        end

        def create_resource(kind, template)
            rc = @client.post_resource(kind, template)
                        
            if OZonesClient::is_error?(rc) 
               [-1, rc.message] 
            else
               message=OZonesClient::parse_json(rc.body, "message")
               [0, "#{message}"]
            end
        end
        
        def list_pool(kind, options)
            rc = @client.get_pool(kind)
            
            if OZonesClient::is_error?(rc) 
               [-1, rc.message] 
            else
               pool=OZonesClient::parse_json(rc.body, kind + "pool")
               format_pool(pool, options)
            end
        end
        
        def show_resource(kind, id, options)
            rc = @client.get_resource(kind, id)
    
            if OZonesClient::is_error?(rc) 
               [-1, rc.message] 
            else
               resource=OZonesClient::parse_json(rc.body, kind)
               format_resource(resource, options)
            end
        end
        
        def delete_resource(kind, id, options)
            rc = @client.delete_resource(kind, id)
            
            if OZonesClient::is_error?(rc) 
               [-1, rc.message] 
            else
               message=OZonesClient::parse_json(rc.body, "message")
               [0, "#{message}"]
            end
        end
             
    end
end