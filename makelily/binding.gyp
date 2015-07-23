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
                "/usr/local/lib/libphobos2.a",
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
                }
            ]
        }
    ]
}
