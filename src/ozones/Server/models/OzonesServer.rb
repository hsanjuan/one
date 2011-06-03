# -------------------------------------------------------------------------- #
# Copyright 2002-2011, OpenNebula Project Leads (OpenNebula.org)             #
#                                                                            #
# Licensed under the Apache License, Version 2.0 (the "License"); you may    #
# not use this file except in compliance with the License. You may obtain    #
# a copy of the License at                                                   #
#                                                                            #
# http://www.apache.org/licenses/LICENSE-2.0                                 #
#                                                                            #
# Unless required by applicable law or agreed to in writing, software        #
# distributed under the License is distributed on an "AS IS" BASIS,          #
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   #
# See the License for the specific language governing permissions and        #
# limitations under the License.                                             #
#--------------------------------------------------------------------------- #

class OzonesServer
    
    # @client = Client.new("dummy:dummy")
    #    @client.one_auth = "#{username}:#{password}"

    ############################################################################
    #
    ############################################################################
    def self.authorize_in_zone(user="", sha1_pass="", endpoint="")
        if user.empty? || sha1_pass.empty?
            return [401, false]
        end
        
        user_pool = UserPool.new(Client.new)
        rc = user_pool.info
        if OpenNebula.is_error?(rc)
            return [500, false]
        end

        user_pass = user_pool["USER[NAME=\"#{user}\"]/PASSWORD"]
        if user_pass == sha1_pass
            return [204, user_pool["USER[NAME=\"#{user}\"]/ID"]]
        else
            return [401, nil]
        end
    end


    ############################################################################
    # Retrieve resources
    ############################################################################
    def get_pool(kind)
        pool = case kind
            when "vdc"      then OZones::Vdc
            when "zone"     then OZones::Zones
            else
                error = OZones::Error.new("Error: #{kind} resource not supported")
                return [404, error.to_json]
        end
        
        return [200, pool.to_json]
    end
    
    def get_resource(kind, id)
        resource = retrieve_resource(kind, id)
        if OZones.is_error?(resource)
            return [404, resource.to_json]
        else
            return [200, resource.to_json]
        end
    end  

    def retrieve_resource(kind, id)
        resource = case kind
            when "vdc"  then OZones::Vdc.get(id)
            when "zone" then OZones::Zones.get(id)
            else
                return OZones::Error.new("Error: #{kind} resource not supported")
        end
        
        if resource
            return resource
        else 
            return OZones::Error.new("Error: Resource #{kind} with id #{id} not found")
        end
    end


    ############################################################################
    # Create resources
    ############################################################################
    def create_resource(kind, data, pr)
        resource = case kind
            when "vdc"  then 
                vdc_data=Hash.new
                data.each{|key,value|vdc_data[key.downcase.to_sym]=value if key!="pool"}
                zone=OZones::Zones.get(vdc_data[:zoneid])
                if !zone
                    error = OZones::Error.new("Error: Zone #{vdc_data[:zoneid]} not found, cannot create Vdc.")
                    return [404, error.to_json]
                end
                vdc_data.delete(:zoneid) 
                vdc = OZones::Vdc.create(vdc_data)

                zone.vdcs << vdc
                zone.save
                    
                if zone.saved? and vdc.saved?
                    pr.update # Rewrite proxy conf file
                    return [200, OZones.str_to_json("Resource #{kind.upcase} successfuly created with ID #{vdc.id}")]
                else
                    return [400, OZones::Error.new("Error: Couldn't create resource #{kind}").to_json]
                end
            when "zone" then 
                zone_data=Hash.new
                data.each{|key,value|zone_data[key.downcase.to_sym]=value if key!="pool"}
                zone = OZones::Zones.create(zone_data)
                rc = zone.save
                if rc
                    pr.update # Rewrite proxy conf file
                    return [200, OZones.str_to_json("Resource #{kind.upcase} successfuly created with ID #{vdc.id}")]
                else
                    return [400, OZones::Error.new("Error: Couldn't create resource #{kind.upcase}").to_json]
                end               
            else
                error = OZones::Error.new("Error: #{kind.upcase} resource not supported")
                return [404, error.to_json]
            end
    end

    ############################################################################
    # Delete resources
    ############################################################################
    def delete_resource(kind, id, pr)
        resource = retrieve_resource(kind, id)
        if OZones.is_error?(resource)
            return [404, resource.to_json]
        end

        if !resource.destroy
            return [500, OZones::Error.new("Error: Couldn't delete resource #{kind} with id #{id}").to_json]
        else
            pr.update # Rewrite proxy conf file
            return [200, OZones.str_to_json("Resource #{kind} with id #{id} successfuly deleted")]
        end
    end

    ############################################################################
    #
    ############################################################################
    def perform_action(kind, id, action_json)
        resource = retrieve_resource(kind, id)
        if OpenNebula.is_error?(resource)
            return [404, resource.to_json]
        end

        rc = resource.perform_action(action_json)
        if OpenNebula.is_error?(rc)
            return [500, rc.to_json]
        else
            return [204, resource.to_json]
        end
    end

end
