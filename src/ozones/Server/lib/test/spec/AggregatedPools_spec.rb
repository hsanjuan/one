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

$: << '../'
$: << 'helpers'
$: << '../../../../sunstone/models'

require 'rubygems'
require 'data_mapper'

module OZones

    describe "Aggregated Pools" do
        before(:all) do
            # Create the DB, with sqlite
            db_url = "sqlite://" +  File.expand_path(".") + "/ozones-test.db"
            
            @fixtures_path = File.expand_path(".") + "/fixtures"

            #DataMapper::Logger.new($stdout, :debug)
            DataMapper.setup(:default, db_url)

            require 'OZones'

            DataMapper.finalize
            DataMapper.auto_upgrade!
            
            # Create Zones
            @zoneA = OZones::Zones.create(
                     :name     =>    "zoneA",
                     :onename  =>    "oneadminA",
                     :onepass  =>    "onepassA",
                     :endpoint =>    "http://zonea.zoneadomain.za:2633/RPC2"
                    )
                    
            @zoneB = OZones::Zones.create(
                     :name     =>    "zoneB",
                     :onename  =>    "oneadminB",
                     :onepass  =>    "onepassB",
                     :endpoint =>    "http://zoneb.zoneadomain.za:2634/RPC2"
                    )
               
            # Create VDCs        
            @vdca = OZones::Vdc.create(
                     :name     =>    "vdca"
                    )

            @vdcb1 = OZones::Vdc.create(
                     :name     =>    "vdcb"
                    )
            
            @vdcb2 = OZones::Vdc.create(
                     :name     =>    "vdcc"
                    )
            
            @zoneA.vdcs << @vdca
            @zoneB.vdcs << @vdcb1
            @zoneB.vdcs << @vdcb2
            
            @zoneA.save
            @zoneB.save
        end
                
        it "should be able to retrieve an aggregated host pool" do
            ahp      = AggregatedHosts.new
            ahp_json = ahp.to_json 
            
            ahp_json.should eql(File.read(
                                 @fixtures_path+"/json/aggregatedhosts.json"))
            
            
        end
        
        it "should be able to retrieve an aggregated vm pool" do
            avmp      = AggregatedVirtualMachines.new
            avmp_json = avmp.to_json
            
            avmp_json.should eql(File.read(
                                 @fixtures_path+"/json/aggregatedvms.json"))                
        end
        
        it "should be able to retrieve an aggregated image pool" do
            aip       = AggregatedImages.new
            aip_json  = aip.to_json
            
            aip_json.should eql(File.read(
                                @fixtures_path+"/json/aggregatedimages.json"))                
        end  
        
        it "should be able to retrieve an aggregated network pool" do
            avnp       = AggregatedVirtualNetworks.new
            avnp_json  = avnp.to_json
            
            avnp_json.should eql(File.read(
                                @fixtures_path+"/json/aggregatedvns.json"))                
        end  
        
        it "should be able to retrieve an aggregated user pool" do
            aup        = AggregatedUsers.new
            aup_json   = aup.to_json

            aup_json.should eql(File.read(
                                @fixtures_path+"/json/aggregatedusers.json"))                
        end       
    end
end