use renderer_lib::request::{Request, Response};
use renderer_lib::{event_loop, CommandSourceConfig, Config};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

/// Per-version worker count for tests. The integration tests spawn one
/// Docker container per worker, each pinned to one vCPU (see
/// `src/container.rs`), so the total container count across both
/// versions must not exceed the host's vCPU count or evils that peg a
/// container (e.g. `danger_forever.ly`) starve concurrent `good`
/// renders and trip the 8s Rust timeout. Split the vCPUs evenly
/// between stable and unstable, with a floor of 1 so the tests still
/// run on single-vCPU runners.
fn test_worker_count() -> u64 {
    let cpus = thread::available_parallelism().map(|n| n.get()).unwrap_or(2);
    (cpus / 2).max(1) as u64
}

#[macro_export]
macro_rules! cloned_hashmap(
    { $($key:expr => $value:expr),+ } => {
        {
            let mut m = ::std::collections::HashMap::new();
            $(
                m.insert($key.to_owned(), $value.clone());
            )+
            m
        }
     };
);

pub fn run_test(requests: Vec<Request>) -> HashMap<String, Response> {
    let output = Arc::new(Mutex::new(HashMap::new()));
    let worker_count = test_worker_count();
    let config = Config {
        stable_docker_tag: "hacklily-renderer".to_owned(),
        stable_worker_count: worker_count,
        unstable_docker_tag: "hacklily-renderer-unstable".to_owned(),
        unstable_worker_count: worker_count,
        render_timeout_msec: 8000,
        command_source: CommandSourceConfig::TestRunner {
            input: requests,
            output: output.clone(),
        },
    };
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(event_loop(config));

    let responses = output.lock().expect("Test runner panicked.");
    responses.clone()
}
