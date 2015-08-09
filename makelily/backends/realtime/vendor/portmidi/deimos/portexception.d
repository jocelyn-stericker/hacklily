/+
 +           Copyright Andrej Mitrovic 2011.
 +  Distributed under the Boost Software License, Version 1.0.
 +     (See accompanying file LICENSE_1_0.txt or copy at
 +           http://www.boost.org/LICENSE_1_0.txt)
 +/

module portmidi.exception;

import std.exception;
import std.conv : to;

import live.engine.portmidi;

/+ 
 + Exception which retrieves an error message when throw.
 + 
 + Usage:
 + auto error = PmFunction();
 + enforce(error >= PmErrorCode.pmNoError, new PortmidiException(error));
 +/
class PortmidiException : Exception
{
    this(int error)
    {
        super(to!string(Pm_GetErrorText(error)));
    }
    
    this(string msg)
    {
        super(msg);
    }
}

