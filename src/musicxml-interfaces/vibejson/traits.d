/**
    Extensions to `std.traits` module of Phobos. Some may eventually make it into Phobos,
    some are dirty hacks that work only for vibe.d

    Copyright: © 2012 RejectedSoftware e.K.
    License: Subject to the terms of the MIT license, as written in the included LICENSE.txt file.
    Authors: Sönke Ludwig, Михаил Страшун
*/

module vibejson.traits;

/**
    Checks if given type is a getter function type

    Returns: `true` if argument is a getter
 */
template isPropertyGetter(T...)
    if (T.length == 1)
{
    import std.traits : functionAttributes, FunctionAttribute, ReturnType,
        isSomeFunction;
    static if (isSomeFunction!(T[0])) {
        enum isPropertyGetter = 
            (functionAttributes!(T[0]) & FunctionAttribute.property) != 0
            && !is(ReturnType!T == void);
    }
    else
        enum isPropertyGetter = false;
}

/**
    Checks if given type is a setter function type

    Returns: `true` if argument is a setter
 */
template isPropertySetter(T...)
    if (T.length == 1)
{
    import std.traits : functionAttributes, FunctionAttribute, ReturnType,
        isSomeFunction;

    static if (isSomeFunction!(T[0])) {
        enum isPropertySetter = 
            (functionAttributes!(T) & FunctionAttribute.property) != 0
            && is(ReturnType!(T[0]) == void);
    }
    else
        enum isPropertySetter = false;
}

/**
    Deduces single base interface for a type. Multiple interfaces
    will result in compile-time error.

    Params:
        T = interface or class type

    Returns:
        T if it is an interface. If T is a class, interface it implements.
*/
template baseInterface(T)
    if (is(T == interface) || is(T == class))
{
    import std.traits : InterfacesTuple;

    static if (is(T == interface)) {
        alias baseInterface = T;
    }
    else
    {
        alias Ifaces = InterfacesTuple!T;
        static assert (
            Ifaces.length == 1,
            "Type must be either provided as an interface or implement only one interface"
        );
        alias baseInterface = Ifaces[0];
    }
}
