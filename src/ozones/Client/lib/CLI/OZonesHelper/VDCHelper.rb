require 'CLI/OZonesHelper'
require 'cli/one_helper'

class VDCHelper < OZonesHelper::OZHelper
    def initialize(kind)
        @vdc_str = kind
        super()
    end

    def create_resource(template)
      super(@vdc_str,template)
    end

    def list_pool(options)
        super(@vdc_str,options)
    end

    def show_resource(id, options)
        super(@vdc_str,id, options)
    end
    
    def delete_resource(id, options)
        rc = @ocaInt.create_vdc_in_zone(zone,
                        vdc,
                        vdcadminname,
                        vdcadminpass)
        super(@vdc_str,id, options)
    end
    
    private

    def format_resource(vdc, options)
        str_h1="%-60s"
        str="%-10s: %-20s"
        
        CLIHelper.print_header(str_h1 % ["VDC #{vdc['name']} INFORMATION"])
    
        puts str % ["ID ",       vdc['id'].to_s]
        puts str % ["NAME ",     vdc['name'].to_s]
        puts str % ["ZONEID ",   vdc['zones_id'].to_s]
        puts str % ["VDCADMIN ", vdc['vdcadminname'].to_s]        
        puts
        
        return 0
    end

    def format_pool(pool, options)    
        st=CLIHelper::ShowTable.new(nil) do
            column :ID, "Identifier for VDC", :size=>4 do |d,e|
                d["id"]
            end

            column :NAME, "Name of the VDC", :right, :size=>15 do |d,e|
                d["name"]
            end

            column :ZONEID, "Id of the Zone where it belongs", 
                             :right, :size=>40 do |d,e|
                d["zones_id"]
            end
        
            default :ID, :NAME, :ZONEID
        end      
        st.show(pool[@vdc_str.upcase], options)
        
        return 0
    end
end