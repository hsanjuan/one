var zones_tab_content =
'<form id="form_zones" action="javascript:alert(\'js errors?!\')">\
  <div class="action_blocks">\
  </div>\
<table id="datatable_zones" class="display">\
  <thead>\
    <tr>\
      <th class="check"><input type="checkbox" class="check_all" value="">All</input></th>\
      <th>ID</th>\
      <th>Name</th>\
      <th>End Point</th>\
    </tr>\
  </thead>\
  <tbody id="tbodyzones">\
  </tbody>\
</table>\
</form>';


var create_zone_tmpl =
'<form id="create_zone_form" action="">\
  <fieldset>\
     <div>\
        <label for="name">Name:</label>\
        <input type="text" name="name" id="ame" /><br />\
        <label for="endpoint">End point:</label>\
        <input type="text" name="endpoint" id="endpoint" /><br />\
        <label for="endpoint">ONE auth:</label>\
        <input type="text" name="oneauth" id="oneauth" /><br />\
        <label for="onepass">Password:</label>\
        <input type="password" name="onepass" id="onepass" />\
     </div>\
   </fieldset>\
   <fieldset>\
     <div class="form_buttons">\
        <button class="button" id="create_zone_submit" value="Zone.create">Create</button>\
        <button class="button" type="reset" value="reset">Reset</button>\
     </div>\
   </fieldset>\
</form>';

var zones_select="";
var dataTable_zones;

var zoneSelectedNodes = function() { return getSelectedNodes(dataTable_zones);};

var zone_actions = {

    "Zone.create" : {
        type: "create",
        call: oZones.Zone.create,
        callback: addZoneElement,
        error: onError,
        notify: true
    },

    "Zone.create_dialog" : {
        type: "custom",
        call: popUpCreateZoneDialog
    },

    "Zone.delete" : {
        type: "multiple",
        call: oZones.Zone.delete,
        callback: deleteZoneElement
        elements: zoneSelectedNodes,
        error: onError,
        notify: true
    },

    "Zone.list" : {
        type: "list",
        call: Ozones.Zone.list,
        callback: updateZonesView,
        error: onError,
        notify: false
    },

    "Zone.refresh" : {
        type: "custom",
        call: function() {
            waitingNodes(dataTable_zones);
            Sunstone.runAction("Zone.list");
        },
        callback: Empty,
        error: onError,
        notify: false
    },

    "Zone.autorefresh" : {
        type: "custom",
        call: function(){
            oZones.Zone.list({timeout: true, success: updateZonesView, error: onError});
        }
    },

    "Zone.delete" : {
        type: "multiple",
        call: oZones.Zone.delete,
        callback: deleteHostElement,
        elements: zoneSelectedNodes,
        error: onError,
        notify: true
    },

    "Zone.show" : {
        type: "single",
        call: oZones.Zone.show,
        callback: updateZoneElement,
        error: onError
    },

    "Zone.showinfo" : {
        type: "single",
        call: oZones.Zone.show,
        callback: updateZoneInfo,
        error: onError
    }
}

var zone_buttons = {
    "Zone.refresh" : {
        type: "image",
        text: "Refresh list",
        img: "images/Refresh-icon.png"
    },
    "Zone.create_dialog" : {
        type: "action",
        text: "+ New"
    },
    "Zone.delete" : {
        type: "action",
        text: "Delete"
    }
};

var zones_tab = {
    title: "Zones",
    content: zones_tab_content,
    buttons: zone_buttons
}

/*Info panel schema, to be updated*/
var zone_info_panel = {
    "zone_info_tab" : {
        title : "Zone Information",
        content : ""
    },
    "zone_hosts_tab" : {
        title : "Hosts",
        content : ""
    },
    "zone_templates_tab" : {
        title : "Templates",
        content : ""
    },
    "zone_vms_tab" : {
        title : "Virtual Machines",
        content : ""
    },
    "zone_vnets_tab" : {
        title : "Virtual Networks",
        content : ""
    },
    "zone_images_tab" : {
        title : "Images",
        content : ""
    }
}

Sunstone.addActions(zone_actions);
Sunstone.addMainTab("zones_tab",zones_tab);
Sunstone.addInfoPanel("zone_info_panel",zone_info_panel);

function zoneElementArray(zone_json){
    var zone = zone_json.ZONE;

    return [
        '<input type="checkbox" id="zone_'+zone.ID+'" name="selected_items" value="'+zone.ID+'"/>',
        zone.NAME,
        zone.ENDPOINT
    ];
}

function zoneInfoListener(){
    $("#tbodyzones tr").live("click", function(e){
        if ($(e.target).is('input')) {return true;}
        popDialogLoading();
        var aData = dataTable_zones.fnGetData(this);
        var id = $(aData[0]).val();
        Sunstone.runAction("Zone.showinfo",id);
        return false;
    });
}

function updateZoneSelect(){
    zones_select = makeSelectOptions(dataTable_zones,1,2,-1,"",-1);
}

function deleteZoneElement(req){
    deleteElement(dataTable_zones,'#zone_'+req.request.data);
    updateZoneSelect();
}

function addZoneElement(req,zone_json){
    var element = zoneElementArray(zone_json);
    addElement(element,dataTable_zones);
    updateZoneSelect();
}

function updateZonesView(req, zone_list){
    var zone_list_array = [];

    $.each(zone_list,function(){
        zone_list_array.push(zoneElementArray(this));
    });

    updateView(zone_list_array,dataTable_zones);
    updateZoneSelect();
    //update a dashboard?
}

function updateZoneInfo(req,zone_json){
    var zone = zone_json.ZONE;

    var info_tab = {
        title : "Zone information",
        content :
        '<table id="info_zone_table" class="info_table">\
            <thead>\
               <tr><th colspan="2">Zone information - '+zone.NAME+'</th></tr>\
            </thead>\
            <tbody>\
            <tr>\
                <td class="key_td">ID</td>\
                <td class="value_td">'+zone.ID+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Administrator</td>\
                <td class="value_td">'+zone.ADMIN+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Password</td>\
                <td class="value_td">'+zone.PASS+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Endpoint</td>\
                <td class="value_td">'+zone.ENDPOINT+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Number of VDCs</td>\
                <td class="value_td">'+zone.VDCS+'</td>\
            </tr>\
            </tbody>\
         </table>\
         <table id="zone_template_table" class="info_table">\
           <thead><tr><th colspan="2">Zone template</th></tr></thead>'+
             prettyPrintJSON(zone.TEMPLATE)+
         '</table>'
    };
    var hosts_tab = {
        title : "Hosts",
        content : 
'<table id="datatable_zone_hosts" class="display">\
  <thead>\
    <tr>\
      <th>ID</th>\
      <th>Name</th>\
      <th>Running VMs</th>\
      <th>CPU Use</th>\
      <th>Memory use</th>\
      <th>Status</th>\
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table>'
    };

    var templates_tab = {
        title: "Templates",
        content : 
'<table id="datatable_zones_templates" class="display">\
  <thead>\
    <tr>\
      <th>ID</th>\
      <th>Owner</th>\
      <th>Group</th>\
      <th>Name</th>\
      <th>Registration time</th>\
      <th>Public</th>\
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table>'
    };

    var vms_tab : {
        title : "Virtual Machines",
        content : 
'<table id="datatable_zone_vms" class="display">\
  <thead>\
    <tr>\
      <th>ID</th>\
      <th>Owner</th>\
      <th>Group</th>\
      <th>Name</th>\
      <th>Status</th>\
      <th>CPU</th>\
      <th>Memory</th>\
      <th>Hostname</th>\
      <th>Start Time</th>\
      <th>VNC Access</th>\
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table>'
    };

    var vnets_tab : {
        title : "Virtual Networks",
        content : 
'<table id="datatable_zone_vnets" class="display">\
  <thead>\
    <tr>\
      <th>ID</th>\
      <th>Owner</th>\
      <th>Group</th>\
      <th>Name</th>\
      <th>Type</th>\
      <th>Bridge</th>\
      <th>Public?</th>\
      <th>Total Leases</th>\
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table>'
    };

    var images_tab : {
        title : "Images",
        content : 
'<table id="datatable_zone_images" class="display">\
  <thead>\
    <tr>\
      <th>ID</th>\
      <th>Owner</th>\
      <th>Group</th>\
      <th>Name</th>\
      <th>Type</th>\
      <th>Registration time</th>\
      <th>Public</th>\
      <th>Persistent</th>\
      <th>State</th>\
      <th>#VMS</th>\
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table>'
    }
}