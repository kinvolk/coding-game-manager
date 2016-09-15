/* src/main.js
 *
 * Copyright (c) 2016 Endless Mobile Inc.
 * All Rights Reserved.
 *
 * This file is the file first run by the entrypoint to the coding-game-manager
 * package.
 */
pkg.initGettext();
pkg.initFormat();
pkg.require({
    Gdk: '3.0',
    GdkX11: '3.0',
    Gtk: '3.0',
    Gio: '2.0',
    GLib: '2.0',
});

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

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
    Children: ['artifact-icon-drawing-area', 'artifact-name', 'artifact-stage-number-label', 'artifact-points-label'],
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
        this.name_binding = new GObject.Binding({
            flags: GObject.BindingFlags.DEFAULT,
            source: this,
            source_property: 'name',
            target: this.artifact_name,
            target_property: 'label'
        });
        this.artifact_name.label = this.name;
        this.stage_binding = new GObject.Binding({
            flags: GObject.BindingFlags.DEFAULT,
            source: this,
            source_property: 'stage',
            target: this.artifact_stage_number_label,
            target_property: 'label'
        });
        this.artifact_stage_number_label.label = this.stage;
        this.points_binding = new GObject.Binding({
            flags: GObject.BindingFlags.DEFAULT,
            source: this,
            source_property: 'points',
            target: this.artifact_points_label,
            target_property: 'label'
        });
        this.artifact_points_label.label = this.points;
    }
});

const MOCK_BUBBLES = [
    {
        icon: 'music.png',
        name: 'Chopin_Ballad.mp3',
        stage: '1',
        points: '55'
    },
    {
        icon: 'camera.png',
        name: 'Poland_tree.jpg',
        stage: '1',
        points: '55'
    },
    {
        icon: 'video.png',
        name: 'Orchestra.mp4',
        stage: '1',
        points: '55'
    },
    {
        icon: 'document',
        name: 'Charade.doc',
        stage: '1',
        points: '55'
    },
    {
        icon: 'key.png',
        name: 'Key',
        stage: '1',
        points: '55'
    },
    {
        icon: 'video.png',
        name: 'Orchestra.mp4',
        stage: '1',
        points: '55'
    },
    {
        icon: 'document',
        name: 'Charade.doc',
        stage: '1',
        points: '55'
    },
    {
        icon: 'key.png',
        name: 'Key',
        stage: '1',
        points: '55'
    }
];

const CodingManagerMainWindow = new Lang.Class({
    Name: 'CodingManagerMainWindow',
    Extends: Gtk.ApplicationWindow,
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
    ],

    _init: function(params) {
        this.parent(params);
        MOCK_BUBBLES.forEach(Lang.bind(this, function(bubble_spec) {
            this.inventory_bubbles.pack_end(new CodingInventoryItemBubble(bubble_spec), false, false, 0);
        }));
        this.player_name.label = GLib.get_real_name();
        this.current_stage_number.label = '1';
        this.current_points.label = '541';
        this.current_task_label.label = 'Force Field';
        this.current_task_desc.label = "Your key is there for you, but watch out: you'll never reach it. Break the force field with some code in order to reach this key. Your key is there for you, but watch out: you'll never reach it!";
        this.current_task_hint.label = "Makes you think about the academy all the time";
        this.current_task_parts_completed.label = "4";
        this.current_task_parts_total.label = "15";
        this.current_task_progress.fraction = 4 / 15;
    },
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
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_("Coding Manager"));
        this.Visible = false;
    },

    vfunc_startup: function() {
        this.parent();

        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
        load_style_sheet('/com/endlessm/Coding/Manager/application.css');

        this._window = new CodingManagerMainWindow({
            application: this,
            type_hint: Gdk.WindowTypeHint.DOCK,
            role: SIDE_COMPONENT_ROLE
        });

        this._update_geometry();

        this._window.connect('notify::visible', Lang.bind(this, this._on_visibility_changed));

        /* NOTE: At least on VMWare, I'm noticing some bugs here where
         * monitors-changed is being fired when the work-area for the monitor
         * is still the old value and not then new value. We're racing with
         * the shell here because it also needs to update _NET_WORKAREA in
         * response to the monitor layout changing.
         *
         * I'm not sure what to do with this at the moment, so I've filed
         * https://bugzilla.gnome.org/show_bug.cgi?id=773195 . Perhaps the
         * best place to deal with this is in the window manager itself. */
        Gdk.Screen.get_default().connect('monitors-changed', Lang.bind(this, this._update_geometry));
        Wnck.Screen.get_default().connect('active-window-changed', Lang.bind(this, this._on_active_window_changed));
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(CodingManagerIface, this);
        this._dbusImpl.export(Gio.DBus.session, path);

        return this.parent(connection, path);
    },

    vfunc_activate: function() {
        /* This does nothing -we should only show when the shell asks us */
    },

    show: function(timestamp) {
        this._window.show();
        this._window.present_with_time(timestamp);
    },

    hide: function() {
        this._window.hide();
    },

    _on_visibility_changed: function() {
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            CODING_MANAGER_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        Gio.DBus.session.emit_signal(null,
                                     CODING_MANAGER_PATH,
                                     'org.freedesktop.DBus.Properties',
                                     'PropertiesChanged',
                                     propChangedVariant);
    },

    _on_active_window_changed: function() {
        let active_window = Wnck.Screen.get_default().get_active_window();
        let current_window = this._window.get_window();
        let active_window_xid = active_window ? active_window.get_xid() : 0;
        let current_window_xid = current_window ? current_window.get_xid() : 0;

        if (active_window_xid !== current_window_xid) {
            this.hide();
        }
    },

    _update_geometry: function() {
        let screen = Gdk.Screen.get_default();
        let monitor = Gdk.Screen.get_default().get_primary_monitor();
        let workarea = screen.get_monitor_workarea(monitor);

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.width - geometry.width;
        this._window.move(geometry.x, geometry.y);
        this._window.resize(geometry.width, geometry.height);
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new CodingManagerApplication()).run(argv);
}
