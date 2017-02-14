const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

let _filename = "mylog.log";
let _logstack = [];

function _dolog(str) {
    try {
        let home = GLib.getenv('HOME');
        let logfilepath = GLib.build_filenamev([home, _filename]);
        let logfile = Gio.File.new_for_path(logfilepath);
        let stream = logfile.append_to(Gio.FileCreateFlags.NONE, null);

        stream.write_all(str + "\n", null);
        stream.close(null);
    } catch (e) {
        log('Failed to do the file-based log: ' + e.toString());
        log(str);
    }
}

function _indented(i, str) {
    let space = Array(i + 1).join('  ');
    _dolog(space + str)
}

function file(filename) {
    _filename = filename;
}

function start(str) {
    _indented(_logstack.length, str + ' start');
    _logstack.push(str);
}

function more(str) {
    _indented(_logstack.length, str);
}

function done() {
    let str = _logstack.pop();
    if (str === undefined) {
        _dolog('YOU FAIL AT LOGGING');
    } else {
        _indented(_logstack.length, str + ' done');
    }
}
