/*
** Copyright (C) 1999-2011 Erik de Castro Lopo <erikd@mega-nerd.com>
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
import std.stdio, std.math, core.stdc.stdlib, core.stdc.string, std.string : toStringz;

enum		SAMPLE_RATE =			44100;
enum		SAMPLE_COUNT =		(SAMPLE_RATE * 4);	/* 4 seconds */
enum		AMPLITUDE =			(1.0 * 0x7F000000);
enum		LEFT_FREQ =			(344.0 / SAMPLE_RATE);
enum		RIGHT_FREQ =			(466.0 / SAMPLE_RATE);

int main()
{	SNDFILE	*file ;
	SF_INFO	sfinfo ;
	int		k ;
	int	*buffer ;

        buffer = cast(int*) malloc (2 * SAMPLE_COUNT * int.sizeof);
	if (! buffer)
	{	writeln ("Malloc failed.") ;
		return 1;
		} ;

	sfinfo.samplerate	= SAMPLE_RATE ;
	sfinfo.frames		= SAMPLE_COUNT ;
	sfinfo.channels		= 2 ;
	sfinfo.format		= (SF_FORMAT_WAV | SF_FORMAT_PCM_24) ;

        file = sf_open ("sine.wav", SFM_WRITE, &sfinfo);
	if (! file)
	{	writeln ("Error : Not able to open output file.") ;
		return 1 ;
		} ;

	if (sfinfo.channels == 1)
	{	for (k = 0 ; k < SAMPLE_COUNT ; k++)
			buffer [k] = cast(int) (AMPLITUDE * sin (LEFT_FREQ * 2 * k * PI)) ;
		}
	else if (sfinfo.channels == 2)
	{	for (k = 0 ; k < SAMPLE_COUNT ; k++)
            {	buffer [2 * k] = cast(int) (AMPLITUDE * sin (LEFT_FREQ * 2 * k * PI)) ;
		buffer [2 * k + 1] = cast(int) (AMPLITUDE * sin (RIGHT_FREQ * 2 * k * PI)) ;
			} ;
		}
	else
	{	writeln ("makesine can only generate mono or stereo files.") ;
		return 1 ;
		} ;

	if (sf_write_int (file, buffer, sfinfo.channels * SAMPLE_COUNT) !=
											sfinfo.channels * SAMPLE_COUNT)
        {
		auto serr = sf_strerror (file);
                throw new Exception(serr[0 .. strlen(serr)].idup);
        }

	sf_close (file) ;
	return	 0 ;
} /* main */

