// src/main.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file is the file first run by the entrypoint to the coding-game-manager
// package.
pkg.initGettext();
pkg.initFormat();
pkg.require({
    Gdk: '3.0',
    GdkX11: '3.0',
    Gtk: '3.0',
    Gio: '2.0',
    GLib: '2.0',
});

const CodingGameService = imports.gi.CodingGameService
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

const MyLog = imports.mylog;

MyLog.file('cgm.log');

const CODING_MANAGER_NAME = 'com.endlessm.Coding.Manager';
const CODING_MANAGER_PATH = '/com/endlessm/Coding/Manager';
const CODING_MANAGER_IFACE = 'com.endlessm.Coding.Manager';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const CodingManagerIface = '<node><interface name="' + CODING_MANAGER_NAME + '">' +
  '<method name="show">' +
    '<arg type="u" direction="in" name="timestamp"/>' +
  '</method>' +
  '<method name="hide">' +
    '<arg type="u" direction="in" name="timestamp"/>' +
  '</method>' +
  '<property name="Visible" type="b" access="read"/>' +
'</interface></node>';

const CodingInventoryItemBubble = new Lang.Class({
    Name: 'CodingInventoryItemBubble',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/Coding/Manager/inventory-bubble.ui',
    Children: ['artifact-icon-image', 'artifact-name', 'artifact-stage-number-label', 'artifact-points-label'],
    Properties: {
        icon: GObject.ParamSpec.string('icon',
                                       '',
                                       '',
                                       GObject.ParamFlags.READWRITE |
                                       GObject.ParamFlags.CONSTRUCT_ONLY,
                                       ''),
        name: GObject.ParamSpec.string('name',
                                       '',
                                       '',
                                       GObject.ParamFlags.READWRITE |
                                       GObject.ParamFlags.CONSTRUCT_ONLY,
                                       ''),
        stage: GObject.ParamSpec.string('stage',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        points: GObject.ParamSpec.string('points',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         '')
    },

    _init: function(params) {
        this.parent(params);
        this.bind_property('name', this.artifact_name, 'label', GObject.BindingFlags.SYNC_CREATE);
        this.bind_property('stage', this.artifact_stage_number_label, 'label', GObject.BindingFlags.SYNC_CREATE);
        this.bind_property('points', this.artifact_points_label, 'label', GObject.BindingFlags.SYNC_CREATE);
        this.bind_property('icon', this.artifact_icon_image, 'icon-name', GObject.BindingFlags.SYNC_CREATE);
    }
});

const CodingManagerMainWindow = new Lang.Class({
    Name: 'CodingManagerMainWindow',
    Extends: Gtk.ApplicationWindow,
    Properties: {
        service: GObject.ParamSpec.object('service',
                                          'A CodingGameService.CodingGameServiceProxy',
                                          'A CodingGameService.CodingGameServiceProxy to retrieve state information from',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          CodingGameService.CodingGameServiceProxy)
    },
    Template: 'resource:///com/endlessm/Coding/Manager/main.ui',
    Children: [
        'inventory-bubbles',
        'player-name',
        'player-avatar',
        'stage-avatar',
        'current-stage-number',
        'points-avatar',
        'current-points',
        'current-task-label',
        'current-task-reward',
        'current-task-desc',
        'current-task-hint',
        'current-task-parts-completed',
        'current-task-parts-total',
        'current-task-progress',
        'reset-button'
    ],

    _init: function(params) {
        this.parent(params);
        this.player_name.label = GLib.get_real_name();
        this._updateCurrentMission();
        this._updateEarnedArtifacts();

        // Bind properties so that they automatically update when the game service
        // state changes
        this.service.bind_property('current-mission-name',
                                   this.current_task_label,
                                   'label',
                                   GObject.BindingFlags.SYNC_CREATE);
        this.service.bind_property('current-mission-stage-num',
                                   this.current_stage_number,
                                   'label',
                                   GObject.BindingFlags.SYNC_CREATE);
        this.service.bind_property('current-mission-desc',
                                   this.current_task_desc,
                                   'label',
                                   GObject.BindingFlags.SYNC_CREATE);
        this.service.bind_property('current-mission-hint',
                                   this.current_task_hint,
                                   'label',
                                   GObject.BindingFlags.SYNC_CREATE);
        this.service.bind_property('current-mission-points',
                                   this.current_points,
                                   'label',
                                   GObject.BindingFlags.SYNC_CREATE);

        // We don't use GBinding for the below since we have to bind two properties
        // to each (the progress bar and the label)
        this.service.connect('notify::current-mission-num-tasks', Lang.bind(this, this._updateCurrentMission));
        this.service.connect('notify::current-mission-num-tasks-available', Lang.bind(this, this._updateCurrentMission));

        // When a new artifact comes in, we will need to empty the artifacts
        // container and add the new one
        this.service.connect('notify::earned-artifacts', Lang.bind(this, this._updateEarnedArtifacts));

        // When the user presses the reset button, tell the game service to drop all
        // of its state and restart the game
        this.reset_button.connect('clicked', Lang.bind(this, function() {
            // We just call this async and ignore the return value. There isn't a whole lot
            // we can do if this fails - the error will be logged by coding-game-service
            // anyway and the best that we can do is log it again.
            this.service.call_reset_game(null, null);
        }));
    },

    _updateEarnedArtifacts: function() {
        // Remove all children first
        this.inventory_bubbles.get_children().forEach(Lang.bind(this, function(child) {
            child.destroy();
        }));

        // Create new bubbles for everything
        this.service.earned_artifacts.deep_unpack().forEach(Lang.bind(this, function(artifact) {
            this.inventory_bubbles.add(new CodingInventoryItemBubble({
                // The annotation for get_string() makes it return an array
                // of both the string and the corresponding length
                icon: artifact.icon.get_string()[0],
                name: artifact.desc.get_string()[0],
                points: artifact.points.get_string()[0],
                stage: artifact.stage.get_string()[0]
            }));
        }));
    },

    _updateCurrentMission: function() {
        this.current_task_progress.fraction = (this.service.current_mission_num_tasks /
                                               this.service.current_mission_num_tasks_available);
        this.current_task_parts_completed.label = String(this.service.current_mission_num_tasks);
        this.current_task_parts_total.label = String(this.service.current_mission_num_tasks_available);
    }
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

const CodingManagerApplication = new Lang.Class({
    Name: 'CodingManagerApplication',
    Extends: Gtk.Application,

    _init: function() {
        MyLog.start('app init');
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_("Coding Manager"));
        this.Visible = false;
        this._changedSignalId = 0;
        MyLog.done();
    },

    vfunc_startup: function() {
        MyLog.start('app startup');
        this.parent();

        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
        load_style_sheet('/com/endlessm/Coding/Manager/application.css');

        this._service = CodingGameService.CodingGameServiceProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            0,
            'com.endlessm.CodingGameService.Service',
            '/com/endlessm/CodingGameService/Service',
            null);
        this._window = new CodingManagerMainWindow({
            application: this,
            type_hint: Gdk.WindowTypeHint.DOCK,
            role: SIDE_COMPONENT_ROLE,
            service: this._service
        });

        this._window.connect('notify::visible', Lang.bind(this, this._on_visibility_changed));
        // There seems to be a race condition with the WM that can
        // lead the sidebar into an inconsistent state if the
        // _on_active_window_changed callback gets executed in such a
        // way that ends up calling to hide() between the user pressed
        // the tray button and the sidebar has been made visible,
        // which can lead to the sidebar never been displayed.
        this._window.connect('map-event', Lang.bind(this, function() {
            MyLog.start('window just got mapped');
            if (!this._changedSignalId) {
                MyLog.more('connecting to wnck');
                this._changedSignalId = Wnck.Screen.get_default().connect('active-window-changed', Lang.bind(this, this._on_active_window_changed));
            }
            MyLog.done();
            return false;
        }));
        this._window.connect('unmap', Lang.bind(this, function() {
            MyLog.start('window is about to be unmapped');
            if (this._changedSignalId) {
                MyLog.more('disconnecting from wnck');
                Wnck.Screen.get_default().disconnect(this._changedSignalId);
                this._changedSignalId = 0;
            }
            MyLog.done();
        }));
        this._window.connect('state-flags-changed', Lang.bind(this, function() {
            MyLog.start('window state flags has changed');
            if (this.Visible) {
                MyLog.more('window is visible');
            } else {
                MyLog.more('window is hidden');
            }
            MyLog.done();
        }));

        // update position when workarea changes
        let display = Gdk.Display.get_default();
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        let monitor = display.get_primary_monitor();
        monitor.connect('notify::workarea', Lang.bind(this,
                                                      this._update_geometry));
        this._update_geometry();

        MyLog.done();
    },

    vfunc_dbus_register: function(connection, path) {
        MyLog.start('app dbus register');
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(CodingManagerIface, this);
        this._dbusImpl.export(Gio.DBus.session, path);

        let parent = this.parent(connection, path)
        MyLog.done();
        return parent;
    },

    vfunc_activate: function() {
        MyLog.start('app activate');
        // This does nothing -we should only show when the shell asks us
        MyLog.done();
    },

    show: function(timestamp) {
        MyLog.start('app show');
        this._window.show();
        MyLog.more('timestamp: ' + timestamp);
        this._window.present_with_time(timestamp);
        MyLog.done();
    },

    hide: function() {
        MyLog.start('app hide');
        this._window.hide();
        MyLog.done();
    },

    _on_visibility_changed: function() {
        MyLog.start('app on visibility changed');
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            CODING_MANAGER_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        MyLog.more('visible: ' + this.Visible);
        Gio.DBus.session.emit_signal(null,
                                     CODING_MANAGER_PATH,
                                     'org.freedesktop.DBus.Properties',
                                     'PropertiesChanged',
                                     propChangedVariant);
        MyLog.done();
    },

    _on_active_window_changed: function() {
        MyLog.start('app on active window changed');
        let active_window = Wnck.Screen.get_default().get_active_window();
        let current_window = this._window.get_window();
        let active_window_xid = active_window ? active_window.get_xid() : 0;
        let current_window_xid = current_window ? current_window.get_xid() : 0;

        MyLog.more('active window xid: ' + active_window_xid);
        MyLog.more('current window xid: ' + current_window_xid);

        if (active_window !== null) {
            // try to match transient windows
            let transient_window = active_window.get_transient();

            MyLog.more('transient window xid: ' + ((transient_window !== null) ? transient_window.get_xid(), 0));
            if (transient_window !== null &&
                current_window_xid === transient_window.get_xid()) {
                MyLog.done();
                return;
            }
        }

        if (active_window_xid !== current_window_xid) {
            MyLog.more('hiding self');
            this.hide();
        }
        MyLog.done();
    },

    _update_geometry: function() {
        MyLog.start('app update geometry');
        let monitor = Gdk.Display.get_default().get_primary_monitor();
        let workarea = monitor.get_workarea();

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.width - geometry.width;
        MyLog.more('x: ' + geometry.x + ', y: ' + geometry.y + ', width: ' + geometry.width + ', height: ' + geometry.height);
        this._window.move(geometry.x, geometry.y);
        this._window.resize(geometry.width, geometry.height);
        MyLog.done();
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new CodingManagerApplication()).run(argv);
}
