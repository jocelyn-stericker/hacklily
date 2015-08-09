#include <iostream>
#include <stdio.h>
#include <nan.h>

#define QUIT_CMD -1

using v8::Function;
using v8::FunctionTemplate;
using v8::Handle;
using v8::Number;
using v8::Object;
using v8::String;

extern "C" {
    int dragon_receive(const char** ptr);
    int dragon_send(const char* commandPtr, int commandLen, const char* jsonPtr, int jsonLen);
    int dragon_quit();
    int dragon_poke();
    int dragon_init();
}

class DragonMsgReceiver: public NanAsyncProgressWorker {
public:
    DragonMsgReceiver(NanCallback *callback, NanCallback *progress)
        : NanAsyncProgressWorker(callback), progress(progress)
    {
    }

    ~DragonMsgReceiver() {
    }

    void Execute(const NanAsyncProgressWorker::ExecutionProgress& progress) {
        while (true) {
            const char* msg;
            int len = dragon_receive(&msg);
            if (len == QUIT_CMD) {
                break;
            }
            progress.Send(msg, len);
        }
    }

    void HandleProgressCallback(const char *data, size_t len) {
        NanScope();

        v8::Local<v8::Value> argv[] = {
            NanNew<v8::String>(data, len)
        };
        progress->Call(1, argv);
    }

private:
    NanCallback *progress;
};

NAN_METHOD(onStateChange) {
    NanScope();
    NanCallback *callback = new NanCallback(args[0].As<Function>());
    NanAsyncQueueWorker(new DragonMsgReceiver(callback, callback));
    NanReturnUndefined();
}

NAN_METHOD(sendCommand) {
    NanScope();
    NanUtf8String param1(args[0]->ToString());
    NanUtf8String param2(args[1]->ToString());
    int token = dragon_send(*param1, param1.length(), *param2, param2.length());
    NanReturnValue(NanNew<Number>(token));
}

NAN_METHOD(quit) {
    NanScope();
    if (!dragon_quit()) {
        std::cerr << "[bridge.cc] Could not stop dragon runtime.\n";
    }
    NanReturnUndefined();
}

NAN_METHOD(poke) {
    NanScope();
    if (!dragon_poke()) {
        std::cerr << "[bridge.cc] Could not poke dragon.\n";
    }
    NanReturnUndefined();
}

void InitAll(Handle<Object> exports) {
    if (!dragon_init()) {
        std::cerr << "[bridge.cc] Could not initialize dragon runtime.\n";
    }

    exports->Set(NanNew<String>("onStateChange"),
            NanNew<FunctionTemplate>(onStateChange)->GetFunction());

    exports->Set(NanNew<String>("sendCommand"),
            NanNew<FunctionTemplate>(sendCommand)->GetFunction());

    exports->Set(NanNew<String>("quit"),
            NanNew<FunctionTemplate>(quit)->GetFunction());

    exports->Set(NanNew<String>("poke"),
            NanNew<FunctionTemplate>(poke)->GetFunction());
}

NODE_MODULE(NativeExtension, InitAll)
