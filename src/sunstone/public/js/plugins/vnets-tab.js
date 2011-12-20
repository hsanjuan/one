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

/*Virtual networks tab plugin*/

var vnets_tab_content =
'<form id="virtualNetworks_form" action="javascript:alert(\'js error!\');">\
  <div class="action_blocks">\
  </div>\
<table id="datatable_vnetworks" class="display">\
  <thead>\
    <tr>\
      <th class="check"><input type="checkbox" class="check_all" value="">All</input></th>\
      <th>ID</th>\
      <th>Owner</th>\
      <th>Group</th>\
      <th>Name</th>\
      <th>Type</th>\
      <th>Bridge</th>\
      <th>Public</th>\
      <th>Total Leases</th>\
    </tr>\
  </thead>\
  <tbody id="tbodyvnetworks">\
  </tbody>\
</table>\
</form>';

var create_vn_tmpl =
'<div id="vn_tabs">\
        <ul>\
          <li><a href="#easy">Wizard</a></li>\
          <li><a href="#manual">Advanced mode</a></li>\
        </ul>\
        <div id="easy">\
           <form id="create_vn_form_easy" action="">\
              <fieldset>\
                 <label for="name">Name:</label>\
                 <input type="text" name="name" id="name" /><br />\
              </fieldset>\
              <fieldset>\
                 <label for="bridge">Bridge:</label>\
                 <input type="text" name="bridge" id="bridge" /><br />\
              </fieldset>\
              <fieldset>\
                 <label style="height:2em;">Network type:</label>\
                 <input type="radio" name="fixed_ranged" id="fixed_check" value="fixed" checked="checked">Fixed network</input><br />\
                <input type="radio" name="fixed_ranged" id="ranged_check" value="ranged">Ranged network</input><br />\
              </fieldset>\
              <div class="clear"></div>\
              <div id="easy_tabs">\
                 <div id="fixed">\
                 <fieldset>\
                   <label for="leaseip">Lease IP:</label>\
                   <input type="text" name="leaseip" id="leaseip" /><br />\
                   <label for="leasemac">Lease MAC (opt):</label>\
                   <input type="text" name="leasemac" id="leasemac" />\
                   <div class="clear"></div>\
                   <button class="add_remove_button add_button" id="add_lease" value="add/lease">\
                     Add\
                  </button>\
                  <button class="add_remove_button" id="remove_lease" value="remove/lease">\
                     Remove selected\
                   </button>\
                   <label for="leases">Current leases:</label>\
                   <select id="leases" name="leases" style="height:10em;" multiple>\
                     <!-- insert leases -->\
                   </select><br />\
                 </fieldset>\
              </div>\
              <div id="ranged">\
                 <fieldset>\
                    <label for="net_address">Network Address:</label>\
                    <input type="text" name="net_address" id="net_address" /><br />\
                    <label for="net_size">Network size:</label>\
                    <input type="text" name="net_size" id="net_size" />\
                 </fieldset>\
              </div>\
            </div>\
            <div class="clear"></div>\
          </fieldset>\
          <fieldset>\
            <div class="form_buttons">\
              <button class="button" id="create_vn_submit_easy" value="vn/create">\
                 Create\
              </button>\
              <button class="button" type="reset" value="reset">Reset</button>\
            </div>\
          </fieldset>\
        </form>\
      </div>\
      <div id="manual">\
        <form id="create_vn_form_manual" action="">\
           <h3 style="margin-bottom:10px;">Write the Virtual Network template here</h3>\
             <fieldset style="border-top:none;">\
               <textarea id="template" rows="15" style="width:100%;"></textarea>\
               <div class="clear"></div>\
             </fieldset>\
             <fieldset>\
                <div class="form_buttons">\
                <button class="button" id="create_vn_submit_manual" value="vn/create">\
                   Create\
                </button>\
                <button class="button" type="reset" value="reset">Reset</button>\
              </div>\
            </fieldset>\
          </form>\
        </div>\
</div>';

var vnetworks_select="";
var dataTable_vNetworks;
var $create_vn_dialog;
var $lease_vn_dialog;

//Setup actions

var vnet_actions = {
    "Network.create" : {
        type: "create",
        call: OpenNebula.Network.create,
        callback: addVNetworkElement,
        error: onError,
        notify: true
    },

    "Network.create_dialog" : {
        type: "custom",
        call: popUpCreateVnetDialog
    },

    "Network.list" : {
        type: "list",
        call: OpenNebula.Network.list,
        callback: updateVNetworksView,
        error: onError
    },

    "Network.show" : {
        type: "single",
        call: OpenNebula.Network.show,
        callback: updateVNetworkElement,
        error: onError
    },

    "Network.showinfo" : {
        type: "single",
        call: OpenNebula.Network.show,
        callback: updateVNetworkInfo,
        error: onError

    },

    "Network.refresh" : {
        type: "custom",
        call: function(){
            waitingNodes(dataTable_vNetworks);
            Sunstone.runAction("Network.list");
        }
    },

    "Network.autorefresh" : {
        type: "custom",
        call: function() {
            OpenNebula.Network.list({timeout: true, success: updateVNetworksView, error: onError});
        }
    },

    "Network.publish" : {
        type: "multiple",
        call: OpenNebula.Network.publish,
        callback: vnShow,
        elements: vnElements,
        error: onError,
        notify: true
    },

    "Network.unpublish" : {
        type: "multiple",
        call: OpenNebula.Network.unpublish,
        callback: vnShow,
        elements: vnElements,
        error: onError,
        notify: true
    },

    "Network.delete" : {
        type: "multiple",
        call: OpenNebula.Network.delete,
        callback: deleteVNetworkElement,
        elements: vnElements,
        error: onError,
        notify: true
    },

    "Network.addleases" : {
        type: "single",
        call: OpenNebula.Network.addleases,
        callback: vnShow,
        error: onError,
        notify: true
    },

    "Network.rmleases" : {
        type: "single",
        call: OpenNebula.Network.rmleases,
        callback: vnShow,
        error: onError,
        notify: true
    },

    "Network.modifyleases" : {
        type: "custom",
        call: function(action,obj){
            nodes = getSelectedNodes(dataTable_vNetworks);
            $.each(nodes,function(){
                Sunstone.runAction(action,this,obj);
            });
        }
    },

    "Network.addleases_dialog" : {
        type: "custom",
        call: popUpAddLeaseDialog
    },

    "Network.rmleases_dialog" : {
        type: "custom",
        call: popUpRemoveLeaseDialog
    },

    "Network.chown" : {
        type: "multiple",
        call: OpenNebula.Network.chown,
        callback: vnShow,
        elements: vnElements,
        error:onError,
        notify: true
    },

    "Network.chgrp" : {
        type: "multiple",
        call: OpenNebula.Network.chgrp,
        callback: vnShow,
        elements: vnElements,
        error:onError,
        notify: true
    }
}


var vnet_buttons = {
    "Network.refresh" : {
        type: "image",
        text: "Refresh list",
        img: "images/Refresh-icon.png"
    },

    "Network.create_dialog" : {
        type: "create_dialog",
        text: "+ New"
    },

    "Network.publish" : {
        type: "action",
        text: "Publish"
    },

    "Network.unpublish" : {
        type: "action",
        text: "Unpublish"
    },

    "Network.chown" : {
        type: "confirm_with_select",
        text: "Change owner",
        select: users_sel,
        tip: "Select the new owner:",
        condition: mustBeAdmin
    },

    "Network.chgrp" : {
        type: "confirm_with_select",
        text: "Change group",
        select: groups_sel,
        tip: "Select the new group:",
        condition: mustBeAdmin,
    },

    "action_list" : {
        type: "select",
        actions: {
            "Network.addleases_dialog" : {
                type: "action",
                text: "Add lease"
            },
            "Network.rmleases_dialog" : {
                type: "action",
                text: "Remove lease"
            }
        }
    },

    "Network.delete" : {
        type: "action",
        text: "Delete"
    }
}

var vnet_info_panel = {
    "vnet_info_tab" : {
        title: "Virtual network information",
        content: ""
    },
    "vnet_template_tab" : {
        title: "Virtual network template",
        content: ""
    }
}

var vnets_tab = {
    title: "Virtual Networks",
    content: vnets_tab_content,
    buttons: vnet_buttons
}

Sunstone.addActions(vnet_actions);
Sunstone.addMainTab('vnets_tab',vnets_tab);
Sunstone.addInfoPanel('vnet_info_panel',vnet_info_panel);


function vnElements(){
    return getSelectedNodes(dataTable_vNetworks);
}

function vnShow(req){
    Sunstone.runAction("Network.show",req.request.data[0]);
}

//returns an array with the VNET information fetched from the JSON object
function vNetworkElementArray(vn_json){
    var network = vn_json.VNET;

    return [
        '<input type="checkbox" id="vnetwork_'+network.ID+'" name="selected_items" value="'+network.ID+'"/>',
        network.ID,
        network.UNAME,
        network.GNAME,
        network.NAME,
        parseInt(network.TYPE) ? "FIXED" : "RANGED",
        network.BRIDGE,
        parseInt(network.PUBLIC) ? "yes" : "no",
        network.TOTAL_LEASES ];
}


//Adds a listener to show the extended info when clicking on a row
function vNetworkInfoListener(){

    $('#tbodyvnetworks tr',dataTable_vNetworks).live("click", function(e){
        if ($(e.target).is('input')) {return true;}
        popDialogLoading();
        var aData = dataTable_vNetworks.fnGetData(this);
        var id = $(aData[0]).val();
        Sunstone.runAction("Network.showinfo",id);
        return false;
    });
}

//updates the vnet select different options
function updateNetworkSelect(){
    vnetworks_select=
        makeSelectOptions(dataTable_vNetworks,
                          1,
                          4,
                          [],
                          []
                         );

    //update static selectors:
    //in the VM creation dialog
    $('div.vm_section#networks select#NETWORK_ID',$create_template_dialog).html(vnetworks_select);
}

//Callback to update a vnet element after an action on it
function updateVNetworkElement(request, vn_json){
    id = vn_json.VNET.ID;
    element = vNetworkElementArray(vn_json);
    updateSingleElement(element,dataTable_vNetworks,'#vnetwork_'+id);
    updateNetworkSelect();
}

//Callback to delete a vnet element from the table
function deleteVNetworkElement(req){
    deleteElement(dataTable_vNetworks,'#vnetwork_'+req.request.data);
    updateNetworkSelect();
}

//Callback to add a new element
function addVNetworkElement(request,vn_json){
    var element = vNetworkElementArray(vn_json);
    addElement(element,dataTable_vNetworks);
    updateNetworkSelect();
}

//updates the list of virtual networks
function updateVNetworksView(request, network_list){
    var network_list_array = [];

    $.each(network_list,function(){
        network_list_array.push(vNetworkElementArray(this));
    });

    updateView(network_list_array,dataTable_vNetworks);
    updateNetworkSelect();
    //dependency with dashboard
    updateDashboard("vnets",network_list);

}

//updates the information panel tabs and pops the panel up
function updateVNetworkInfo(request,vn){
    var vn_info = vn.VNET;
    var info_tab_content =
        '<table id="info_vn_table" class="info_table">\
            <thead>\
               <tr><th colspan="2">Virtual Network '+vn_info.ID+' information</th></tr>\
            </thead>\
            <tr>\
              <td class="key_td">ID</td>\
              <td class="value_td">'+vn_info.ID+'</td>\
            <tr>\
            <tr>\
              <td class="key_td">Owner</td>\
              <td class="value_td">'+vn_info.UNAME+'</td>\
            </tr>\
            <tr>\
              <td class="key_td">Group</td>\
              <td class="value_td">'+vn_info.GNAME+'</td>\
            </tr>\
            <tr>\
              <td class="key_td">Public</td>\
              <td class="value_td">'+(parseInt(vn_info.PUBLIC) ? "yes" : "no" )+'</td>\
            </tr>\
        </table>\
       <table id="vn_leases_info_table" class="info_table">\
            <thead>\
               <tr><th colspan="2">Leases information</th></tr>\
            </thead>'+
              printLeases(vn_info.LEASES)+
        '</table>';;



    var info_tab = {
        title: "Virtual Network information",
        content: info_tab_content
    }

    var template_tab = {
        title: "Virtual Network template",
        content:
        '<table id="vn_template_table" class="info_table" style="width:80%">\
         <thead><tr><th colspan="2">Virtual Network template</th></tr></thead>'+
            prettyPrintJSON(vn_info.TEMPLATE)+
         '</table>'
    }

    Sunstone.updateInfoPanelTab("vnet_info_panel","vnet_info_tab",info_tab);
    Sunstone.updateInfoPanelTab("vnet_info_panel","vnet_template_tab",template_tab);

    Sunstone.popUpInfoPanel("vnet_info_panel");

}

function printLeases(leases){
    if (!leases.LEASE) //empty
    {
        return "";
    };

    if (leases.LEASE.constructor == Array) //>1 lease
    {
        return prettyPrintJSON(leases.LEASE);
    }
    else {//1 lease
        return prettyPrintJSON([leases.LEASE]);
    };
}

//Prepares the vnet creation dialog
function setupCreateVNetDialog() {
    dialogs_context.append('<div title="Create Virtual Network" id="create_vn_dialog"></div>');
    $create_vn_dialog = $('#create_vn_dialog',dialogs_context)
    var dialog = $create_vn_dialog;
    dialog.html(create_vn_tmpl);

    //Prepare the jquery-ui dialog. Set style options here.
    dialog.dialog({
        autoOpen: false,
        modal: true,
        width: 475,
        height: 500
    });

    //Make the tabs look nice for the creation mode
    $('#vn_tabs',dialog).tabs();
    $('div#ranged',dialog).hide();
    $('#fixed_check',dialog).click(function(){
        $('div#fixed',$create_vn_dialog).show();
        $('div#ranged',$create_vn_dialog).hide();
    });
    $('#ranged_check',dialog).click(function(){
        $('div#fixed',$create_vn_dialog).hide();
        $('div#ranged',$create_vn_dialog).show();
    });
    $('button',dialog).button();


    //When we hit the add lease button...
    $('#add_lease',dialog).click(function(){
        var create_form = $('#create_vn_form_easy',$create_vn_dialog); //this is our scope

        //Fetch the interesting values
        var lease_ip = $('#leaseip',create_form).val();
        var lease_mac = $('#leasemac',create_form).val();

        //We don't add anything to the list if there is nothing to add
        if (lease_ip == null) {
            notifyError("Please provide a lease IP");
            return false;
        };

        var lease = ""; //contains the HTML to be included in the select box
        if (lease_mac == "") {
            lease='<option value="' + lease_ip + '">' + lease_ip + '</option>';
        } else {
            lease='<option value="' +
                lease_ip + ',' +
                lease_mac + '">' +
                lease_ip + ',' + lease_mac +
                '</option>';
        };

        //We append the HTML into the select box.
        $('select#leases',$create_vn_dialog).append(lease);
        return false;
    });

    $('#remove_lease', dialog).click(function(){
        $('select#leases :selected',$create_vn_dialog).remove();
        return false;
    });

    //Handle submission of the easy mode
    $('#create_vn_form_easy',dialog).submit(function(){
        //Fetch values
        var name = $('#name',this).val();
        if (!name.length){
            notifyError("Virtual Network name missing!");
            return false;
        }
        var bridge = $('#bridge',this).val();
        var type = $('input:checked',this).val();

        //TODO: Name and bridge provided?!

        var network_json = null;
        if (type == "fixed") {
            var leases = $('#leases option', this);
            var leases_obj=[];

            //for each specified lease we prepare the JSON object
            $.each(leases,function(){
                var lease_str = $(this).val().split(",");
                if (lease_str[1])
                    leases_obj.push({"ip": lease_str[0],
                                     "mac": lease_str[1]});
                else
                    leases_obj.push({"ip": lease_str[0] });
            });

            //and construct the final data for the request
            network_json = {
                "vnet" : {
                    "type" : "FIXED",
                    "leases" : leases_obj,
                    "bridge" : bridge,
                    "name" : name }};
        }
        else { //type ranged

            var network_addr = $('#net_address',this).val();
            var network_size = $('#net_size',this).val();
            if (!network_addr.length){
                notifyError("Please provide a network address");
                return false;
            };

            //we form the object for the request
            network_json = {
                "vnet" : {
                    "type" : "RANGED",
                    "bridge" : bridge,
                    "network_size" : network_size,
                    "network_address" : network_addr,
                    "name" : name }
            };
        };

        //Create the VNetwork.

        Sunstone.runAction("Network.create",network_json);
        $create_vn_dialog.dialog('close');
        return false;
    });

    $('#create_vn_form_manual',dialog).submit(function(){
        var template=$('#template',this).val();
        var vnet_json = {vnet: {vnet_raw: template}};
        Sunstone.runAction("Network.create",vnet_json);
        $create_vn_dialog.dialog('close');
        return false;
    });
}

function popUpCreateVnetDialog() {
    $create_vn_dialog.dialog('open');
}

function setupAddRemoveLeaseDialog() {
    dialogs_context.append('<div title="Lease management" id="lease_vn_dialog"></div>');
    $lease_vn_dialog = $('#lease_vn_dialog',dialogs_context)

    var dialog = $lease_vn_dialog;

    dialog.html(
        '<form id="lease_vn_form" action="javascript:alert(\'js error!\');">\
           <fieldset>\
           <div>Please specify:</div>\
           <label for="add_lease_ip">Lease IP:</label>\
           <input type="text" name="add_lease_ip" id="add_lease_ip" /><br />\
           <label id="add_lease_mac_label" for="add_lease_mac">Lease MAC:</label>\
           <input type="text" name="add_lease_mac" id="add_lease_mac" />\
           </select>\
           </fieldset>\
           <fieldset>\
           <div class="form_buttons">\
              <button id="lease_vn_proceed" class="" value="">OK</button>\
              <button class="confirm_cancel" value="">Cancel</button>\
           </div>\
           </fieldset>\
         </form>'
    );

    //Prepare the jquery-ui dialog. Set style options here.
    dialog.dialog({
        autoOpen: false,
        modal: true,
        width: 410,
        height: 220
    });

    $('button',dialog).button();

    $('#lease_vn_form',dialog).submit(function(){
        var ip = $('#add_lease_ip',this).val();
        var mac = $('#add_lease_mac',this).val();

        var obj = {ip: ip, mac: mac};

        if (!mac.length) { delete obj.mac; };

        Sunstone.runAction("Network.modifyleases",
                           $('#lease_vn_proceed',this).val(),
                           obj);
        $lease_vn_dialog.dialog('close');
        return false;
    });
}

function popUpAddLeaseDialog() {
    $lease_vn_dialog.dialog("option","title","Add lease");
    $('#add_lease_mac',$lease_vn_dialog).show();
    $('#add_lease_mac_label',$lease_vn_dialog).show();
    $('#lease_vn_proceed',$lease_vn_dialog).val("Network.addleases");
    $lease_vn_dialog.dialog("open");
}

function popUpRemoveLeaseDialog() {
    $lease_vn_dialog.dialog("option","title","Remove lease");
    $('#add_lease_mac',$lease_vn_dialog).hide();
    $('#add_lease_mac_label',$lease_vn_dialog).hide();
    $('#lease_vn_proceed',$lease_vn_dialog).val("Network.rmleases");
    $lease_vn_dialog.dialog("open");
}

function setVNetAutorefresh() {
    setInterval(function(){
        var checked = $('input:checked',dataTable_vNetworks.fnGetNodes());
        var filter = $("#datatable_vnetworks_filter input",
                       dataTable_vNetworks.parents("#datatable_vnetworks_wrapper")).attr("value");
        if (!checked.length && !filter.length){
            Sunstone.runAction("Network.autorefresh");
        }
    },INTERVAL+someTime());
}

//The DOM is ready and the ready() from sunstone.js
//has been executed at this point.
$(document).ready(function(){

    dataTable_vNetworks = $("#datatable_vnetworks",main_tabs_context).dataTable({
        "bJQueryUI": true,
        "bSortClasses": false,
        "bAutoWidth":false,
        "sPaginationType": "full_numbers",
        "aoColumnDefs": [
            { "bSortable": false, "aTargets": ["check"] },
            { "sWidth": "60px", "aTargets": [0,5,6,7,8] },
            { "sWidth": "35px", "aTargets": [1] },
            { "sWidth": "100px", "aTargets": [2,3] }
        ]
    });

    dataTable_vNetworks.fnClearTable();
    addElement([
        spinner,
        '','','','','','','',''],dataTable_vNetworks);
    Sunstone.runAction("Network.list");

    setupCreateVNetDialog();
    setupAddRemoveLeaseDialog();
    setVNetAutorefresh();

    initCheckAllBoxes(dataTable_vNetworks);
    tableCheckboxesListener(dataTable_vNetworks);
    vNetworkInfoListener();
});
