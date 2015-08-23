/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.receivecommands;

import std.algorithm.iteration: filter;
import std.array: array;
import std.conv: to;
import std.json: JSONValue;

export struct ReceivePoke {
}

export struct ReceiveInvalidRequest {
    string explanation;
}

export struct ReceiveConnectionReceipt {
    int fromId;
    int fromChannel;
    int toId;
    int toChannel;

    JSONValue serialize() const {
        return JSONValue([
            "from": fromId.to!JSONValue,
            "to": toId.to!JSONValue,
            "fromChannel": fromChannel.to!JSONValue,
            "toChannel": toChannel.to!JSONValue,
        ]);
    }
}

export struct ReceiveDisconnectionReceipt {
    int fromId;
    int fromChannel;
    int toId;
    int toChannel;

    ReceiveConnectionReceipt[] apply(ReceiveConnectionReceipt[] activeReceipts) {
        return activeReceipts.filter!(delegate(receipt) {
            return receipt.fromId != fromId || receipt.fromChannel != fromChannel ||
                receipt.toId != toId || receipt.toChannel != toChannel;
        }).array;
    }
}

export struct ReceiveUIThreadMsg {
    int effectId;
    string msg;
}
