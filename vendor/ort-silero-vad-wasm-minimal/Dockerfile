FROM ghcr.io/catthehacker/ubuntu:act-24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    cmake \
    ninja-build \
    python3 \
    build-essential \
    cppcheck \
    valgrind \
    clang \
    lldb \
    llvm \
    gdb \
    python3-pip \
    python3-flatbuffers \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch rel-1.26.0 https://github.com/microsoft/onnxruntime.git /onnxruntime

WORKDIR /onnxruntime

COPY silero_vad_v5.required_operators.config .

RUN ./build.sh \
    --config MinSizeRel \
    --build_wasm \
    --skip_tests \
    --disable_wasm_exception_catching \
    --enable_wasm_simd \
    --enable_wasm_threads \
    --include_ops_by_config silero_vad_v5.required_operators.config \
    --enable_reduced_operator_type_support \
    --target onnxruntime_webassembly \
    --parallel \
    --allow_running_as_root \
    --compile_no_warning_as_error \
    --minimal_build
