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

require 'OpenNebula'


class OCAInteraction
    
    # Creates a VDC (user, group, hosts)
    def create_vdc_in_zone(zone,vdc,adminname, adminpass)
        # Create a new client to interact with the zone
        client = OpenNebula::Client.new(zone.onename + ":plain:" + zone.onepass,
                                        zone.endpoint)
        
        # Create a group in the zone with the VDC name
        group  = OpenNebula::Group.new(OpenNebula::Group.build_xml, client)
        result = group.allocate(vdc.name)
        return result if OpenNebula.is_error?(result)
        
        # Create the VDC admin user in the Zone
        user=OpenNebula::User.new(OpenNebula::User.build_xml, client)
        result=user.allocate(adminname, adminpass)
        return result if OpenNebula.is_error?(result)
        
        # Change primary group of the admin user to the VDC group
        result = user.chgrp(group.id)
        return result if OpenNebula.is_error?(result)
        
        return true
    end
    
        # Creates a VDC (user, group, hosts)
    def check_oneadmin(oneadminname, oneadminpass, endpoint)
        # Create a new client to interact with the zone
        client = OpenNebula::Client.new(oneadminname + ":plain:" + oneadminpass,
                                        endpoint)
        
        hostpool=OpenNebula::HostPool.new(client)
        result = hostpool.info
        
        return result
    end
end
    