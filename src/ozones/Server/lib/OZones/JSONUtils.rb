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

module OZones
    require 'json'

    module JSONUtils
        def to_json
            begin
                JSON.pretty_generate self.to_hash
            rescue Exception => e
                OZones::Error.new(e.message)
            end
        end

        def parse_json(json_str, root_element)
            begin
                hash = JSON.parse(json_str)
            rescue Exception => e
                return OZones::Error.new(e.message)
            end

            if hash.has_key?(root_element)
                return hash[root_element]
            else
                return OZones::Error.new("Error parsing JSON: Wrong resource type")
            end
        end
     end
end
