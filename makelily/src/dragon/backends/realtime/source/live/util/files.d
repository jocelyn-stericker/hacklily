/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.util.files;

import deimos.libmp3lame:
        lame_init, lame_set_num_channels, lame_set_in_samplerate, lame_set_out_samplerate,
        lame_set_brate, lame_set_mode, lame_set_quality, lame_init_params,
        lame_encode_buffer_ieee_float, lame_mp3_tags_fid, lame_close,
        
        MPEG_mode;
import deimos.mpg123:
        mpg123_handle,
        
        mpg123_close, mpg123_delete, mpg123_exit, mpg123_init, mpg123_new,
        
        mpg123_param, mpg123_parms, mpg123_open, mpg123_param_flags, mpg123_errors,
        mpg123_getformat, mpg123_enc_enum, mpg123_format_none, mpg123_format,
        mpg123_read;
import deimos.sndfile:
        SNDFILE,

        sf_open, sf_close, sf_readf_float, sf_writef_float,

        SF_FORMAT_PCM_U8, SF_FORMAT_PCM_S8, SF_FORMAT_PCM_16, SF_FORMAT_PCM_24,
        SF_FORMAT_PCM_32, SF_FORMAT_FLOAT, SF_FORMAT_DOUBLE, SF_INFO, SF_FORMAT_OGG,
        SF_FORMAT_VORBIS, SF_FORMAT_WAV, SF_FORMAT_AIFF, SF_FORMAT_AU, SF_FORMAT_RAW,
        SF_FORMAT_PAF, SF_FORMAT_SVX, SF_FORMAT_VOC, SF_FORMAT_W64, SF_FORMAT_MAT4,
        SF_FORMAT_MAT5, SF_FORMAT_CAF, SF_FORMAT_FLAC, SFM_READ, SFM_WRITE;
import std.exception: enforce;
import std.file: FileException;
import std.range: roundRobin, stride, popFront, array;
import std.stdio: File;
import std.string: lastIndexOf, toStringz, toLower;

import live.util.track: AudioTrack, secondStore;

class FormatException : Exception {
    this(string msg) {
        super(msg);
    }
}

enum Depth {
    PCM_U8 = SF_FORMAT_PCM_U8,
    PCM_S8 = SF_FORMAT_PCM_S8,
    PCM_16 = SF_FORMAT_PCM_16,
    PCM_24 = SF_FORMAT_PCM_24,
    PCM_32 = SF_FORMAT_PCM_32,
    FLOAT = SF_FORMAT_FLOAT,
    DOUBLE = SF_FORMAT_DOUBLE,
    NONE = 0x0000
};

/**
 * High-level wrapper for libsndfile (for everything but mp3) and lame
 * (for mp3).
 *
 * usage: track.saveAs("filename.wav", Depth.PCM_32);
 */
void saveAs(AudioTrack track, string filename, Depth d = Depth.PCM_24, int samplerate = 48000) {
    SF_INFO sfinfo;
    auto dotIdx = filename.lastIndexOf(".");

    enforce(track.length == 2,
        "TODO: currently only stereo tracks are supported.");
    enforce(track[0].length == track[1].length,
        "TODO: currently the length of both tracks must be the same.");

    enforce(dotIdx != -1,
        new FormatException("Your filename should have an extension."));

    string format = filename[dotIdx + 1 .. $].toLower();
    switch(format) {
        case "wav":
        case "wave":
            sfinfo.format = SF_FORMAT_WAV; break;
        case "aiff":
        case "aifc":
        case "aif":
            sfinfo.format = SF_FORMAT_AIFF; break;
        case "au":
        case "snd":
            sfinfo.format = SF_FORMAT_AU; break;
        case "raw":
        case "pcm":
            sfinfo.format = SF_FORMAT_RAW; break;
        case "paf":
            enforce(d != Depth.FLOAT && d != Depth.DOUBLE,
                new FormatException("PAF files must be PCM"));
            sfinfo.format = SF_FORMAT_PAF; break;
        case "svx":
        case "8svx":
        case "iff":
            enforce(d == Depth.PCM_S8 || d == Depth.PCM_16,
                new FormatException("SVX files must be signed 8 or "
                    "pcm 16"));
            sfinfo.format = SF_FORMAT_SVX; break;
        case "voc":
            enforce(d == Depth.PCM_16,
                new FormatException("VOC files must be pcm 16"));
            sfinfo.format = SF_FORMAT_VOC; break;
        case "w64":
            sfinfo.format = SF_FORMAT_W64; break;
        case "mat4":
            sfinfo.format = SF_FORMAT_MAT4; break;
        case "mat5":
            sfinfo.format = SF_FORMAT_MAT5; break;
        case "caf":
            sfinfo.format = SF_FORMAT_CAF; break;
        case "flac":
            enforce(d == Depth.PCM_S8 || d == Depth.PCM_16 ||
                    d == Depth.PCM_24,
                new FormatException("SVX files must be signed 8 or "
                    "pcm 16/24"));
            sfinfo.format = SF_FORMAT_FLAC; break;
        case "ogg":
        case "ogv":
        case "oga":
        case "ogx":
        case "spx":
        case "opus":
            d = Depth.NONE;
            sfinfo.format = SF_FORMAT_OGG | SF_FORMAT_VORBIS;
            break;
        case "mp3":
            saveAsMP3(track, filename, samplerate);
            return;
        default:
            throw new FormatException("Format is not one of: wav, ogg");
    }

    if (d == Depth.NONE) {
        enforce(sfinfo.format == (SF_FORMAT_OGG | SF_FORMAT_VORBIS),
            new FormatException("Only set depth as NONE for OGG "
                "and MP3 files"));
    }

    sfinfo.format |= d;

    sfinfo.samplerate = samplerate;
    sfinfo.channels = 2;

    SNDFILE* output = sf_open(filename.toStringz(), SFM_WRITE, &sfinfo);
    enforce(output,
        new FileException(filename, "Could not be opened for writting"));

    float[] zeros;
    zeros.length = sfinfo.samplerate * 2;
    zeros[] = 0.0;

    for (uint cursec = 0; cursec < track[0].length; ++cursec) {
        if (!track[0]) {
            enforce(!track[1], "TODO: tracks must either both "
                    "have data, or both be empty.");

            output.sf_writef_float(
                zeros.ptr,
                sfinfo.samplerate
            );
            continue;
        }
        output.sf_writef_float(
            roundRobin(track[0][cursec].payload, track[1][cursec].payload).array.ptr,
            sfinfo.samplerate
        );
        //auto a = roundRobin(track[0][cursec].payload, track[1][cursec].payload).array;
    }

    sf_close(output);
}

/**
 * Exports an mp3.
 * Use saveAs instead.
 */
private void saveAsMP3(AudioTrack track, string filename, int samplerate = 48000) {
    auto gfp = lame_init();

    gfp.lame_set_num_channels(2);
    gfp.lame_set_in_samplerate(samplerate);
    gfp.lame_set_out_samplerate(samplerate);
    gfp.lame_set_brate(128);
    gfp.lame_set_mode(MPEG_mode.STEREO);
    gfp.lame_set_quality(6); /* 2=high 5 = medium 7=low */ 

    auto status = gfp.lame_init_params();
    enforce(status >= 0,
        new FormatException("The encoder did not accept the given parameters"));

    float[] zeros;
    zeros.length = samplerate;
    zeros[] = 0.0;

    uint bufsize = cast(uint) (1.25*(cast(float) samplerate) + 7200)*2;
    ubyte[] buffer = new ubyte[bufsize];
    buffer[] = 0;

    auto f = File(filename, "w+b");

    for (uint cursec = 0; cursec < track[0].length; ++cursec) {
        if (!track[0]) {
            enforce(!track[1], "TODO: tracks must either both "
                    "have data, or both be empty.");

            gfp.lame_encode_buffer_ieee_float(
                zeros.ptr,
                zeros.ptr,
                samplerate,
                buffer.ptr,
                bufsize);
            continue;
        }

        auto size = gfp.lame_encode_buffer_ieee_float(
            track[0][cursec].payload.ptr,
            track[1][cursec].payload.ptr,
            samplerate,
            buffer.ptr,
            bufsize);
        buffer.length = size;
        f.rawWrite(buffer);
        buffer.length = bufsize;
        //gfp.lame_encode_flush(buffer.ptr, b);
    }
    gfp.lame_mp3_tags_fid(cast(void*) f.getFP());

    gfp.lame_close();
}

/**
 * High-level wrapper for libsndfile (for everything but mp3) and mpg123
 * (for mp3).
 *
 * usage: track.open("filename.wav");
 */
void open_(ref AudioTrack track, string filename) {
    auto dotIdx = filename.lastIndexOf(".");

    string format = filename[dotIdx + 1 .. $].toLower();
    if (format == "mp3") {
        track.openMP3(filename);
        return;
    }

    SF_INFO sfinfo;

    SNDFILE* input = sf_open(filename.toStringz(), SFM_READ, &sfinfo);
    enforce(input,
        new FileException(filename, "Could not be opened for reading"));

    float[] buffer;
    buffer.length = sfinfo.samplerate * 2;
    buffer[] = 0.0;

    enforce(sfinfo.samplerate == 48000, "soxr-lsr not integrated yet!");

    for (uint cursec = 0; true; ++cursec) {
        foreach(int i; 0..2) {
            if (track[i].length <= cursec) {
                track[i].length = cursec + 1;
            }
            if (!track[i][cursec]) {
                track[i][cursec] = secondStore.get();
            }
        }
        auto size = input.sf_readf_float(
            buffer.ptr,
            sfinfo.samplerate
        );
        if (!size) {
            break;
        }
        track[0][cursec].payload[] = stride(buffer, 2).array[];
        buffer.popFront();
        buffer ~= 0.0;
        track[1][cursec].payload[] = stride(buffer, 2).array[];
        //roundRobin(track[0][cursec].payload, track[1][cursec].payload).array.ptr,
    }

    sf_close(input);
}

void cleanup(mpg123_handle *mh) {
    /* It's really to late for error checks here;-) */
    mpg123_close(mh);
    mpg123_delete(mh);
    mpg123_exit();
}
/**
 * Imports an mp3.
 * Use open instead.
 */
private void openMP3(AudioTrack track, string filename, int samplerate = 48000) {
    auto err = mpg123_init();
    mpg123_handle* mh = mpg123_new(null, &err);
    mh.mpg123_param(mpg123_parms.MPG123_ADD_FLAGS, mpg123_param_flags.MPG123_FORCE_FLOAT, 0.0);
    if (mh.mpg123_open(filename.toStringz()) != mpg123_errors.MPG123_OK) {
        throw new FormatException("Could not open file.");
    }

    int  channels = 0, encoding = 0;
    long rate = 0;

    mh.mpg123_getformat(&rate, &channels, &encoding);
    if (encoding != mpg123_enc_enum.MPG123_ENC_SIGNED_16 &&
            encoding != mpg123_enc_enum.MPG123_ENC_FLOAT_32) {
        mh.cleanup();
        throw new FormatException("Bad encoding.");
    }

    mh.mpg123_format_none();
    mh.mpg123_format(rate, channels, encoding);

    ptrdiff_t bufferSize = samplerate*float.sizeof*2;
    auto buffer = new float[bufferSize/float.sizeof];

    for (uint cursec = 0; true; ++cursec) {
        foreach(int i; 0..2) {
            if (track[i].length <= cursec) {
                track[i].length = cursec + 1;
            }
            if (!track[i][cursec]) {
                track[i][cursec] = secondStore.get();
            }
        }
        size_t read;
        err = mh.mpg123_read(cast(char*) buffer, bufferSize, &read);
        if (!read) {
            break;
        }
        track[0][cursec].payload[] = stride(buffer, 2).array[];
        buffer.popFront();
        buffer ~= 0.0;
        track[1][cursec].payload[] = stride(buffer, 2).array[];
        //roundRobin(track[0][cursec].payload, track[1][cursec].payload).array.ptr,
    }
}
