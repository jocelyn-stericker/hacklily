#include <iostream>
#include <stdio.h>
#include <nan.h>

#define QUIT_CMD -1

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;

extern "C" {
    int dragon_receive(const char** ptr);
    void dragon_send(const char* commandPtr, int commandLen, const char* jsonPtr, int jsonLen);
    void dragon_quit();
    void dragon_poke();
    void dragon_init();
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
    NanCallback *callback = new NanCallback(args[0].As<v8::Function>());
    NanAsyncQueueWorker(new DragonMsgReceiver(callback, callback));
    NanReturnUndefined();
}

NAN_METHOD(sendCommand) {
    NanScope();
    NanUtf8String param1(args[0]->ToString());
    NanUtf8String param2(args[1]->ToString());
    dragon_send(*param1, param1.length(), *param2, param2.length());
    NanReturnUndefined();
}

NAN_METHOD(quit) {
    NanScope();
    dragon_quit();
    NanReturnUndefined();
}

NAN_METHOD(poke) {
    NanScope();
    dragon_poke();
    NanReturnUndefined();
}

void InitAll(Handle<Object> exports) {
  dragon_init();

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
