/*
** Copyright (C) 2001-2011 Erik de Castro Lopo <erikd@mega-nerd.com>
**
** All rights reserved.
**
** Redistribution and use in source and binary forms, with or without
** modification, are permitted provided that the following conditions are
** met:
**
**     * Redistributions of source code must retain the above copyright
**       notice, this list of conditions and the following disclaimer.
**     * Redistributions in binary form must reproduce the above copyright
**       notice, this list of conditions and the following disclaimer in
**       the documentation and/or other materials provided with the
**       distribution.
**     * Neither the author nor the names of any contributors may be used
**       to endorse or promote products derived from this software without
**       specific prior written permission.
**
** THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
** "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
** TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
** PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
** CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
** EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
** PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
** OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
** WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
** OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
** ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
import std.stdio, core.stdc.string, std.string : toStringz;

/* Include this header file to use functions from libsndfile. */
import deimos.sndfile;

/*    This will be the length of the buffer used to hold.frames while
**    we process them.
*/
enum		BUFFER_LEN	= 1024;

/* libsndfile can handle more than 6 channels but we'll restrict it to 6. */
enum		MAX_CHANNELS =	6;

/* Function prototype. */
void process_data (double *data, int count, int channels) ;


int
main ()
{   /* This is a buffer of double precision floating point values
    ** which will hold our data while we process it.
    */
    static double data [BUFFER_LEN] ;

    /* A SNDFILE is very much like a FILE in the Standard C library. The
    ** sf_open function return an SNDFILE* pointer when they sucessfully
	** open the specified file.
    */
    SNDFILE*      infile, outfile ;

    /* A pointer to an SF_INFO stutct is passed to sf_open.
    ** On read, the library fills this struct with information about the file.
    ** On write, the struct must be filled in before calling sf_open.
    */
    SF_INFO		sfinfo ;
    sf_count_t		readcount ;
    auto infilename = "input.wav" ;
    auto outfilename = "output.wav" ;

    /* Here's where we open the input file. We pass sf_open the file name and
    ** a pointer to an SF_INFO struct.
    ** On successful open, sf_open returns a SNDFILE* pointer which is used
    ** for all subsequent operations on that file.
    ** If an error occurs during sf_open, the function returns a NULL pointer.
	**
	** If you are trying to open a raw headerless file you will need to set the
	** format and channels fields of sfinfo before calling sf_open(). For
	** instance to open a raw 16 bit stereo PCM file you would need the following
	** two lines:
	**
	**		sfinfo.format   = SF_FORMAT_RAW | SF_FORMAT_PCM_16 ;
	**		sfinfo.channels = 2 ;
    */
    infile = sf_open (toStringz(infilename), SFM_READ, &sfinfo);
    if (! infile)
    {   /* Open failed so print an error message. */
        writefln ("Not able to open input file %s.", infilename) ;
        /* Print the error message from libsndfile. */
        auto serr = sf_strerror (null);
        writeln(serr[0 .. strlen(serr)]);
        return  1 ;
        } ;

    if (sfinfo.channels > MAX_CHANNELS)
    {   writefln ("Not able to process more than %d channels", MAX_CHANNELS) ;
        return  1 ;
        } ;
    /* Open the output file. */
    outfile = sf_open (toStringz(outfilename), SFM_WRITE, &sfinfo);
    if (! outfile)
    {   writefln ("Not able to open output file %s.\n", outfilename) ;
        auto serr = sf_strerror (null);
        writeln(serr[0 .. strlen(serr)]);
        return  1 ;
        } ;

    /* While there are.frames in the input file, read them, process
    ** them and write them to the output file.
    */
    while ((readcount = sf_read_double (infile, data.ptr, BUFFER_LEN)) > 0)
    {   process_data (data.ptr, readcount, sfinfo.channels) ;
        sf_write_double (outfile, data.ptr, readcount) ;
        } ;

    /* Close input and output files. */
    sf_close (infile) ;
    sf_close (outfile) ;

    return 0 ;
} /* main */

void
process_data (double *data, sf_count_t count, int channels)
{	static immutable double[MAX_CHANNELS] channel_gain = [ 0.5, 0.8, 0.1, 0.4, 0.4, 0.9 ] ;
    int k, chan ;

    /* Process the data here.
    ** If the soundfile contains more then 1 channel you need to take care of
    ** the data interleaving youself.
    ** Current we just apply a channel dependant gain.
    */

    for (chan = 0 ; chan < channels ; chan ++)
        for (k = chan ; k < count ; k+= channels)
            data [k] *= channel_gain [chan] ;

    return ;
} /* process_data */
