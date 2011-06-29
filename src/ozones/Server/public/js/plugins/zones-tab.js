/* -------------------------------------------------------------------------- */
/* Copyright 2002-2011, OpenNebula Project Leads (OpenNebula.org)             */
/*                                                                            */
/* Licensed under the Apache License, Version 2.0 (the "License"); you may    */
/* not use this file except in compliance with the License. You may obtain    */
/* a copy of the License at                                                   */
/*                                                                            */
/* http://www.apache.org/licenses/LICENSE-2.0                                 */
/*                                                                            */
/* Unless required by applicable law or agreed to in writing, software        */
/* distributed under the License is distributed on an "AS IS" BASIS,          */
/* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   */
/* See the License for the specific language governing permissions and        */
/* limitations under the License.                                             */
/* -------------------------------------------------------------------------- */

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
        <input type="text" name="name" id="name" /><br />\
        <label for="endpoint">End point:</label>\
        <input type="text" name="endpoint" id="endpoint" /><br />\
        <label for="endpoint">ONE auth:</label>\
        <input type="text" name="onename" id="onename" /><br />\
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

var zoneSelectedNodes = function() {
    return getSelectedNodes(dataTable_zones);
};

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
        call: openCreateZoneDialog
    },

    "Zone.list" : {
        type: "list",
        call: oZones.Zone.list,
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
        callback: deleteZoneElement,
        elements: zoneSelectedNodes,
        error: onError,
        notify: true
    },

    "Zone.showinfo" : {
        type: "single",
        call: oZones.Zone.show,
        callback: updateZoneInfo,
        error: onError
    },
    "Zone.host" : {
        type: "single",
        call: oZones.Zone.host,
        callback: function(req,host_json) {
            var hostDataTable = $('#datatable_zone_hosts').dataTable();
            var hosts_array = [];
            $.each(host_json,function(){
                hosts_array.push(hostElementArray(this));
            });

            updateView(hosts_array,hostDataTable);
        },
        error: onError
    },
    "Zone.vms" : {
        type: "single",
        call: oZones.Zone.vm,
        callback: function(req,vms_json){
            var vmsDataTable = $('#datatable_zone_vms').dataTable();
            var vms_array = [];
            $.each(vms_json,function(){
                var vm = this.VM;
                var state = oZones.Helper.resource_state("vm",vm.STATE);
                if (state == "ACTIVE") {
                    state = oZones.Helper.resource_state("vm_lcm",vm.LCM_STATE);
                }

                vms_array.push([
                    vm.ID,
                    vm.UID,
                    vm.GID,
                    vm.NAME,
                    state,
                    vm.CPU,
                    humanize_size(vm.MEMORY),
                    vm.HISTORY ? vm.HISTORY.HOSTNAME : "--",
                    pretty_time(vm.STIME)
                ]);
            });

            updateView(vms_array,vmsDataTable);

        },
        error: onError
    },
    "Zone.vn" : {
        type: "single",
        call: oZones.Zone.vn,
        callback: function(req, vn_json){
            var vnDataTable = $('#datatable_zone_vnets').dataTable();
            var vn_array = [];
            $.each(vn_json,function(){
                var network = this.VNET;
                var total_leases = "0";
                if (network.TOTAL_LEASES){
                    total_leases = network.TOTAL_LEASES;
                } else if (network.LEASES && network.LEASES.LEASE){
                    total_leases = network.LEASES.LEASE.length ? network.LEASES.LEASE.length : "1";
                }

                vn_array.push([
                    network.ID,
                    network.UID,
                    network.GID,
                    network.NAME,
                    parseInt(network.TYPE) ? "FIXED" : "RANGED",
                    network.BRIDGE,
                    parseInt(network.PUBLIC) ? "yes" : "no",
                    total_leases
                ]);
            });

            updateView(vn_array,vnDataTable);

        },
        error: onError
    },
    "Zone.image" : {
        type: "single",
        call: oZones.Zone.image,
        callback: function(req,image_json){
            var imageDataTable = $('#datatable_zone_images').dataTable();
            var image_array = [];
            $.each(image_json,function(){
                var image = this.IMAGE;
                image_array.push([
                    image.ID,
                    image.UID,
                    image.GID,
                    image.NAME,
                    oZones.Helper.image_type(image.TYPE),
                    pretty_time(image.REGTIME),
                    parseInt(image.PUBLIC) ? "yes" : "no",
                    parseInt(image.PERSISTENT) ? "yes" : "no",
                    oZones.Helper.resource_state("image",image.STATE),
                    image.RUNNING_VMS
                ]);
            });
            updateView(image_array,imageDataTable);
        },
        error: onError
    },
    "Zone.template" : {
        type: "single",
        call: oZones.Zone.template,
        callback: function(req,template_json){
            var templateDataTable = $('#datatable_zone_templates').dataTable();

            var template_array = [];
            $.each(template_json,function(){
                var template = this.VMTEMPLATE;
                template_array.push([
                    template.ID,
                    template.UID,
                    template.GID,
                    template.NAME,
                    pretty_time(template.REGTIME),
                    parseInt(template.PUBLIC) ? "yes" : "no"
                ]);
            });
            updateView(template_array,templateDataTable);
        },
        error: onError
    },
    "Zone.user" : {
        type: "single",
        call: oZones.Zone.user,
        callback: function(req,user_json){
            var userDataTable = $('#datatable_zone_users').dataTable({
                "bJQueryUI": true,
                "bSortClasses": false,
                "sPaginationType": "full_numbers",
                "bAutoWidth":false,
                "aoColumnDefs": [
                    { "sWidth": "35px", "aTargets": [0] }
                ]
            });

            var user_array = [];
            $.each(user_json,function(){
                var user = this.USER;
                var name = "";
                var group_str = "";
                if (user.NAME && user.NAME != {}){
                    name = user.NAME;
                }

                if (user.GROUPS.ID){
                    $.each(user.GROUPS.ID,function() {
                        groups_str += this +", ";
                    });
                }

                user_array.push([
                    user.ID,
                    name,
                    group_str
                ]);
            });
            updateView(user_array,userDataTable);
        },
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
        text: "+ New",
        alwaysActive:true
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
};

Sunstone.addActions(zone_actions);
Sunstone.addMainTab("zones_tab",zones_tab);
Sunstone.addInfoPanel("zone_info_panel",zone_info_panel);

function zoneElementArray(zone_json){
    var zone = zone_json.ZONE;

    return [
        '<input type="checkbox" id="zone_'+zone.id+'" name="selected_items" value="'+zone.id+'"/>',
        zone.id,
        zone.name,
        zone.endpoint
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
               <tr><th colspan="2">Zone information - '+zone.name+'</th></tr>\
            </thead>\
            <tbody>\
            <tr>\
                <td class="key_td">ID</td>\
                <td class="value_td">'+zone.id+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Administrator</td>\
                <td class="value_td">'+zone.onename+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Password</td>\
                <td class="value_td">'+zone.onepass+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Endpoint</td>\
                <td class="value_td">'+zone.endpoint+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">#VDCs</td>\
                <td class="value_td">'+zone.vdcs.length+'</td>\
            </tr>\
            </tbody>\
         </table>'
    };
    var hosts_tab = {
        title : "Hosts",
        content :
'<div style="padding: 10px 10px;">\
<table id="datatable_zone_hosts" class="display">\
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
</table></div>'
    };

    var templates_tab = {
        title: "Templates",
        content :
'<div style="padding: 10px 10px;">\
<table id="datatable_zone_templates" class="display">\
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
</table></div>'
    };

    var vms_tab = {
        title : "Virtual Machines",
        content :
'<div style="padding: 10px 10px;">\
<table id="datatable_zone_vms" class="display">\
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
    </tr>\
  </thead>\
  <tbody>\
  </tbody>\
</table></div>'
    };

    var vnets_tab = {
        title : "Virtual Networks",
        content :
'<div style="padding: 10px 10px;">\
<table id="datatable_zone_vnets" class="display">\
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
</table></div>'
    };

    var images_tab = {
        title : "Images",
        content :
'<div style="padding: 10px 10px;">\
<table id="datatable_zone_images" class="display">\
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
</table></div>'
    };

    Sunstone.updateInfoPanelTab("zone_info_panel","zone_info_tab",info_tab);
    Sunstone.updateInfoPanelTab("zone_info_panel","zone_hosts_tab",hosts_tab);
    Sunstone.updateInfoPanelTab("zone_info_panel","zone_templates_tab",templates_tab);
    Sunstone.updateInfoPanelTab("zone_info_panel","zone_vms_tab",vms_tab);
    Sunstone.updateInfoPanelTab("zone_info_panel","zone_vnets_tab",vnets_tab);
    Sunstone.updateInfoPanelTab("zone_info_panel","zone_images_tab",images_tab);

    //Pop up the info we have now.
    Sunstone.popUpInfoPanel("zone_info_panel");


   /*Init dataTables*/
    $('#datatable_zone_hosts').dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "sWidth": "60px", "aTargets": [2] },
            { "sWidth": "35px", "aTargets": [0] },
            { "sWidth": "200px", "aTargets": [3,4] }
        ]
    });

    $('#datatable_zone_vms').dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "sPaginationType": "full_numbers",
        "bAutoWidth":false,
        "aoColumnDefs": [
            { "sWidth": "35px", "aTargets": [0,8] },
            { "sWidth": "100px", "aTargets": [1,2,3] }
        ]
    });


    $('#datatable_zone_vnets').dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "sWidth": "60px", "aTargets": [4,5,6,7] },
            { "sWidth": "35px", "aTargets": [0] },
            { "sWidth": "100px", "aTargets": [1,2] }
        ]
    });

    $('#datatable_zone_images').dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "sWidth": "60px", "aTargets": [2] },
            { "sWidth": "35px", "aTargets": [0] },
            { "sWidth": "100px", "aTargets": [1,3] }
        ]
    });

    $('#datatable_zone_templates').dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "sWidth": "35px", "aTargets": [0] },
            { "sWidth": "100px", "aTargets": [1,2,3] }
        ]
    });



    /*End init dataTables*/

    //Retrieve pools in the meantime
    Sunstone.runAction("Zone.host",zone.id);
    Sunstone.runAction("Zone.template",zone.id);
    Sunstone.runAction("Zone.vms",zone.id);
    Sunstone.runAction("Zone.vn",zone.id);
    Sunstone.runAction("Zone.image",zone.id);
}


function setupCreateZoneDialog(){
    $('div#dialogs').append('<div title="Create Zone" id="create_zone_dialog"></div>');
    $('div#create_zone_dialog').html(create_zone_tmpl);
    $('#create_zone_dialog').dialog({
        autoOpen: false,
        modal: true,
        width: 500
    });

    $('#create_zone_dialog button').button();

    //Handle the form submission
    $('#create_zone_form').submit(function(){
        var name = $('#name', this).val();
        var endpoint = $('#endpoint',this).val();
        var onename = $('#onename',this).val();
        var onepass = $('#onepass',this).val();

        if (!name.length || !endpoint.length ||
            !onename.length || !onepass.length){
            notifyError("Please fill in all fields");
            return false;
        }

        var zone_json = {
            "zone": {
                "name": name,
                "endpoint": endpoint,
                "onename": onename,
                "onepass": onepass
            }
        };

        Sunstone.runAction("Zone.create",zone_json);
        $('#create_zone_dialog').dialog('close');
        return false;
    });
}

function openCreateZoneDialog(){
    $('#create_zone_dialog').dialog('open');
}

function setZoneAutorefresh() {
    setInterval(function(){
        var checked = $('input:checked',dataTable_zones.fnGetNodes());
        var  filter = $("#datatable_zones_filter input").attr("value");
        if (!checked.length && !filter.length){
            Sunstone.runAction("Zone.autorefresh");
        }
    },INTERVAL+someTime());
}

function hostElementArray(host_json){

    var host = host_json.HOST;

    //Calculate some values
    var acpu = parseInt(host.HOST_SHARE.MAX_CPU);
    if (!acpu) {acpu=100};
    acpu = acpu - parseInt(host.HOST_SHARE.CPU_USAGE);

    var total_mem = parseInt(host.HOST_SHARE.MAX_MEM);
    var free_mem = parseInt(host.HOST_SHARE.FREE_MEM);

    var ratio_mem = 0;
    if (total_mem) {
        ratio_mem = Math.round(((total_mem - free_mem) / total_mem) * 100);
    }


    var total_cpu = parseInt(host.HOST_SHARE.MAX_CPU);
    var used_cpu = Math.max(total_cpu - parseInt(host.HOST_SHARE.USED_CPU),acpu);

    var ratio_cpu = 0;
    if (total_cpu){
        ratio_cpu = Math.round(((total_cpu - used_cpu) / total_cpu) * 100);
    }


    //progressbars html code - hardcoded jquery html result
     var pb_mem =
'<div style="height:10px" class="ratiobar ui-progressbar ui-widget ui-widget-content ui-corner-all" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+ratio_mem+'">\
    <div class="ui-progressbar-value ui-widget-header ui-corner-left ui-corner-right" style="width: '+ratio_mem+'%;"/>\
    <span style="position:relative;left:90px;top:-4px;font-size:0.6em">'+ratio_mem+'%</span>\
    </div>\
</div>';

    var pb_cpu =
'<div style="height:10px" class="ratiobar ui-progressbar ui-widget ui-widget-content ui-corner-all" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+ratio_cpu+'">\
    <div class="ui-progressbar-value ui-widget-header ui-corner-left ui-corner-right" style="width: '+ratio_cpu+'%;"/>\
    <span style="position:relative;left:90px;top:-4px;font-size:0.6em">'+ratio_cpu+'%</span>\
    </div>\
</div>';


    return [
        host.ID,
        host.NAME,
        host.HOST_SHARE.RUNNING_VMS, //rvm
        pb_cpu,
        pb_mem,
        oZones.Helper.resource_state("host_simple",host.STATE) ];
}

$(document).ready(function(){
    dataTable_zones = $("#datatable_zones").dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "bSortable": false, "aTargets": ["check"] },
            { "sWidth": "60px", "aTargets": [0,2] },
            { "sWidth": "35px", "aTargets": [1] }
        ]
    });

    dataTable_zones.fnClearTable();
    addElement([spinner,'','',''],dataTable_zones);
    Sunstone.runAction("Zone.list");

    setupCreateZoneDialog();

    setZoneAutorefresh();

    initCheckAllBoxes(dataTable_zones);
    tableCheckboxesListener(dataTable_zones);
    zoneInfoListener();
});