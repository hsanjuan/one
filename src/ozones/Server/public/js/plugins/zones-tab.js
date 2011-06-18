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

/*Zones tab plugin*/

var ZONES_HISTORY_LENGTH = 40;

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
      <th>Oneadmin Name</th>\
      <th>Oneadmin Password</th>\
      <th>Endpoint</th>\      
      <th>Number of VDCs</th>\
    </tr>\
  </thead>\
  <tbody id="tbodyzones">\
  </tbody>\
</table>\
</form>';

var create_zone_tmpl =
'<div class="create_form"><form id="create_zone_form" action="">\
  <fieldset>\
  <legend style="display:none;">Zone parameters</legend>\
  <label for="name">Name: </label><input type="text" name="name" id="name" />\
  <label for="name">Oneadmin name: </label><input type="text" name="onename" id="onename" />\
  <label for="name">Oneadmin password: </label><input type="text" name="onepass" id="onepass" />\    
  <label for="name">Endpoint: </label><input type="text" name="endpoint" id="endpoint" />\      
  </fieldset>\
    <fieldset>\
    <div class="form_buttons">\
        <div><button class="button" id="create_zone_submit" value="oZones.Zone.create">Create</button>\
        <button class="button" type="reset" value="reset">Reset</button></div>\
    </div>\
  </fieldset>\
</form></div>';

var zones_select    = "";
var zones_list_json = {};
var dataTable_zones;

//Setup actions
var zone_actions = {

    "Zone.create" : {
        type: "create",
        call : oZones.Zone.create,
        callback : addZoneElement,
        error : onError,
        notify: true
    },

    "Zone.create_dialog" : {
        type: "custom",
        call: popUpCreateZoneDialog
    },

    "Zone.list" : {
        type: "list",
        call: oZones.Zone.list,
        callback: updateZonesView,
        error: onError,
        notify: false
    },

    "Zone.show" : {
        type: "single",
        call: oZones.Zone.show,
        callback: updateZoneElement,
        error: onError
    },

    "Zone.refresh" : {
        type: "custom",
        call: function(){
            waitingNodes(dataTable_zone);
            OZonesGUI.runAction("Zone.list");
        },
        callback: function(){},
        error: onError,
        notify:false
    },

    "Zone.autorefresh" : {
        type: "custom",
        call : function() {
            oZones.Zone.list({timeout: true, success: updateZonesView,error: onError});
        }
    },

    "Zone.delete" : {
        type: "multiple",
        call : oZones.Zone.delete,
        callback : deleteZonetElement,
        elements: function() { return getSelectedNodes(dataTable_zones); },
        error : onError,
        notify:true
    },
};

var zone_buttons = {
    "Zone.refresh" : {
        type: "image",
        text: "Refresh list",
        img: "/images/Refresh-icon.png",
        condition: True
        },
    "Zone.create_dialog" : {
        type: "create_dialog",
        text: "+ New",
        condition :True
    },
    "Zone.delete" : {
        type: "action",
        text: "Delete zone",
        condition : True
    }
};

var zone_info_panel = {
    "zone_info_tab" : {
        title: "Zone information",
        content:""
    },

    "zone_vdc_tab" : {
        title: "Zone associated VDCs",
        content: ""
    }
};


var vdc_tab = {
    title: 'Zones',
    content: zones_tab_content,
    buttons: zone_buttons,
    condition: True
}

OZonesGUI.addActions(zone_actions);
OZonesGUI.addMainTab('zones_tab',zones_tab);
OZonesGUI.addInfoPanel("zone_info_panel",zone_info_panel);


//Creates an array to be added to the dataTable from the JSON of a zone.
function zoneElementArray(zone_json){

    var zone = zone_json.ZONE;

    return [
        '<input type="checkbox" id="zone_'+zone.ID+'" name="selected_items" value="'+zone.ID+'"/>',
        zone.ID,
        zone.NAME,
        zone.ONEADMIN,
        zone.ONEPASS,
        zone.ENDPOINT,
        zone.NUMBERVDCS ];
}

//Listen to clicks on the tds of the tables and shows the info dialogs.
function zoneInfoListener(){
    $('#tbodyzones tr').live("click",function(e){

        //do nothing if we are clicking a checkbox!
        if ($(e.target).is('input')) {return true;}
        popDialogLoading();
        var aData = dataTable_zones.fnGetData(this);
        var id = $(aData[0]).val();
        OZonesGUI.runAction("Zone.showinfo",id);
        return false;
    });
}

//updates the zone select by refreshing the options in it
function updateZoneSelect(){
    zones_select = makeSelectOptions(dataTable_zones,1,2,7,"DISABLED",-1);
}

//callback for an action affecting a zone element
function updateZoneElement(request, zone_json){
    var id = zone_json.ZONE.ID;
    var element = zoneElementArray(zone_json);
    updateSingleElement(element,dataTable_zones,'#zone_'+id);
    updateZoneSelect();
}

//callback for actions deleting a zone element
function deleteZoneElement(req){
    deleteElement(dataTable_zones,'#zone_'+req.request.data);
    updateZoneSelect();
}

//call back for actions creating a zone element
function addZoneElement(request,zone_json){
    var id = zone_json.ZONE.ID;
    var element = zoneElementArray(zone_json);
    addElement(element,dataTable_zones);
    updateZoneSelect();
}

//callback to update the list of zones.
function updateZonesView (request,zone_list){
    zone_list_json = zone_list;
    var zone_list_array = [];

    $.each(zone_list,function(){
        //Grab table data from the zone_list
        zone_list_array.push(zoneElementArray(this));
    });

    updateView(zone_list_array,dataTable_zones);
    updateZoneSelect();
    //dependency with the dashboard plugin
    updateDashboard("zones",zone_list_json);
}

//Updates the zone info panel tab's content and pops it up
function updateZoneInfo(request,zone){
    var zone_info = zone.ZONE;

    //Information tab
    var info_tab = {
        title : "Zone information",
        content :
        '<table id="info_zone_table" class="info_table">\
            <thead>\
               <tr><th colspan="2">Zone information - '+zone_info.NAME+'</th></tr>\
            </thead>\
            <tbody>\
            <tr>\
                <td class="key_td">ID</td>\
                <td class="value_td">'+zone_info.ID+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Name</td>\
                <td class="value_td">'+zone_info.NAME+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Oneadmin Name</td>\
                <td class="value_td">'+zone_info.ONEADMIN+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Oneadmin Password</td>\
                <td class="value_td">'+zone_info.ONEPASS+'</td>\
            </tr>\
            <tr>\
                <td class="key_td">Endpoint</td>\
                <td class="value_td">'+zone_info.ENDPOINT+'</td>\
            </tr>\
            </tbody>\
         </table>'
    }

    //Sunstone.updateInfoPanelTab(info_panel_name,tab_name, new tab object);
    OZonesGUI.updateInfoPanelTab("zone_info_panel","zone_info_tab",info_tab);
    OZonesGUI.updateInfoPanelTab("zone_info_panel","zone_template_tab",template_tab);


}

//Prepares the zone creation dialog
function setupCreateZoneDialog(){
    $('div#dialogs').append('<div title="Create zone" id="create_zone_dialog"></div>');
    $('div#create_zone_dialog').html(create_zone_tmpl);
    $('#create_zone_dialog').dialog({
        autoOpen: false,
        modal: true,
        width: 500
    });

    $('#create_zone_dialog button').button();

    //Handle the form submission
    $('#create_zone_form').submit(function(){
        if (!($('#name',this).val().length)){
            notifyError("Zone name missing!");
            return false;
        }
        var zone_json = {
            "zone": {
                "name": $('#name',this).val(),
                "oneadmin": $('#oneadmin',this).val(),
                "onepass": $('#onepass :selected',this).val(),
                "endpoint": $('#endpoint :selected',this).val(),
                "numbervdcs": $('#numbervdcs :selected',this).val()
            }
        }

        //Create the oZones.Zone.
        //If it's successfull we refresh the list.
        OZonesGUI.runAction("Zone.create",zone_json);
        $('#create_zone_dialog').dialog('close');
        return false;
    });
}

//Open creation dialogs
function popUpCreateZoneDialog(){
    $('#create_zone_dialog').dialog('open');
    return false;
}

//Prepares the autorefresh for zones
function setZoneAutorefresh() {
    setInterval(function(){
        var checked = $('input:checked',dataTable_zones.fnGetNodes());
        var  filter = $("#datatable_zones_filter input").attr("value");
        if (!checked.length && !filter.length){
            OZonesGUI.runAction("Zone.autorefresh");
        }
    },INTERVAL+someTime());
}

//This is executed after the ozonesgui.js ready() is run.
//Here we can basicly init the zone datatable, preload it
//and add specific listeners
$(document).ready(function(){

    //prepare zone datatable
    dataTable_zones = $("#datatable_zones").dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "bSortable": false, "aTargets": ["check"] },
            { "sWidth": "60px", "aTargets": [0,3] },
            { "sWidth": "35px", "aTargets": [1] },
            { "sWidth": "200px", "aTargets": [4,5] }
        ]
    });

    //preload it
    dataTable_zones.fnClearTable();
    addElement([
        spinner,
        '','','','','',''],dataTable_zones);
    OZonesGUI.runAction("Zone.list");

    setupCreateZoneDialog();

    setZoneAutorefresh();

    initCheckAllBoxes(dataTable_zones);
    tableCheckboxesListener(dataTable_zones);
    zoneInfoListener();
});
