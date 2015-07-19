{
    "targets": [
        {
            "target_name": "dragon",
            "dependencies": ["dragon-dlang"],
            "sources": [ "source/terabithia/bridge.cc" ],
            "include_dirs" : [
                "<!(node -e \"require('nan')\")"
            ],
            "libraries": [
                "./libdragon.a",
                "-L/usr/local/lib",
                "-lphobos2",
                "-lportaudio",
                "-lportmidi",
                "-lsndfile",
                "-lmpg123",
                "-lfluidsynth",
                "-lmp3lame"
            ],
        },
        {
            "target_name": "dragon-dlang",
            "type": "none",
            "actions": [
                {
                    "action_name": "build_dragon_dlang",
                    "message": "Building Dragon (dlang)...",
                    "inputs": ["./source/**.d"],
                    "outputs": ["build/libdragon.a"],
                    "action": ["dub", "build", "--force"],
                },
                {
                    "action_name": "update_bridge_cc",
                    "message": "Updating bridge.cc...",
                    "inputs": ["./source/**.d"],
                    "outputs": ["./source/terabithia/bridge.cc"],
                    "action": ["node", "-e", "\"require('touch')('./source/terabithia/bridge.cc')\""],
                }
            ]
        }
    ]
}
