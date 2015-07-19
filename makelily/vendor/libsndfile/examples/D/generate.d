/*
** Copyright (C) 2002-2011 Erik de Castro Lopo <erikd@mega-nerd.com>
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
import deimos.sndfile;
import std.stdio, core.stdc.string, std.string : toStringz;

enum	BUFFER_LEN =			4096;

int main (string[] args)
{
	if (args.length != 2)
	{	write ("\nEncode a single input file into a number of different output ") ;
		write ("encodings. These output encodings can then be moved to another ") ;
		write ("OS for testing.\n") ;
		write ("    Usage : generate <filename>\n") ;
		return 1;
		} ;

	/* A couple of standard WAV files. Make sure Win32 plays these. */
	encode_file (args [1], "pcmu8.wav"	, SF_FORMAT_WAV | SF_FORMAT_PCM_U8) ;
	encode_file (args [1], "pcm16.wav"	, SF_FORMAT_WAV | SF_FORMAT_PCM_16) ;
	encode_file (args [1], "imaadpcm.wav", SF_FORMAT_WAV | SF_FORMAT_MS_ADPCM) ;
	encode_file (args [1], "msadpcm.wav", SF_FORMAT_WAV | SF_FORMAT_IMA_ADPCM) ;
	encode_file (args [1], "gsm610.wav"	, SF_FORMAT_WAV | SF_FORMAT_GSM610) ;

	/* Soundforge W64. */
	encode_file (args [1], "pcmu8.w64"	, SF_FORMAT_W64 | SF_FORMAT_PCM_U8) ;
	encode_file (args [1], "pcm16.w64"	, SF_FORMAT_W64 | SF_FORMAT_PCM_16) ;
	encode_file (args [1], "imaadpcm.w64", SF_FORMAT_W64 | SF_FORMAT_MS_ADPCM) ;
	encode_file (args [1], "msadpcm.w64", SF_FORMAT_W64 | SF_FORMAT_IMA_ADPCM) ;
	encode_file (args [1], "gsm610.w64"	, SF_FORMAT_W64 | SF_FORMAT_GSM610) ;

	return 0 ;
} /* main */

/*============================================================================================
**	Helper functions and macros.
*/

void PUT_DOTS(size_t k)
{
    while (k--)
        write ('.') ;
    write (' ') ;
}

/*========================================================================================
*/

void
encode_file (string infilename, string outfilename, int filetype)
{	static float buffer [BUFFER_LEN] ;

	SNDFILE*	infile, outfile ;
	SF_INFO		sfinfo ;
	sf_count_t	readcount ;
        size_t		k;

	writef ("    %s -> %s ", infilename, outfilename) ;
	stdout.flush() ;

	k = 16 - outfilename.length ;
	PUT_DOTS (k) ;

        infile = sf_open (toStringz(infilename), SFM_READ, &sfinfo);
	if (!infile)
	{	writefln ("Error : could not open file : %s", infilename) ;
            	auto serr = sf_strerror (null);
		throw new Exception(serr[0 .. strlen(serr)].idup);
		}

	sfinfo.format = filetype ;

	if (! sf_format_check (&sfinfo))
	{	sf_close (infile) ;
		writeln ("Invalid encoding") ;
		return ;
		} ;

        outfile = sf_open (toStringz(outfilename), SFM_WRITE, &sfinfo);
	if (!outfile)
	{	writefln ("Error : could not open file : %s", outfilename) ;
            	auto serr = sf_strerror (null);
		throw new Exception(serr[0 .. strlen(serr)].idup);
		} ;

	while ((readcount = sf_read_float (infile, buffer.ptr, BUFFER_LEN)) > 0)
		sf_write_float (outfile, buffer.ptr, readcount) ;

	sf_close (infile) ;
	sf_close (outfile) ;

	writeln ("ok") ;

	return ;
} /* encode_file */
