#include <iostream>
#include <nan.h>

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;

extern "C" {
    int dragon_receive(const char** ptr);
    void dragon_send(const char* ptr, int len);
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
    dragon_send(*param1, param1.length());
    NanReturnUndefined();
}

void InitAll(Handle<Object> exports) {
  dragon_init();

  exports->Set(NanNew<String>("onStateChange"),
    NanNew<FunctionTemplate>(onStateChange)->GetFunction());

  exports->Set(NanNew<String>("sendCommand"),
    NanNew<FunctionTemplate>(sendCommand)->GetFunction());
}

NODE_MODULE(NativeExtension, InitAll)
